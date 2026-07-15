<script setup>
import { ref, onMounted } from 'vue'
import {
  listFleetTenants,
  getFleetCatalog,
  refreshFleetSession,
  registerFleetTenantDomain
} from '@/api/fleetGatekeeper'
import {
  hasFleetGatekeeperToken,
  canFleet,
  FLEET_ABILITY,
  getFleetAbilities
} from '@/config/fleetGatekeeper'

const tenants = ref([])
const instancesById = ref({})
const loading = ref(true)
const error = ref('')
const actionError = ref('')
const busyId = ref('')
const canMove = ref(false)
const canEdge = ref(false)

async function loadTenants() {
  if (!hasFleetGatekeeperToken()) {
    loading.value = false
    error.value = ''
    tenants.value = []
    canMove.value = false
    canEdge.value = false
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
    const [tList, catalog] = await Promise.all([listFleetTenants(), getFleetCatalog()])
    const map = {}
    for (const i of catalog.instances || []) {
      map[i.id] = i
    }
    instancesById.value = map
    tenants.value = tList
  } catch (e) {
    error.value = e?.message || 'Failed to load fleet tenants'
    canMove.value = false
    canEdge.value = false
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
    actionError.value = e?.message || 'Register domain failed'
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
      Org catalog via gatekeeper. Register on SBC projects the tenant FQDN → host setid (phones).
      Move a tenant between instances without mixing tenant-node panels.
    </p>

    <p v-if="actionError" class="error">{{ actionError }}</p>
    <p v-if="loading">Loading…</p>
    <p v-else-if="error" class="error">{{ error }}</p>

    <table v-else-if="tenants.length" class="data-table">
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
              :to="{ name: 'fleet-tenant-move', query: { tenant: t.shortuid } }"
            >
              Move
            </RouterLink>
            <span v-if="!canMove && !canEdge" class="muted">—</span>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-else-if="hasFleetGatekeeperToken()">No tenants in catalog yet.</p>
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
.error {
  color: var(--pbx-danger, #b91c1c);
}
.muted {
  color: var(--pbx-text-muted);
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
.actions .linkish:disabled {
  opacity: 0.5;
  cursor: wait;
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
