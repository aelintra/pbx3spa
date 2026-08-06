<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getFleetDialCohort,
  listFleetTenants,
  getFleetCatalog,
  addFleetDialCohortMember,
  removeFleetDialCohortMember,
  syncFleetDialCohort,
  decommissionFleetDialCohort,
  patchFleetDialCohort,
  refreshFleetSession
} from '@/api/fleetGatekeeper'
import {
  hasFleetGatekeeperToken,
  canFleet,
  FLEET_ABILITY,
  getFleetAbilities
} from '@/config/fleetGatekeeper'

const route = useRoute()
const router = useRouter()
const cohortId = computed(() => String(route.params.id || ''))

const cohort = ref(null)
const tenantsByShortuid = ref({})
const instancesById = ref({})
const allTenants = ref([])
const loading = ref(true)
const error = ref('')
const actionError = ref('')
const actionOk = ref('')
const busy = ref(false)
const canManage = ref(false)

const showAdd = ref(false)
const addForm = ref({ tenant_shortuid: '', routing_prefix: '' })
const editName = ref('')

const members = computed(() => {
  const ids = cohort.value?.members || []
  return ids.map((suid) => {
    const t = tenantsByShortuid.value[suid] || {}
    const inst = instancesById.value[t.instance_id] || {}
    return {
      shortuid: suid,
      name: t.name || t.pkey || suid,
      home: inst.label || inst.fqdn || t.instance_id || '—',
      routing_prefix: t.routing_prefix || '—',
      fqdn: t.fqdn || ''
    }
  })
})

const availableTenants = computed(() => {
  const inCohort = new Set(cohort.value?.members || [])
  return allTenants.value.filter((t) => {
    if (inCohort.has(t.shortuid)) return false
    const other = (t.dial_cohort_id || '').trim()
    if (other && other !== cohortId.value) return false
    return String(t.status || '').toLowerCase() !== 'decommissioned'
  })
})

async function load() {
  if (!hasFleetGatekeeperToken()) {
    loading.value = false
    error.value = 'Fleet session required'
    return
  }
  loading.value = true
  error.value = ''
  actionError.value = ''
  try {
    if (getFleetAbilities().length === 0) {
      await refreshFleetSession()
    }
    canManage.value = canFleet(FLEET_ABILITY.DIAL_COHORTS)
    const [doc, tenants, catalog] = await Promise.all([
      getFleetDialCohort(cohortId.value),
      listFleetTenants(),
      getFleetCatalog()
    ])
    cohort.value = doc
    editName.value = doc?.name || ''
    allTenants.value = tenants
    const map = {}
    for (const t of tenants) {
      map[t.shortuid] = t
    }
    tenantsByShortuid.value = map
    const imap = {}
    for (const i of catalog?.instances || []) {
      imap[i.id] = i
    }
    instancesById.value = imap
  } catch (e) {
    error.value = e?.message || 'Failed to load site group'
    cohort.value = null
  } finally {
    loading.value = false
  }
}

async function saveName() {
  actionError.value = ''
  actionOk.value = ''
  const name = (editName.value || '').trim()
  if (!name) {
    actionError.value = 'Name required'
    return
  }
  busy.value = true
  try {
    cohort.value = await patchFleetDialCohort(cohortId.value, { name })
    actionOk.value = 'Name saved'
  } catch (e) {
    actionError.value = e?.message || 'Rename failed'
  } finally {
    busy.value = false
  }
}

async function doSync() {
  actionError.value = ''
  actionOk.value = ''
  busy.value = true
  try {
    const job = await syncFleetDialCohort(cohortId.value, {
      reason: 'spa_sync',
      prune_unmanaged: false
    })
    actionOk.value =
      job?.state === 'completed'
        ? `Sync completed (${Object.keys(job.phases || {}).length} phases)`
        : `Sync state: ${job?.state || '?'}`
    if (job?.error) actionError.value = job.error
    await load()
  } catch (e) {
    actionError.value = e?.message || 'Sync failed'
  } finally {
    busy.value = false
  }
}

async function submitAdd() {
  actionError.value = ''
  actionOk.value = ''
  const suid = (addForm.value.tenant_shortuid || '').trim()
  const prefix = (addForm.value.routing_prefix || '').trim()
  if (!suid || !prefix) {
    actionError.value = 'Tenant and routing prefix required'
    return
  }
  busy.value = true
  try {
    const out = await addFleetDialCohortMember(cohortId.value, {
      tenant_shortuid: suid,
      routing_prefix: prefix,
      materialise: true,
      prune_unmanaged: false
    })
    const jobState = out?.job?.state
    actionOk.value =
      jobState === 'completed'
        ? `Added ${suid}; mesh sync completed`
        : `Added ${suid}` + (jobState ? ` (job ${jobState})` : '')
    if (out?.job?.error) actionError.value = out.job.error
    showAdd.value = false
    addForm.value = { tenant_shortuid: '', routing_prefix: '' }
    await load()
  } catch (e) {
    actionError.value = e?.message || 'Add member failed'
  } finally {
    busy.value = false
  }
}

async function doRemove(suid) {
  actionError.value = ''
  actionOk.value = ''
  if (!window.confirm(`Remove ${suid} from this site group?`)) return
  busy.value = true
  try {
    const out = await removeFleetDialCohortMember(cohortId.value, suid)
    actionOk.value = `Removed ${suid}`
    if (out?.job?.error) actionError.value = out.job.error
    await load()
  } catch (e) {
    actionError.value = e?.message || 'Remove failed'
  } finally {
    busy.value = false
  }
}

async function doDecommission() {
  actionError.value = ''
  if (
    !window.confirm(
      'Decommission this site group? Members become isolates; managed dial prefixes are pruned.'
    )
  ) {
    return
  }
  busy.value = true
  try {
    await decommissionFleetDialCohort(cohortId.value, { confirm: true, materialise: true })
    await router.push({ name: 'fleet-site-groups' })
  } catch (e) {
    actionError.value = e?.message || 'Decommission failed'
  } finally {
    busy.value = false
  }
}

watch(cohortId, load)
onMounted(load)
</script>

<template>
  <div class="fleet-site-group-detail">
    <p class="back">
      <RouterLink :to="{ name: 'fleet-site-groups' }">← Site Groups</RouterLink>
    </p>

    <p v-if="loading">Loading…</p>
    <p v-else-if="error" class="error">{{ error }}</p>

    <template v-else-if="cohort">
      <h1>{{ cohort.name }}</h1>
      <p class="hint">
        Prefix width {{ cohort.prefix_width }} · status {{ cohort.status }} ·
        <code>{{ cohort.id }}</code>
      </p>

      <p v-if="actionOk" class="ok">{{ actionOk }}</p>
      <p v-if="actionError" class="error">{{ actionError }}</p>

      <section v-if="canManage && cohort.status === 'active'" class="panel">
        <h2>Name</h2>
        <div class="row">
          <input v-model="editName" type="text" />
          <button type="button" class="secondary" :disabled="busy" @click="saveName">Save</button>
        </div>
      </section>

      <section class="panel">
        <div class="panel-head">
          <h2>Members ({{ members.length }})</h2>
          <div v-if="canManage && cohort.status === 'active'" class="actions">
            <button type="button" class="secondary" :disabled="busy" @click="doSync">
              Sync now
            </button>
            <button
              type="button"
              class="primary"
              :disabled="busy"
              @click="showAdd = !showAdd"
            >
              {{ showAdd ? 'Cancel add' : 'Add tenant' }}
            </button>
          </div>
        </div>

        <form v-if="showAdd" class="add-form" @submit.prevent="submitAdd">
          <label>
            Tenant
            <select v-model="addForm.tenant_shortuid" required>
              <option disabled value="">Select…</option>
              <option v-for="t in availableTenants" :key="t.shortuid" :value="t.shortuid">
                {{ t.name }} ({{ t.shortuid }})
              </option>
            </select>
          </label>
          <label>
            Routing prefix
            <input
              v-model="addForm.routing_prefix"
              type="text"
              inputmode="numeric"
              :placeholder="`${cohort.prefix_width} digits`"
              required
            />
          </label>
          <button type="submit" class="primary" :disabled="busy">Add &amp; sync</button>
        </form>

        <table v-if="members.length" class="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Shortuid</th>
              <th>Routing prefix</th>
              <th>FQDN</th>
              <th v-if="canManage"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in members" :key="m.shortuid">
              <td>{{ m.name }}</td>
              <td><code>{{ m.shortuid }}</code></td>
              <td>{{ m.routing_prefix }}</td>
              <td>{{ m.fqdn || '—' }}</td>
              <td v-if="canManage && cohort.status === 'active'">
                <button
                  type="button"
                  class="linkish danger"
                  :disabled="busy"
                  @click="doRemove(m.shortuid)"
                >
                  Remove
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-else class="muted">No members yet.</p>
      </section>

      <section v-if="canManage && cohort.status === 'active'" class="panel danger-zone">
        <h2>Decommission</h2>
        <p class="hint">Soft-decommissions the group and prunes managed dial prefixes on members.</p>
        <button type="button" class="danger" :disabled="busy" @click="doDecommission">
          Decommission site group
        </button>
      </section>
    </template>
  </div>
</template>

<style scoped>
.fleet-site-group-detail {
  max-width: 56rem;
}
.back {
  margin-bottom: 0.75rem;
}
.hint,
.muted {
  color: var(--pbx-text-muted);
}
.error {
  color: var(--pbx-danger, #b00020);
}
.ok {
  color: var(--pbx-success, #0a7a3e);
}
.panel {
  margin: 1.25rem 0;
  padding-top: 0.5rem;
}
.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}
.panel-head .actions {
  display: flex;
  gap: 0.5rem;
}
.row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  max-width: 28rem;
}
.row input,
.add-form input,
.add-form select {
  display: block;
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
.row input {
  flex: 1;
  min-width: 0;
}
.add-form select {
  height: 2.25rem;
  min-width: 14rem;
  appearance: auto;
}
.row input:focus,
.add-form input:focus,
.add-form select:focus {
  outline: none;
  border-color: var(--pbx-accent-bright, #3b82f6);
  box-shadow: 0 0 0 3px var(--pbx-focus-ring, rgba(59, 130, 246, 0.1));
}
.add-form {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: flex-end;
  margin: 0.75rem 0 1rem;
}
.add-form label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.875rem;
}
.data-table {
  width: 100%;
  border-collapse: collapse;
}
.data-table th,
.data-table td {
  text-align: left;
  padding: 0.45rem 0.55rem;
  border-bottom: 1px solid var(--pbx-border, #eee);
}
.linkish {
  background: none;
  border: none;
  color: inherit;
  text-decoration: underline;
  cursor: pointer;
  padding: 0;
}
.linkish.danger,
button.danger {
  color: var(--pbx-danger, #b00020);
}
button.primary {
  background: var(--pbx-accent, #2563eb);
  color: #fff;
  border: none;
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
  cursor: pointer;
}
button.secondary {
  background: transparent;
  border: 1px solid var(--pbx-border, #ccc);
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
  cursor: pointer;
}
button.danger {
  background: transparent;
  border: 1px solid var(--pbx-danger, #b00020);
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
  cursor: pointer;
}
.danger-zone {
  border-top: 1px solid var(--pbx-border, #eee);
  padding-top: 1rem;
}
</style>
