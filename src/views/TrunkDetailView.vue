<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useToastStore } from '@/stores/toast'

const route = useRoute()
const router = useRouter()
const toast = useToastStore()
const trunk = ref(null)
const tenants = ref([])
const loading = ref(true)
const error = ref('')
const editing = ref(false)
const editDescription = ref('')
const editActive = ref('YES')
const editCluster = ref('default')
const editHost = ref('')
const saveError = ref('')
const saving = ref(false)
const deleteError = ref('')
const deleting = ref(false)
const confirmDeleteOpen = ref(false)
const advancedOpen = ref(false)

const pkey = computed(() => route.params.pkey)

function normalizeList(response) {
  if (Array.isArray(response)) return response
  if (response && typeof response === 'object') {
    if (Array.isArray(response.data)) return response.data
    if (Array.isArray(response.tenants)) return response.tenants
    if (Object.keys(response).every((k) => /^\d+$/.test(k))) return Object.values(response)
  }
  return []
}

const clusterToTenantPkey = computed(() => {
  const map = new Map()
  for (const t of tenants.value) {
    if (t.id != null) map.set(String(t.id), t.pkey ?? t.id)
    if (t.pkey != null) map.set(String(t.pkey), t.pkey)
  }
  return map
})

function tenantPkeyDisplay(clusterValue) {
  if (clusterValue == null || clusterValue === '') return '—'
  const s = String(clusterValue)
  return clusterToTenantPkey.value.get(s) ?? trunk.value?.tenant_pkey ?? s
}

async function fetchTenants() {
  try {
    const response = await getApiClient().get('tenants')
    tenants.value = normalizeList(response)
  } catch {
    tenants.value = []
  }
}

async function fetchTrunk() {
  if (!pkey.value) return
  loading.value = true
  error.value = ''
  try {
    trunk.value = await getApiClient().get(`trunks/${encodeURIComponent(pkey.value)}`)
    editDescription.value = trunk.value?.description ?? ''
    editActive.value = trunk.value?.active ?? 'YES'
    const tenantPkey = trunk.value?.tenant_pkey ?? tenantPkeyDisplay(trunk.value?.cluster)
    editCluster.value = tenantPkey ?? 'default'
    editHost.value = trunk.value?.host ?? ''
    if (route.query.edit) startEdit()
  } catch (err) {
    error.value = err.data?.message || err.message || 'Failed to load trunk'
    trunk.value = null
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchTenants().then(() => fetchTrunk())
})
watch(pkey, fetchTrunk)

function goBack() {
  router.push({ name: 'trunks' })
}

function startEdit() {
  editDescription.value = trunk.value?.description ?? ''
  editActive.value = trunk.value?.active ?? 'YES'
  editCluster.value = trunk.value?.tenant_pkey ?? tenantPkeyDisplay(trunk.value?.cluster) ?? 'default'
  editHost.value = trunk.value?.host ?? ''
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
    await getApiClient().put(`trunks/${encodeURIComponent(pkey.value)}`, {
      description: editDescription.value.trim() || undefined,
      active: editActive.value,
      cluster: editCluster.value.trim(),
      host: editHost.value.trim()
    })
    await fetchTrunk()
    editing.value = false
    toast.show(`Trunk ${pkey.value} saved`)
  } catch (err) {
    const msg =
      err.data?.description?.[0] ??
      err.data?.active?.[0] ??
      err.data?.cluster?.[0] ??
      err.data?.host?.[0] ??
      err.data?.message ??
      err.message
    saveError.value = msg || 'Failed to update trunk'
  } finally {
    saving.value = false
  }
}

function askConfirmDelete() {
  deleteError.value = ''
  confirmDeleteOpen.value = true
}

function cancelConfirmDelete() {
  confirmDeleteOpen.value = false
}

async function confirmAndDelete() {
  deleteError.value = ''
  deleting.value = true
  try {
    await getApiClient().delete(`trunks/${encodeURIComponent(pkey.value)}`)
    toast.show(`Trunk ${pkey.value} deleted`)
    router.push({ name: 'trunks' })
  } catch (err) {
    deleteError.value = err.data?.message ?? err.message ?? 'Failed to delete trunk'
  } finally {
    deleting.value = false
    confirmDeleteOpen.value = false
  }
}

/** Identity section: name, Local UID, KSUID, description */
const identityFields = computed(() => {
  if (!trunk.value) return []
  const t = trunk.value
  return [
    { label: 'name', value: t.pkey ?? '—' },
    { label: 'Local UID', value: t.shortuid ?? '—' },
    { label: 'KSUID', value: t.id ?? '—' },
    { label: 'description', value: t.description ?? '—' }
  ]
})

/** Settings section: Tenant, active, host */
const settingsFields = computed(() => {
  if (!trunk.value) return []
  const t = trunk.value
  return [
    { label: 'Tenant', value: tenantPkeyDisplay(t.cluster) },
    { label: 'Active?', value: t.active ?? '—' },
    { label: 'host', value: t.host ?? '—' }
  ]
})

const ADVANCED_EXCLUDE = new Set([
  'id', 'pkey', 'shortuid', 'description', 'cluster', 'tenant_pkey', 'active', 'host'
])
const otherFields = computed(() => {
  if (!trunk.value || typeof trunk.value !== 'object') return []
  return Object.entries(trunk.value)
    .filter(([k]) => !ADVANCED_EXCLUDE.has(k))
    .sort(([a], [b]) => a.localeCompare(b))
})
</script>

<template>
  <div>
    <p class="back">
      <button type="button" class="back-btn" @click="goBack">← Trunks</button>
    </p>
    <h1>Trunk: {{ pkey }}</h1>

    <p v-if="loading" class="loading">Loading…</p>
    <p v-else-if="error" class="error">{{ error }}</p>
    <template v-else-if="trunk">
      <div class="detail-content">
        <p v-if="!editing" class="toolbar">
          <button type="button" class="edit-btn" @click="startEdit">Edit</button>
          <button
            type="button"
            class="delete-btn"
            :disabled="deleting"
            @click="askConfirmDelete"
          >
            {{ deleting ? 'Deleting…' : 'Delete trunk' }}
          </button>
        </p>
        <p v-if="deleteError" class="error">{{ deleteError }}</p>
        <form v-else-if="editing" class="edit-form" @submit="saveEdit">
          <label for="edit-description">description</label>
          <input id="edit-description" v-model="editDescription" type="text" class="edit-input" />
          <label for="edit-active">active</label>
          <select id="edit-active" v-model="editActive" class="edit-input">
            <option value="YES">YES</option>
            <option value="NO">NO</option>
          </select>
          <label for="edit-cluster">Tenant (cluster)</label>
          <input id="edit-cluster" v-model="editCluster" type="text" class="edit-input" required />
          <label for="edit-host">host</label>
          <input id="edit-host" v-model="editHost" type="text" class="edit-input" required />
          <p v-if="saveError" class="error">{{ saveError }}</p>
          <div class="edit-actions">
            <button type="submit" :disabled="saving">{{ saving ? 'Saving…' : 'Save' }}</button>
            <button type="button" class="secondary" @click="cancelEdit">Cancel</button>
          </div>
        </form>
        <template v-if="!editing">
          <section class="detail-section">
            <h2 class="detail-heading">Identity</h2>
            <dl class="detail-list">
              <template v-for="f in identityFields" :key="f.label">
                <dt>{{ f.label }}</dt>
                <dd>{{ f.value }}</dd>
              </template>
            </dl>
          </section>
          <section class="detail-section">
            <h2 class="detail-heading">Settings</h2>
            <dl class="detail-list">
              <template v-for="f in settingsFields" :key="f.label">
                <dt>{{ f.label }}</dt>
                <dd>{{ f.value }}</dd>
              </template>
            </dl>
          </section>
          <section class="detail-section">
            <button type="button" class="collapse-trigger" :aria-expanded="advancedOpen" @click="advancedOpen = !advancedOpen">
              {{ advancedOpen ? '▼' : '▶' }} Advanced
            </button>
            <dl v-show="advancedOpen" class="detail-list detail-list-other">
              <template v-for="[key, value] in otherFields" :key="key">
                <dt>{{ key }}</dt>
                <dd>{{ value == null ? '—' : String(value) }}</dd>
              </template>
            </dl>
          </section>
        </template>
      </div>
    </template>

    <Teleport to="body">
      <div v-if="confirmDeleteOpen" class="modal-backdrop" @click.self="cancelConfirmDelete">
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-delete-title">
          <h2 id="modal-delete-title" class="modal-title">Delete trunk?</h2>
          <p class="modal-body">
            Trunk <strong>{{ pkey }}</strong> will be permanently deleted. This cannot be undone.
          </p>
          <div class="modal-actions">
            <button type="button" class="modal-btn modal-btn-cancel" @click="cancelConfirmDelete">Cancel</button>
            <button type="button" class="modal-btn modal-btn-delete" :disabled="deleting" @click="confirmAndDelete">
              {{ deleting ? 'Deleting…' : 'Delete' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
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
.detail-content {
  max-width: 36rem;
}
.detail-section {
  margin-top: 1.5rem;
}
.detail-section:first-of-type {
  margin-top: 1rem;
}
.detail-heading {
  font-size: 1rem;
  font-weight: 600;
  color: #334155;
  margin: 0 0 0.5rem 0;
}
.detail-list-other {
  margin-top: 0.5rem;
}
.collapse-trigger {
  display: block;
  width: 100%;
  padding: 0.5rem 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: #334155;
  background: transparent;
  border: none;
  border-bottom: 1px solid #e2e8f0;
  cursor: pointer;
  text-align: left;
}
.collapse-trigger:hover {
  color: #0f172a;
}
.toolbar {
  margin: 0 0 0.75rem 0;
}
.edit-btn,
.delete-btn {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
  margin-right: 0.5rem;
  border-radius: 0.375rem;
  cursor: pointer;
}
.edit-btn {
  color: #2563eb;
  background: transparent;
  border: 1px solid #93c5fd;
}
.edit-btn:hover {
  background: #eff6ff;
}
.delete-btn {
  color: #dc2626;
  background: transparent;
  border: 1px solid #fca5a5;
}
.delete-btn:hover:not(:disabled) {
  background: #fef2f2;
}
.delete-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
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

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}
.modal {
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  padding: 1.5rem;
  max-width: 24rem;
  width: 100%;
}
.modal-title {
  margin: 0 0 0.75rem 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #0f172a;
}
.modal-body {
  margin: 0 0 1.25rem 0;
  font-size: 0.9375rem;
  color: #475569;
  line-height: 1.5;
}
.modal-body strong {
  color: #0f172a;
}
.modal-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}
.modal-btn {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 0.375rem;
  cursor: pointer;
  border: none;
}
.modal-btn-cancel {
  background: #f1f5f9;
  color: #475569;
}
.modal-btn-cancel:hover {
  background: #e2e8f0;
}
.modal-btn-delete {
  background: #dc2626;
  color: white;
}
.modal-btn-delete:hover:not(:disabled) {
  background: #b91c1c;
}
.modal-btn-delete:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
</style>
