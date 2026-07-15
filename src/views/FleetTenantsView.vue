<script setup>
import { ref, onMounted } from 'vue'
import { listFleetTenants, getFleetCatalog, refreshFleetSession } from '@/api/fleetGatekeeper'
import {
  hasFleetGatekeeperToken,
  canFleet,
  FLEET_ABILITY,
  getFleetAbilities
} from '@/config/fleetGatekeeper'
import FleetTokenGate from '@/components/FleetTokenGate.vue'

const tenants = ref([])
const instancesById = ref({})
const loading = ref(true)
const error = ref('')
const canMove = ref(false)

async function loadTenants() {
  if (!hasFleetGatekeeperToken()) {
    loading.value = false
    error.value = ''
    tenants.value = []
    canMove.value = false
    return
  }
  loading.value = true
  error.value = ''
  try {
    if (getFleetAbilities().length === 0) {
      await refreshFleetSession()
    }
    canMove.value = canFleet(FLEET_ABILITY.MOVES)
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

onMounted(loadTenants)
</script>

<template>
  <div class="fleet-tenants-view">
    <h1>Fleet tenants</h1>
    <p class="hint">
      Org catalog via gatekeeper. Move a tenant between instances without mixing tenant-node panels.
    </p>

    <FleetTokenGate @saved="loadTenants" @cleared="loadTenants" />

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
          <td>
            <RouterLink
              v-if="canMove"
              :to="{ name: 'fleet-tenant-move', query: { tenant: t.shortuid } }"
            >
              Move
            </RouterLink>
            <span v-else class="muted">—</span>
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
