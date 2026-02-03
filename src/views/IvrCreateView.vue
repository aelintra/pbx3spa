<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useToastStore } from '@/stores/toast'

const router = useRouter()
const toast = useToastStore()
const pkey = ref('')
const cluster = ref('default')
const description = ref('')
const tenants = ref([])
const tenantsLoading = ref(true)
const error = ref('')
const loading = ref(false)
const pkeyInput = ref(null)

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

async function loadTenants() {
  tenantsLoading.value = true
  try {
    const response = await getApiClient().get('tenants')
    tenants.value = normalizeList(response)
    if (tenants.value.length && !cluster.value) {
      const first = tenants.value.find((t) => t.pkey === 'default')?.pkey ?? tenants.value[0]?.pkey
      if (first) cluster.value = first
    }
  } catch {
    tenants.value = []
  } finally {
    tenantsLoading.value = false
  }
}

function fieldErrors(err) {
  if (!err?.data || typeof err.data !== 'object') return null
  const entries = Object.entries(err.data).filter(([, v]) => Array.isArray(v) && v.length)
  return entries.length ? Object.fromEntries(entries) : null
}

async function onSubmit(e) {
  e.preventDefault()
  error.value = ''
  loading.value = true
  try {
    const body = {
      pkey: pkey.value.trim(),
      cluster: cluster.value.trim()
    }
    if (description.value.trim()) body.description = description.value.trim()
    const ivr = await getApiClient().post('ivrs', body)
    const createdPkey = ivr?.pkey ?? ivr?.data?.pkey
    toast.show(createdPkey ? `IVR ${createdPkey} created` : 'IVR created')
    router.push({ name: 'ivr-detail', params: { pkey: createdPkey || pkey.value.trim() } })
  } catch (err) {
    const errors = fieldErrors(err)
    if (errors) {
      const first = Object.values(errors).flat()[0]
      error.value = first || err.message
    } else {
      error.value = err.data?.message ?? err.message ?? 'Failed to create IVR'
    }
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.push({ name: 'ivrs' })
}

function onKeydown(e) {
  if (e.key === 'Escape') {
    e.preventDefault()
    goBack()
  }
}

onMounted(async () => {
  await loadTenants()
  await nextTick()
  pkeyInput.value?.focus()
})
</script>

<template>
  <div class="create-view">
    <p class="back">
      <button type="button" class="back-btn" @click="goBack">← IVRs</button>
    </p>
    <h1>Create IVR</h1>

    <form class="form" @submit="onSubmit" @keydown="onKeydown">
      <p v-if="error" id="ivr-create-error" class="error" role="alert">{{ error }}</p>

      <label for="pkey" class="form-label">IVR Name</label>
      <input
        id="pkey"
        ref="pkeyInput"
        v-model="pkey"
        type="text"
        class="form-input"
        placeholder="e.g. main-ivr"
        required
        autocomplete="off"
      />
      <p class="form-hint">Unique ID for this IVR.</p>

      <label for="cluster" class="form-label">Tenant</label>
      <select
        id="cluster"
        v-model="cluster"
        class="form-input"
        required
        aria-label="Tenant"
        :disabled="tenantsLoading"
        :aria-busy="tenantsLoading"
      >
        <option v-if="tenantsLoading" value="">Loading…</option>
        <template v-else>
          <option v-for="opt in tenantOptionsForSelect" :key="opt" :value="opt">{{ opt }}</option>
        </template>
      </select>
      <p class="form-hint">The tenant this IVR belongs to. Tenants provide multi-tenant support.</p>

      <label for="description" class="form-label">Description (optional)</label>
      <input
        id="description"
        v-model="description"
        type="text"
        class="form-input"
        placeholder="Freeform description"
        autocomplete="off"
      />
      <p class="form-hint">Shown in the IVR list.</p>

      <div class="actions">
        <button type="submit" :disabled="loading || tenantsLoading">
          {{ loading ? 'Creating…' : 'Create' }}
        </button>
        <button type="button" class="secondary" @click="goBack">Cancel</button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.create-view {
  max-width: 28rem;
}
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
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.form-label {
  font-size: 0.875rem;
  font-weight: 500;
}
.form-hint {
  font-size: 0.8125rem;
  color: #64748b;
  margin: -0.25rem 0 0 0;
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
