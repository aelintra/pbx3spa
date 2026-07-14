<script setup>
import { ref, onMounted } from 'vue'
import { getFleetCatalog } from '@/api/fleetGatekeeper'
import {
  isFleetGatekeeperEnabled,
  hasFleetGatekeeperToken,
  setFleetGatekeeperToken
} from '@/config/fleetGatekeeper'

const instances = ref([])
const loading = ref(true)
const error = ref('')
const tokenDraft = ref('')
const needsToken = ref(false)

async function load() {
  if (!isFleetGatekeeperEnabled()) {
    error.value = 'Set VITE_FLEET_GATEKEEPER_URL to load fleet instances.'
    loading.value = false
    return
  }
  if (!hasFleetGatekeeperToken()) {
    needsToken.value = true
    error.value = 'Enter the fleet gatekeeper API token for this browser session.'
    loading.value = false
    return
  }
  needsToken.value = false
  loading.value = true
  error.value = ''
  try {
    const catalog = await getFleetCatalog()
    instances.value = catalog.instances || []
  } catch (e) {
    error.value = e?.message || 'Failed to load fleet instances'
    if (/401|unauthorized|token/i.test(String(e?.message || ''))) {
      needsToken.value = true
    }
  } finally {
    loading.value = false
  }
}

function saveToken() {
  setFleetGatekeeperToken(tokenDraft.value)
  tokenDraft.value = ''
  load()
}

onMounted(load)
</script>

<template>
  <div class="fleet-instances-view">
    <h1>Fleet instances</h1>
    <p class="hint">Catalog instances from the gatekeeper (S3 directory). Gatekeeper API only.</p>

    <div v-if="needsToken" class="token-box">
      <p class="hint">
        Paste <code>GATEKEEPER_API_TOKEN</code> for this browser session only.
      </p>
      <form class="token-form" @submit.prevent="saveToken">
        <input
          v-model="tokenDraft"
          type="password"
          autocomplete="off"
          placeholder="Gatekeeper API token"
        />
        <button type="submit" class="primary">Save for session</button>
      </form>
    </div>

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
    <p v-else>No instances in catalog yet.</p>
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
.token-box {
  margin: 1rem 0;
  padding: 1rem;
  border: 1px solid var(--pbx-border);
  border-radius: 0.5rem;
  background: var(--pbx-surface-subtle, #f8fafc);
}
.token-form {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
}
.token-form input {
  flex: 1 1 12rem;
  padding: 0.4rem 0.6rem;
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
