<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  listFleetTenants,
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
const canMove = ref(false)
const canEdge = ref(false)
const canCreate = ref(false)

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
    const [tList, catalog] = await Promise.all([listFleetTenants(), getFleetCatalog()])
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
        'Provision failed after node create — use resume payload or Register on SBC after catalog retry'
      if (resume?.shortuid) {
        createError.value += ` (node shortuid ${resume.shortuid}; resume with shortuid+fqdn)`
      }
      return
    }
    const su = result?.tenant?.shortuid || result?.node_tenant?.shortuid || ''
    if (result.partial && result.stages?.sbc === 'failed') {
      createOk.value = `Tenant ${su} created on node + catalog; SBC domain failed — use Register on SBC. MainOut seeded when globals dialplan is set.`
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
    actionError.value = e?.message || 'Register on SBC failed'
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
  } finally {
    busyId.value = ''
  }
}

onMounted(loadTenants)
</script>

<template>
  <div class="fleet-tenants-view">
    <h1>Fleet tenants</h1>
    <p class="hint">
      Create provisions home node + catalog + SBC domain. Delete is a durable job (confirm shortuid).
      Register on SBC repairs a missing domain. Move relocates a tenant between instances.
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
        <input v-model="createForm.description" type="text" required />
      </label>
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
          <th>Status</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="t in tenants" :key="t.shortuid">
          <td>{{ t.name }}</td>
          <td>{{ instanceLabel(t.instance_id) }}</td>
          <td>{{ t.fqdn || '—' }}</td>
          <td><code>{{ t.shortuid }}</code></td>
          <td>{{ t.status }}</td>
          <td class="actions">
            <button
              v-if="canEdge"
              type="button"
              class="linkish"
              :disabled="busyId === t.shortuid"
              @click="doRegisterDomain(t)"
            >
              Register on SBC
            </button>
            <RouterLink
              v-if="canMove"
              class="linkish"
              :to="{ name: 'fleet-tenant-move', query: { tenant: t.shortuid } }"
            >
              Move
            </RouterLink>
            <button
              v-if="canCreate"
              type="button"
              class="linkish danger"
              :disabled="busyId === t.shortuid"
              @click="doDelete(t)"
            >
              Delete
            </button>
            <span v-if="!canMove && !canEdge && !canCreate" class="muted">—</span>
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
  max-width: 56rem;
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
.actions {
  white-space: nowrap;
}
.actions .linkish {
  margin-right: 0.65rem;
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  color: var(--pbx-link, #2563eb);
  cursor: pointer;
  text-decoration: underline;
}
.actions a.linkish {
  display: inline;
}
.actions .linkish:disabled {
  opacity: 0.5;
  cursor: wait;
}
.actions .linkish.danger {
  color: var(--pbx-danger, #b91c1c);
}
.data-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
}
.data-table th,
.data-table td {
  text-align: left;
  padding: 0.5rem 0.65rem;
  border-bottom: 1px solid var(--pbx-border);
  font-size: 0.875rem;
}
</style>
