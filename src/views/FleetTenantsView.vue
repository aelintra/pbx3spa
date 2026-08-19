<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  listFleetTenants,
  listFleetDialCohorts,
  getFleetCatalog,
  refreshFleetSession,
  registerFleetTenantDomain,
  provisionFleetTenant,
  createTenantDelete
} from '@/api/fleetGatekeeper'
import {
  hasFleetGatekeeperToken,
  canFleet,
  FLEET_ABILITY,
  getFleetAbilities
} from '@/config/fleetGatekeeper'
import { validateTenantPkey } from '@/utils/validation'
import { buildProvisionBody } from '@/utils/fleetTenantProvision'

const router = useRouter()
const tenants = ref([])
const instancesById = ref({})
const instanceOptions = ref([])
const loading = ref(true)
const error = ref('')
const actionError = ref('')
const busyId = ref('')
/** Tenant shortuid while createTenantDelete runs (preflight → awaiting_confirm). */
const deleteBusyId = ref('')
const deleteBusyName = ref('')
const canMove = ref(false)
const canEdge = ref(false)
const canCreate = ref(false)
const cohortNameById = ref({})

const showCreate = ref(false)
const createBusy = ref(false)
const createError = ref('')
const createOk = ref('')
const createForm = ref({
  instance_id: '',
  pkey: '',
  description: '',
  clusterclid: '',
  localarea: ''
})

async function loadTenants() {
  if (!hasFleetGatekeeperToken()) {
    loading.value = false
    error.value = ''
    tenants.value = []
    canMove.value = false
    canEdge.value = false
    canCreate.value = false
    cohortNameById.value = {}
    return
  }
  loading.value = true
  error.value = ''
  actionError.value = ''
  try {
    if (getFleetAbilities().length === 0) {
      await refreshFleetSession()
    }
    canMove.value = canFleet(FLEET_ABILITY.MOVES)
    canEdge.value = canFleet(FLEET_ABILITY.EDGE)
    canCreate.value = canFleet(FLEET_ABILITY.INSTANCES)
    const [tList, catalog, cohortsIdx] = await Promise.all([
      listFleetTenants(),
      getFleetCatalog(),
      listFleetDialCohorts().catch(() => ({ cohorts: [] }))
    ])
    const cmap = {}
    for (const c of cohortsIdx?.cohorts || []) {
      if (c?.id) cmap[c.id] = c.name || c.id
    }
    cohortNameById.value = cmap
    const map = {}
    const opts = []
    for (const i of catalog.instances || []) {
      map[i.id] = i
      const status = String(i.status || '').toLowerCase()
      if (status === 'decommissioned') continue
      opts.push(i)
    }
    instancesById.value = map
    instanceOptions.value = opts
    tenants.value = tList
  } catch (e) {
    error.value = e?.message || 'Failed to load fleet tenants'
    canMove.value = false
    canEdge.value = false
    canCreate.value = false
  } finally {
    loading.value = false
  }
}

function siteGroupLabel(t) {
  const id = (t.dial_cohort_id || '').trim()
  if (!id) return '—'
  return cohortNameById.value[id] || id
}

function instanceLabel(instanceId) {
  const i = instancesById.value[instanceId]
  if (!i) return instanceId || '—'
  if (i.fqdn && i.label && i.fqdn !== i.label) {
    return `${i.label} (${i.fqdn})`
  }
  return i.label || i.fqdn || instanceId
}

function hostHasSetid(instanceId) {
  const i = instancesById.value[instanceId]
  return i != null && Number(i.sbc_dispatcher_setid) >= 1
}

function openCreate() {
  createError.value = ''
  createOk.value = ''
  const firstWithSetid = instanceOptions.value.find((i) => Number(i.sbc_dispatcher_setid) >= 1)
  createForm.value = {
    instance_id: firstWithSetid?.id || instanceOptions.value[0]?.id || '',
    pkey: '',
    description: '',
    clusterclid: '',
    localarea: ''
  }
  showCreate.value = true
}

function cancelCreate() {
  showCreate.value = false
  createError.value = ''
  createOk.value = ''
}

async function submitCreate() {
  createError.value = ''
  createOk.value = ''
  const f = createForm.value
  const pkeyErr = validateTenantPkey(f.pkey)
  if (pkeyErr) {
    createError.value = pkeyErr
    return
  }
  if (!(f.description || '').trim()) {
    createError.value = 'Description is required'
    return
  }
  if (!f.instance_id) {
    createError.value = 'Home instance is required'
    return
  }
  if (!hostHasSetid(f.instance_id)) {
    createError.value =
      'Home instance needs sbc_dispatcher_setid first (Instances → Provision edge or Link setid).'
    return
  }
  createBusy.value = true
  try {
    const shaped = buildProvisionBody(f)
    if (!shaped.ok) {
      createError.value = shaped.error
      createBusy.value = false
      return
    }
    const result = await provisionFleetTenant(shaped.body)
    if (!result?.ok) {
      const resume = result?.resume
      createError.value =
        result?.error ||
        'Provision failed after node create — use resume payload or Repair SBC domain after catalog retry'
      if (resume?.shortuid) {
        createError.value += ` (node shortuid ${resume.shortuid}; resume with shortuid+fqdn)`
      }
      return
    }
    const su = result?.tenant?.shortuid || result?.node_tenant?.shortuid || ''
    if (result.partial && result.stages?.sbc === 'failed') {
      createOk.value = `Tenant ${su} created on node + catalog; SBC domain failed — use Repair SBC domain. MainOut seeded when globals dialplan is set.`
    } else {
      createOk.value = `Tenant ${su} provisioned (node + catalog + SBC). MainOut seeded when globals dialplan is set.`
    }
    showCreate.value = false
    await loadTenants()
  } catch (e) {
    createError.value = e?.message || 'Provision failed'
  } finally {
    createBusy.value = false
  }
}

async function doRegisterDomain(t) {
  actionError.value = ''
  if (!hostHasSetid(t.instance_id)) {
    actionError.value =
      'Host instance needs sbc_dispatcher_setid first (Instances → Provision edge or Link setid).'
    return
  }
  busyId.value = t.shortuid
  try {
    await registerFleetTenantDomain(t.shortuid)
    await loadTenants()
  } catch (e) {
    actionError.value = e?.message || 'Repair SBC domain failed'
  } finally {
    busyId.value = ''
  }
}

async function doDelete(t) {
  actionError.value = ''
  const ok = window.confirm(
    `Start Fleet Delete for ${t.name || t.shortuid}?\n\n` +
      `You will confirm by typing shortuid ${t.shortuid} on the job page.\n` +
      'This removes the SBC domain, wipes the tenant on the node, and soft-decommissions catalog.'
  )
  if (!ok) return
  deleteBusyId.value = t.shortuid
  deleteBusyName.value = t.name || t.shortuid
  busyId.value = t.shortuid
  try {
    const job = await createTenantDelete({ tenant_shortuid: t.shortuid })
    await router.push({
      name: 'fleet-tenant-delete-job',
      params: { jobId: job.job_id },
      query: { tenant: job.tenant_shortuid || t.shortuid }
    })
  } catch (e) {
    actionError.value = e?.message || 'Failed to start delete job'
    deleteBusyId.value = ''
    deleteBusyName.value = ''
    busyId.value = ''
  }
}

const openMenuId = ref('')

function toggleMenu(id) {
  openMenuId.value = openMenuId.value === id ? '' : id
}

function closeRowMenu() {
  openMenuId.value = ''
}

function onDocClick(e) {
  const t = e.target
  if (!(t instanceof Element)) return
  if (t.closest('.actions-cell')) return
  closeRowMenu()
}

function goMove(t) {
  closeRowMenu()
  router.push({ name: 'fleet-tenant-move', query: { tenant: t.shortuid } })
}

onMounted(() => {
  loadTenants()
  document.addEventListener('click', onDocClick)
})
onUnmounted(() => {
  document.removeEventListener('click', onDocClick)
})
</script>

<template>
  <div class="fleet-tenants-view">
    <h1>Fleet tenants</h1>
    <p class="hint">
      Create provisions home node + catalog + SBC domain. Delete is a durable job (confirm shortuid).
      <strong>Repair SBC domain</strong> is only if create left catalog OK but the SBC domain row is missing
      (safe to re-run). Move relocates a tenant between instances.
    </p>

    <p v-if="canCreate" class="toolbar">
      <button
        type="button"
        class="primary"
        :disabled="loading || createBusy"
        @click="showCreate ? cancelCreate() : openCreate()"
      >
        {{ showCreate ? 'Cancel create' : 'Create tenant' }}
      </button>
    </p>

    <p v-if="createOk" class="ok">{{ createOk }}</p>
    <p v-if="actionError" class="error">{{ actionError }}</p>
    <p
      v-if="deleteBusyId"
      class="delete-status"
      role="status"
      aria-live="polite"
      :aria-busy="true"
    >
      <span class="spinner" aria-hidden="true" />
      <span>
        Starting delete for <strong>{{ deleteBusyName }}</strong>
        (<code>{{ deleteBusyId }}</code>) — running preflight…
      </span>
    </p>
    <p v-if="loading">Loading…</p>
    <p v-else-if="error" class="error">{{ error }}</p>

    <form v-if="showCreate" class="create-panel" @submit.prevent="submitCreate">
      <h2>Create tenant</h2>
      <p class="hint">
        Home instance must already have an SBC dispatcher setid. DID attach is a separate Fleet DIDs
        step.
      </p>
      <label>
        Home instance
        <select v-model="createForm.instance_id" required>
          <option disabled value="">Select instance…</option>
          <option v-for="i in instanceOptions" :key="i.id" :value="i.id">
            {{ i.label || i.fqdn || i.id }}
            {{ Number(i.sbc_dispatcher_setid) >= 1 ? `(setid ${i.sbc_dispatcher_setid})` : '(no setid)' }}
          </option>
        </select>
      </label>
      <label>
        Name (pkey)
        <input v-model="createForm.pkey" type="text" autocomplete="off" required />
      </label>
      <label>
        Description
        <input v-model="createForm.description" type="text" required placeholder="Notes (not the Name)" />
      </label>
      <p class="hint">Name (pkey) is how Fleet lists this tenant. Description is free-form notes only.</p>
      <label>
        Cluster CLID
        <input v-model="createForm.clusterclid" type="text" inputmode="numeric" placeholder="digits" />
      </label>
      <label>
        Local area
        <input v-model="createForm.localarea" type="text" inputmode="numeric" placeholder="digits" />
      </label>
      <p v-if="createError" class="error">{{ createError }}</p>
      <div class="create-actions">
        <button type="submit" class="primary" :disabled="createBusy">
          {{ createBusy ? 'Provisioning…' : 'Provision' }}
        </button>
        <button type="button" class="secondary" :disabled="createBusy" @click="cancelCreate">
          Cancel
        </button>
      </div>
    </form>

    <table v-if="!loading && !error && tenants.length" class="data-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Hosted on</th>
          <th>FQDN</th>
          <th>Short UID</th>
          <th>Routing prefix</th>
          <th>Site group</th>
          <th>Status</th>
          <th v-if="canMove || canEdge || canCreate">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="t in tenants" :key="t.shortuid">
          <td>{{ t.name }}</td>
          <td>{{ instanceLabel(t.instance_id) }}</td>
          <td class="cell-fqdn">{{ t.fqdn || '—' }}</td>
          <td><code>{{ t.shortuid }}</code></td>
          <td>{{ t.routing_prefix || '—' }}</td>
          <td class="cell-site-group">
            <RouterLink
              v-if="t.dial_cohort_id"
              class="linkish"
              :to="{ name: 'fleet-site-group-detail', params: { id: t.dial_cohort_id } }"
            >
              {{ siteGroupLabel(t) }}
            </RouterLink>
            <span v-else>—</span>
          </td>
          <td>{{ t.status }}</td>
          <td v-if="canMove || canEdge || canCreate" class="actions actions-cell">
            <div class="row-menu">
              <button
                type="button"
                class="row-menu-trigger"
                :aria-expanded="openMenuId === t.shortuid"
                :disabled="busyId === t.shortuid"
                @click.stop="toggleMenu(t.shortuid)"
              >
                Actions ▾
              </button>
              <div v-if="openMenuId === t.shortuid" class="row-menu-panel" role="menu">
                <button
                  v-if="canEdge"
                  type="button"
                  role="menuitem"
                  class="row-menu-item"
                  :disabled="busyId === t.shortuid"
                  @click="closeRowMenu(); doRegisterDomain(t)"
                >
                  Repair SBC domain
                </button>
                <button
                  v-if="canMove"
                  type="button"
                  role="menuitem"
                  class="row-menu-item"
                  @click="goMove(t)"
                >
                  Move
                </button>
                <button
                  v-if="canCreate"
                  type="button"
                  role="menuitem"
                  class="row-menu-item row-menu-item--danger"
                  :disabled="busyId === t.shortuid"
                  :aria-busy="deleteBusyId === t.shortuid"
                  @click="closeRowMenu(); doDelete(t)"
                >
                  <span
                    v-if="deleteBusyId === t.shortuid"
                    class="spinner spinner-inline"
                    aria-hidden="true"
                  />
                  {{ deleteBusyId === t.shortuid ? 'Starting delete…' : 'Delete' }}
                </button>
              </div>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-else-if="hasFleetGatekeeperToken() && !loading && !error && !tenants.length">
      No tenants in catalog yet.
    </p>
  </div>
</template>

<style scoped>
.fleet-tenants-view {
  max-width: 64rem;
  padding-bottom: 6rem;
}
.hint {
  color: var(--pbx-text-muted);
  font-size: 0.9rem;
}
.toolbar {
  margin: 0.75rem 0;
}
.primary {
  background: var(--pbx-accent, #2563eb);
  color: #fff;
  border: none;
  border-radius: 4px;
  padding: 0.4rem 0.85rem;
  font: inherit;
  cursor: pointer;
}
.secondary {
  background: transparent;
  color: var(--pbx-text, inherit);
  border: 1px solid var(--pbx-border, #94a3b8);
  border-radius: 4px;
  padding: 0.4rem 0.85rem;
  font: inherit;
  cursor: pointer;
}
.primary:disabled,
.secondary:disabled {
  opacity: 0.55;
  cursor: wait;
}
.delete-status {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin: 0.75rem 0;
  padding: 0.75rem 1rem;
  border-radius: 0.35rem;
  font-size: 0.9rem;
  background: #eff6ff;
  color: #1e3a8a;
  border: 1px solid #bfdbfe;
}
.spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid #93c5fd;
  border-top-color: #1e3a8a;
  border-radius: 50%;
  animation: fleet-tenant-spin 0.7s linear infinite;
  flex-shrink: 0;
}
.spinner-inline {
  width: 0.85rem;
  height: 0.85rem;
  display: inline-block;
  vertical-align: -0.1rem;
  margin-right: 0.25rem;
}
@keyframes fleet-tenant-spin {
  to {
    transform: rotate(360deg);
  }
}
.error {
  color: var(--pbx-danger, #b91c1c);
}
.ok {
  color: var(--pbx-success, #15803d);
}
.muted {
  color: var(--pbx-text-muted);
}
.create-panel {
  margin: 1rem 0;
  padding: 1rem;
  border: 1px solid var(--pbx-border);
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  max-width: 28rem;
}
.create-panel h2 {
  margin: 0;
  font-size: 1.1rem;
}
.create-panel label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.875rem;
}
/* Match text fields: native <select> otherwise grows tall (esp. macOS Safari/Chrome). */
.create-panel input,
.create-panel select {
  display: block;
  width: 100%;
  box-sizing: border-box;
  margin: 0;
  min-height: 2.25rem;
  padding: 0.35rem 0.5rem;
  font: inherit;
  font-size: 0.95rem;
  line-height: 1.35;
  color: var(--pbx-text, inherit);
  background-color: var(--pbx-panel, #fff);
  border: 1px solid var(--pbx-border, #e2e8f0);
  border-radius: 4px;
}
.create-panel select {
  /* Keep one-line height (avoid multi-line expand look next to inputs) */
  height: 2.25rem;
  appearance: auto;
}
.create-panel input:focus,
.create-panel select:focus {
  outline: none;
  border-color: var(--pbx-accent-bright, #3b82f6);
  box-shadow: 0 0 0 3px var(--pbx-focus-ring, rgba(59, 130, 246, 0.1));
}
.create-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.25rem;
}
.linkish {
  color: var(--pbx-link, #2563eb);
  text-decoration: underline;
}
.cell-fqdn {
  max-width: 11rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cell-site-group {
  min-width: 7rem;
  white-space: nowrap;
}
.actions {
  white-space: nowrap;
  width: 1%;
}
.actions-cell {
  position: relative;
}
.row-menu {
  position: relative;
  display: inline-block;
}
.row-menu-trigger {
  border: 1px solid var(--pbx-border, #cbd5e1);
  border-radius: 0.3rem;
  background: var(--pbx-surface, #fff);
  padding: 0.2rem 0.5rem;
  font: inherit;
  font-size: 0.8rem;
  color: var(--pbx-text, inherit);
  cursor: pointer;
}
.row-menu-trigger:disabled {
  opacity: 0.5;
  cursor: default;
}
.row-menu-panel {
  position: absolute;
  z-index: 20;
  top: auto;
  bottom: calc(100% + 0.25rem);
  right: 0;
  min-width: 9.5rem;
  padding: 0.25rem 0;
  border: 1px solid var(--pbx-border, #cbd5e1);
  border-radius: 0.35rem;
  background: var(--pbx-surface, #fff);
  box-shadow: 0 4px 14px rgb(15 23 42 / 0.1);
}
.row-menu-item {
  display: block;
  width: 100%;
  border: none;
  background: none;
  padding: 0.35rem 0.75rem;
  text-align: left;
  font: inherit;
  font-size: 0.85rem;
  color: var(--pbx-accent, #1d4ed8);
  cursor: pointer;
}
.row-menu-item:hover:not(:disabled) {
  background: var(--pbx-surface-subtle, #f8fafc);
}
.row-menu-item:disabled {
  opacity: 0.45;
  cursor: default;
}
.row-menu-item--danger {
  color: var(--pbx-danger, #b91c1c);
}
.data-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
  table-layout: auto;
}
.data-table th,
.data-table td {
  text-align: left;
  padding: 0.5rem 0.65rem;
  border-bottom: 1px solid var(--pbx-border);
  font-size: 0.875rem;
}
</style>
