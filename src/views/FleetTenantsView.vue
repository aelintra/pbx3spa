<script setup>
import { ref, onMounted } from 'vue'
import { listFleetTenants } from '@/api/fleetGatekeeper'
import { isFleetGatekeeperEnabled } from '@/config/fleetGatekeeper'
import { isFleetDirectoryEnabled } from '@/config/instanceDirectory'
import PanelBackLink from '@/components/PanelBackLink.vue'

const tenants = ref([])
const instancesById = ref({})
const loading = ref(true)
const error = ref('')

async function loadTenants() {
  if (!isFleetGatekeeperEnabled()) {
    error.value = 'Set VITE_FLEET_GATEKEEPER_URL to load fleet tenant list.'
    loading.value = false
    return
  }
  try {
    const { getFleetCatalog } = await import('@/api/fleetGatekeeper')
    const [tList, catalog] = await Promise.all([listFleetTenants(), getFleetCatalog()])
    const map = {}
    for (const i of catalog.instances || []) {
      map[i.id] = i
    }
    instancesById.value = map
    tenants.value = tList
  } catch (e) {
    error.value = e?.message || 'Failed to load fleet tenants'
  } finally {
    loading.value = false
  }
}

function instanceLabel(instanceId) {
  const i = instancesById.value[instanceId]
  return i?.label || i?.fqdn || instanceId
}

onMounted(loadTenants)
</script>

<template>
  <div class="fleet-tenants-view">
    <PanelBackLink :to="{ name: 'dashboard' }" label="Dashboard">
      <h1>Fleet tenants</h1>
    </PanelBackLink>

    <p v-if="!isFleetDirectoryEnabled()" class="hint">
      Instance directory mode is off — this view is for fleet operators with gatekeeper access.
    </p>

    <p v-if="loading">Loading…</p>
    <p v-else-if="error" class="error">{{ error }}</p>

    <table v-else-if="tenants.length" class="data-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Short UID</th>
          <th>FQDN</th>
          <th>Instance</th>
          <th>Status</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="t in tenants" :key="t.shortuid">
          <td>{{ t.name }}</td>
          <td><code>{{ t.shortuid }}</code></td>
          <td>{{ t.fqdn || '—' }}</td>
          <td>{{ instanceLabel(t.instance_id) }}</td>
          <td>{{ t.status }}</td>
          <td>
            <RouterLink
              :to="{ name: 'fleet-tenant-move', query: { tenant: t.shortuid } }"
            >
              Move
            </RouterLink>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-else>No tenants in catalog yet.</p>
  </div>
</template>

<style scoped>
.fleet-tenants-view {
  max-width: 56rem;
}
.hint {
  color: #64748b;
  font-size: 0.9rem;
}
.error {
  color: #b91c1c;
}
.data-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
}
.data-table th,
.data-table td {
  text-align: left;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid #e2e8f0;
}
</style>
