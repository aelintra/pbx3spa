<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useToastStore } from '@/stores/toast'

const router = useRouter()
const toast = useToastStore()
const cluster = ref('')
const carrier = ref('')
const pkey = ref('')
const trunkname = ref('')
const openroute = ref('None')
const closeroute = ref('None')
const tenants = ref([])
const destinations = ref(null)
const destinationsLoading = ref(false)
const error = ref('')
const loading = ref(false)

function normalizeList(response) {
  if (Array.isArray(response)) return response
  if (response && typeof response === 'object') {
    if (Array.isArray(response.data)) return response.data
    if (Array.isArray(response.tenants)) return response.tenants
    if (Object.keys(response).every((k) => /^\d+$/.test(k))) return Object.values(response)
  }
  return []
}

const tenantOptions = computed(() => {
  const list = tenants.value.map((t) => t.pkey).filter(Boolean)
  return [...new Set(list)].sort((a, b) => String(a).localeCompare(String(b)))
})

const tenantOptionsForSelect = computed(() => {
  const list = tenantOptions.value
  const cur = cluster.value
  if (cur && !list.includes(cur)) return [cur, ...list].sort((a, b) => String(a).localeCompare(String(b)))
  return list
})

const showStep2 = computed(() => !!cluster.value && !!carrier.value)

const destinationGroups = computed(() => {
  const d = destinations.value
  if (!d || typeof d !== 'object') return {}
  return {
    Queues: Array.isArray(d.Queues) ? d.Queues : [],
    Extensions: Array.isArray(d.Extensions) ? d.Extensions : [],
    IVRs: Array.isArray(d.IVRs) ? d.IVRs : [],
    CustomApps: Array.isArray(d.CustomApps) ? d.CustomApps : [],
  }
})

const canSubmit = computed(() => {
  if (!cluster.value || !carrier.value || !pkey.value.trim()) return false
  return true
})

function fieldErrors(err) {
  if (!err?.data || typeof err.data !== 'object') return null
  const entries = Object.entries(err.data).filter(([, v]) => Array.isArray(v) && v.length)
  return entries.length ? Object.fromEntries(entries) : null
}

async function loadTenants() {
  try {
    const response = await getApiClient().get('tenants')
    tenants.value = normalizeList(response)
    if (tenants.value.length && !cluster.value) {
      const first = tenants.value.find((t) => t.pkey)?.pkey
      if (first) cluster.value = first
    }
  } catch {
    tenants.value = []
  }
}

async function loadDestinations() {
  const c = cluster.value
  if (!c) {
    destinations.value = null
    return
  }
  destinationsLoading.value = true
  try {
    const response = await getApiClient().get('destinations', { params: { cluster: c } })
    destinations.value = response && typeof response === 'object' ? response : null
  } catch {
    destinations.value = null
  } finally {
    destinationsLoading.value = false
  }
}

watch(cluster, () => {
  loadDestinations()
  if (!cluster.value) {
    openroute.value = 'None'
    closeroute.value = 'None'
  }
})

onMounted(() => {
  loadTenants()
})

async function onSubmit(e) {
  e.preventDefault()
  if (!canSubmit.value) return
  error.value = ''
  loading.value = true
  try {
    const body = {
      pkey: pkey.value.trim(),
      cluster: cluster.value.trim(),
      carrier: carrier.value,
      trunkname: trunkname.value.trim() || undefined,
    }
    if (showStep2.value && openroute.value && openroute.value !== 'None') body.openroute = openroute.value
    if (showStep2.value && closeroute.value && closeroute.value !== 'None') body.closeroute = closeroute.value
    const inboundRoute = await getApiClient().post('inboundroutes', body)
    toast.show(`Inbound route ${inboundRoute.pkey} created`)
    router.push({ name: 'inbound-route-detail', params: { pkey: inboundRoute.pkey } })
  } catch (err) {
    const errors = fieldErrors(err)
    if (errors) {
      const first = Object.values(errors).flat()[0]
      error.value = first || err.message
    } else {
      error.value = err.data?.save?.[0] ?? err.data?.message ?? err.data?.Error ?? err.message ?? 'Failed to create inbound route'
    }
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.push({ name: 'inbound-routes' })
}
</script>

<template>
  <div class="create-view">
    <p class="back">
      <button type="button" class="back-btn" @click="goBack">← Inbound routes</button>
    </p>
    <h1>Create inbound route</h1>

    <form class="form" @submit="onSubmit">
      <div class="form-row">
        <label for="cluster">Tenant</label>
        <select
          id="cluster"
          v-model="cluster"
          class="form-input"
          required
          aria-label="Tenant"
        >
          <option value="">Choose tenant</option>
          <option v-for="opt in tenantOptionsForSelect" :key="opt" :value="opt">{{ opt }}</option>
        </select>
      </div>

      <div class="form-row">
        <label for="carrier">DDI type</label>
        <select
          id="carrier"
          v-model="carrier"
          class="form-input"
          required
          aria-label="DDI type"
        >
          <option value="">Choose type</option>
          <option value="DiD">DiD</option>
          <option value="CLID">CLID</option>
        </select>
      </div>

      <template v-if="showStep2">
        <div class="form-row">
          <label for="pkey">Number (DiD/CLiD)</label>
          <input
            id="pkey"
            v-model="pkey"
            type="text"
            class="form-input"
            placeholder="e.g. 0123456789"
            required
            autocomplete="off"
          />
        </div>

        <div class="form-row">
          <label for="trunkname">Name</label>
          <input
            id="trunkname"
            v-model="trunkname"
            type="text"
            class="form-input"
            placeholder="Optional; defaults to number"
            autocomplete="off"
          />
        </div>

        <div class="form-row">
          <label for="openroute">Open route</label>
          <select
            id="openroute"
            v-model="openroute"
            class="form-input"
            aria-label="Open route destination"
          >
            <option value="None">None</option>
            <template v-for="(pkeys, group) in destinationGroups" :key="group">
              <optgroup v-if="pkeys.length" :label="group">
                <option v-for="p in pkeys" :key="p" :value="p">{{ p }}</option>
              </optgroup>
            </template>
          </select>
          <span v-if="destinationsLoading" class="hint">Loading…</span>
        </div>

        <div class="form-row">
          <label for="closeroute">Closed route</label>
          <select
            id="closeroute"
            v-model="closeroute"
            class="form-input"
            aria-label="Closed route destination"
          >
            <option value="None">None</option>
            <template v-for="(pkeys, group) in destinationGroups" :key="group">
              <optgroup v-if="pkeys.length" :label="group">
                <option v-for="p in pkeys" :key="p" :value="p">{{ p }}</option>
              </optgroup>
            </template>
          </select>
        </div>
      </template>

      <p v-if="error" class="error">{{ error }}</p>

      <div class="actions">
        <button type="submit" :disabled="loading || !canSubmit">
          {{ loading ? 'Creating…' : 'Create' }}
        </button>
        <button type="button" class="secondary" @click="goBack">Cancel</button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.back {
  margin-bottom: 1rem;
}
.back-btn {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
  color: #64748b;
  background: transparent;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  cursor: pointer;
}
.back-btn:hover {
  color: #0f172a;
  background: #f1f5f9;
}
.form {
  margin-top: 1rem;
  max-width: 24rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.form-row {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.form-row label {
  font-size: 0.875rem;
  font-weight: 500;
}
.form-input {
  padding: 0.5rem 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  font-size: 1rem;
}
.form-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}
.hint {
  font-size: 0.8125rem;
  color: #64748b;
}
.error {
  color: #dc2626;
  font-size: 0.875rem;
  margin: 0;
}
.actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.25rem;
}
.actions button {
  padding: 0.5rem 1rem;
  font-size: 0.9375rem;
  font-weight: 500;
  border-radius: 0.375rem;
  cursor: pointer;
}
.actions button[type="submit"] {
  color: #fff;
  background: #2563eb;
  border: none;
}
.actions button[type="submit"]:hover:not(:disabled) {
  background: #1d4ed8;
}
.actions button[type="submit"]:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
.actions button.secondary {
  color: #64748b;
  background: transparent;
  border: 1px solid #e2e8f0;
}
.actions button.secondary:hover {
  background: #f1f5f9;
}
</style>
