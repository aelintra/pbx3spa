<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'

const route = useRoute()
const router = useRouter()
const tenant = ref(null)
const loading = ref(true)
const error = ref('')
const editing = ref(false)
const editDescription = ref('')
const saveError = ref('')
const saving = ref(false)

const pkey = computed(() => route.params.pkey)

async function fetchTenant() {
  if (!pkey.value) return
  loading.value = true
  error.value = ''
  try {
    tenant.value = await getApiClient().get(`tenants/${encodeURIComponent(pkey.value)}`)
    editDescription.value = tenant.value?.description ?? ''
  } catch (err) {
    error.value = err.data?.message || err.message || 'Failed to load tenant'
    tenant.value = null
  } finally {
    loading.value = false
  }
}

onMounted(fetchTenant)
watch(pkey, fetchTenant)

function goBack() {
  router.push({ name: 'tenants' })
}

function startEdit() {
  editDescription.value = tenant.value?.description ?? ''
  saveError.value = ''
  editing.value = true
}

function cancelEdit() {
  editing.value = false
  saveError.value = ''
}

async function saveEdit(e) {
  e.preventDefault()
  saveError.value = ''
  saving.value = true
  try {
    await getApiClient().put(`tenants/${encodeURIComponent(pkey.value)}`, {
      description: editDescription.value.trim()
    })
    await fetchTenant()
    editing.value = false
  } catch (err) {
    const msg = err.data?.description?.[0] ?? err.data?.message ?? err.data?.Error ?? err.message
    saveError.value = msg || 'Failed to update tenant'
  } finally {
    saving.value = false
  }
}

const detailFields = computed(() => {
  if (!tenant.value || typeof tenant.value !== 'object') return []
  const skip = new Set(['pkey'])
  return Object.entries(tenant.value)
    .filter(([k]) => !skip.has(k))
    .sort(([a], [b]) => a.localeCompare(b))
})
</script>

<template>
  <div>
    <p class="back">
      <button type="button" class="back-btn" @click="goBack">← Tenants</button>
    </p>
    <h1>Tenant: {{ pkey }}</h1>

    <p v-if="loading" class="loading">Loading…</p>
    <p v-else-if="error" class="error">{{ error }}</p>
    <template v-else-if="tenant">
      <p v-if="!editing" class="toolbar">
        <button type="button" class="edit-btn" @click="startEdit">Edit</button>
      </p>
      <form v-else class="edit-form" @submit="saveEdit">
        <label for="edit-description">description</label>
        <input
          id="edit-description"
          v-model="editDescription"
          type="text"
          class="edit-input"
        />
        <p v-if="saveError" class="error">{{ saveError }}</p>
        <div class="edit-actions">
          <button type="submit" :disabled="saving">{{ saving ? 'Saving…' : 'Save' }}</button>
          <button type="button" class="secondary" @click="cancelEdit">Cancel</button>
        </div>
      </form>
      <dl class="detail-list">
        <dt>pkey</dt>
        <dd>{{ tenant.pkey }}</dd>
        <template v-for="[key, value] in detailFields" :key="key">
          <dt>{{ key }}</dt>
          <dd>{{ value == null ? '—' : String(value) }}</dd>
        </template>
      </dl>
    </template>
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
.loading,
.error {
  margin-top: 1rem;
}
.error {
  color: #dc2626;
}
.detail-list {
  margin-top: 1rem;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.25rem 2rem;
  font-size: 0.9375rem;
  max-width: 36rem;
}
.detail-list dt {
  font-weight: 500;
  color: #475569;
}
.detail-list dd {
  margin: 0;
}
.toolbar {
  margin: 0 0 0.75rem 0;
}
.edit-btn {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
  color: #2563eb;
  background: transparent;
  border: 1px solid #93c5fd;
  border-radius: 0.375rem;
  cursor: pointer;
}
.edit-btn:hover {
  background: #eff6ff;
}
.edit-form {
  margin-bottom: 1rem;
  max-width: 24rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.edit-form label {
  font-size: 0.875rem;
  font-weight: 500;
}
.edit-input {
  padding: 0.5rem 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  font-size: 1rem;
}
.edit-input:focus {
  outline: none;
  border-color: #3b82f6;
}
.edit-actions {
  display: flex;
  gap: 0.5rem;
}
.edit-actions button {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 0.375rem;
  cursor: pointer;
}
.edit-actions button[type="submit"] {
  color: #fff;
  background: #2563eb;
  border: none;
}
.edit-actions button[type="submit"]:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
.edit-actions button.secondary {
  color: #64748b;
  background: transparent;
  border: 1px solid #e2e8f0;
}
.edit-actions button.secondary:hover {
  background: #f1f5f9;
}
</style>
