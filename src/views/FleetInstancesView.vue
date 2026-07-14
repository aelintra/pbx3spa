<script setup>
import { ref, onMounted } from 'vue'
import { getFleetCatalog } from '@/api/fleetGatekeeper'
import { hasFleetGatekeeperToken } from '@/config/fleetGatekeeper'
import FleetTokenGate from '@/components/FleetTokenGate.vue'

const instances = ref([])
const loading = ref(true)
const error = ref('')

async function load() {
  if (!hasFleetGatekeeperToken()) {
    loading.value = false
    error.value = ''
    instances.value = []
    return
  }
  loading.value = true
  error.value = ''
  try {
    const catalog = await getFleetCatalog()
    instances.value = catalog.instances || []
  } catch (e) {
    error.value = e?.message || 'Failed to load fleet instances'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="fleet-instances-view">
    <h1>Fleet instances</h1>
    <p class="hint">Catalog instances from the gatekeeper (S3 directory). Gatekeeper API only.</p>

    <FleetTokenGate @saved="load" @cleared="load" />

    <p v-if="loading">Loading…</p>
    <p v-else-if="error" class="error">{{ error }}</p>

    <table v-else-if="instances.length" class="data-table">
      <thead>
        <tr>
          <th>Label</th>
          <th>FQDN</th>
          <th>Environment</th>
          <th>ID</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="i in instances" :key="i.id">
          <td>{{ i.label || i.fqdn || i.id }}</td>
          <td>{{ i.fqdn || '—' }}</td>
          <td>{{ i.environment || '—' }}</td>
          <td><code>{{ i.id }}</code></td>
        </tr>
      </tbody>
    </table>
    <p v-else-if="hasFleetGatekeeperToken()">No instances in catalog yet.</p>
  </div>
</template>

<style scoped>
.fleet-instances-view {
  max-width: 56rem;
}
.hint {
  color: var(--pbx-text-muted);
  font-size: 0.9rem;
}
.error {
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
