<script setup>
import { ref, onMounted } from 'vue'
import { getFleetGatekeeperUrl, isFleetGatekeeperEnabled } from '@/config/fleetGatekeeper'
import { isFleetDirectoryEnabled } from '@/config/instanceDirectory'
import PanelBackLink from '@/components/PanelBackLink.vue'

const tenants = ref([])
const loading = ref(true)
const error = ref('')

async function loadTenants() {
  if (!isFleetGatekeeperEnabled()) {
    error.value = 'Set VITE_FLEET_GATEKEEPER_URL to load fleet tenant list.'
    loading.value = false
    return
  }
  const token = import.meta.env.VITE_FLEET_GATEKEEPER_TOKEN || ''
  try {
    const res = await fetch(`${getFleetGatekeeperUrl()}/api/v1/tenants`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
    if (!res.ok) {
      throw new Error(`Gatekeeper ${res.status}`)
    }
    const data = await res.json()
    tenants.value = data.tenants || []
  } catch (e) {
    error.value = e?.message || 'Failed to load fleet tenants'
  } finally {
    loading.value = false
  }
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
          <th>Short UID</th>
          <th>FQDN</th>
          <th>Instance</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="t in tenants" :key="t.shortuid">
          <td>{{ t.shortuid }}</td>
          <td>{{ t.fqdn || '—' }}</td>
          <td><code>{{ t.instance_id }}</code></td>
          <td>{{ t.status }}</td>
        </tr>
      </tbody>
    </table>
    <p v-else>No tenants in catalog yet.</p>

    <p class="hint">Move wizard (Phase C) will enable actions from this list.</p>
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
