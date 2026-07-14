<script setup>
import { ref, onMounted } from 'vue'
import { listFleetTenants, getFleetCatalog } from '@/api/fleetGatekeeper'
import {
  isFleetGatekeeperEnabled,
  hasFleetGatekeeperToken,
  setFleetGatekeeperToken
} from '@/config/fleetGatekeeper'

const tenants = ref([])
const instancesById = ref({})
const loading = ref(true)
const error = ref('')
const tokenDraft = ref('')
const needsToken = ref(false)

async function loadTenants() {
  if (!isFleetGatekeeperEnabled()) {
    error.value = 'Set VITE_FLEET_GATEKEEPER_URL to load fleet tenant list.'
    loading.value = false
    needsToken.value = false
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
    const [tList, catalog] = await Promise.all([listFleetTenants(), getFleetCatalog()])
    const map = {}
    for (const i of catalog.instances || []) {
      map[i.id] = i
    }
    instancesById.value = map
    tenants.value = tList
  } catch (e) {
    error.value = e?.message || 'Failed to load fleet tenants'
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
  loadTenants()
}

function instanceLabel(instanceId) {
  const i = instancesById.value[instanceId]
  if (!i) return instanceId || '—'
  const name = i.label || i.fqdn || instanceId
  // Prefer short host name; append fqdn only when it adds info
  if (i.fqdn && i.label && i.fqdn !== i.label) {
    return `${i.label} (${i.fqdn})`
  }
  return name
}

onMounted(loadTenants)
</script>

<template>
  <div class="fleet-tenants-view">
    <h1>Fleet tenants</h1>
    <p class="hint">
      Org catalog via gatekeeper. Move a tenant between instances without mixing tenant-node panels.
    </p>

    <div v-if="needsToken" class="token-box">
      <p class="hint">
        Gatekeeper token is not stored in production builds. Paste
        <code>GATEKEEPER_API_TOKEN</code> for this browser session only.
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
    <p v-else-if="hasFleetGatekeeperToken()" class="hint token-clear">
      Session has a fleet token (clear from the top bar if needed).
    </p>

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
.token-box {
  margin: 0.75rem 0 1rem;
  max-width: 28rem;
}
.token-form {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}
.token-form input {
  flex: 1;
  padding: 0.4rem 0.5rem;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
}
.token-form .primary {
  padding: 0.4rem 0.75rem;
  border: none;
  border-radius: 4px;
  background: #0f766e;
  color: #fff;
  cursor: pointer;
}
.token-clear .linkish {
  background: none;
  border: none;
  padding: 0;
  color: #64748b;
  text-decoration: underline;
  cursor: pointer;
  font-size: inherit;
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
