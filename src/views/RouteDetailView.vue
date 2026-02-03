<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useToastStore } from '@/stores/toast'
import DeleteConfirmModal from '@/components/DeleteConfirmModal.vue'

const route = useRoute()
const router = useRouter()
const toast = useToastStore()
const routeData = ref(null)
const tenants = ref([])
const loading = ref(true)
const error = ref('')
const editing = ref(false)
const editCluster = ref('default')
const editDesc = ref('')
const editActive = ref('YES')
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

/** Map cluster id, shortuid, or pkey → tenant pkey for display (always show pkey, not shortuid). */
const clusterToTenantPkey = computed(() => {
  const map = new Map()
  for (const t of tenants.value) {
    if (t.id != null) map.set(String(t.id), t.pkey ?? t.id)
    if (t.shortuid != null) map.set(String(t.shortuid), t.pkey ?? t.shortuid)
    if (t.pkey != null) map.set(String(t.pkey), t.pkey)
  }
  return map
})

function tenantPkeyDisplay(clusterValue) {
  if (clusterValue == null || clusterValue === '') return '—'
  const s = String(clusterValue)
  return clusterToTenantPkey.value.get(s) ?? routeData.value?.tenant_pkey ?? s
}

const tenantOptions = computed(() => {
  const list = tenants.value.map((t) => t.pkey).filter(Boolean)
  return [...new Set(list)].sort((a, b) => String(a).localeCompare(String(b)))
})

const tenantOptionsForSelect = computed(() => {
  const list = tenantOptions.value
  const cur = editCluster.value
  if (cur && !list.includes(cur)) return [cur, ...list].sort((a, b) => String(a).localeCompare(String(b)))
  return list
})

async function fetchTenants() {
  try {
    const response = await getApiClient().get('tenants')
    tenants.value = normalizeList(response)
  } catch {
    tenants.value = []
  }
}

async function fetchRoute() {
  if (!pkey.value) return
  loading.value = true
  error.value = ''
  try {
    routeData.value = await getApiClient().get(`routes/${encodeURIComponent(pkey.value)}`)
    const tenantPkey = routeData.value?.tenant_pkey ?? tenantPkeyDisplay(routeData.value?.cluster)
    editCluster.value = tenantPkey ?? 'default'
    editDesc.value = routeData.value?.desc ?? routeData.value?.description ?? ''
    editActive.value = routeData.value?.active ?? 'YES'
    if (route.query.edit) startEdit()
  } catch (err) {
    error.value = err.data?.message || err.message || 'Failed to load route'
    routeData.value = null
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchTenants().then(() => fetchRoute())
})
watch(pkey, fetchRoute)

function goBack() {
  router.push({ name: 'routes' })
}

function startEdit() {
  editCluster.value = routeData.value?.tenant_pkey ?? tenantPkeyDisplay(routeData.value?.cluster) ?? 'default'
  editDesc.value = routeData.value?.desc ?? routeData.value?.description ?? ''
  editActive.value = routeData.value?.active ?? 'YES'
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
    await getApiClient().put(`routes/${encodeURIComponent(pkey.value)}`, {
      cluster: editCluster.value.trim(),
      desc: editDesc.value.trim() || undefined,
      active: editActive.value
    })
    await fetchRoute()
    editing.value = false
    toast.show(`Route ${pkey.value} saved`)
  } catch (err) {
    const msg =
      err.data?.cluster?.[0] ??
      err.data?.desc?.[0] ??
      err.data?.active?.[0] ??
      err.data?.message ??
      err.message
    saveError.value = msg || 'Failed to update route'
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
    await getApiClient().delete(`routes/${encodeURIComponent(pkey.value)}`)
    toast.show(`Route ${pkey.value} deleted`)
    router.push({ name: 'routes' })
  } catch (err) {
    deleteError.value = err.data?.message ?? err.message ?? 'Failed to delete route'
  } finally {
    deleting.value = false
    confirmDeleteOpen.value = false
  }
}

/** Identity section: immutable fields grouped first, then editable. */
const identityFields = computed(() => {
  if (!routeData.value) return []
  const r = routeData.value
  return [
    { label: 'name', value: r.pkey ?? '—', immutable: true },
    { label: 'Local UID', value: r.shortuid ?? '—', immutable: true },
    { label: 'KSUID', value: r.id ?? '—', immutable: true },
    { label: 'description', value: r.desc ?? r.description ?? '—', immutable: false }
  ]
})

/** Settings section: Tenant, Active? */
const settingsFields = computed(() => {
  if (!routeData.value) return []
  const r = routeData.value
  return [
    { label: 'Tenant', value: tenantPkeyDisplay(r.cluster) },
    { label: 'Active?', value: r.active ?? '—' }
  ]
})

const ADVANCED_EXCLUDE = new Set([
  'id', 'pkey', 'shortuid', 'desc', 'description', 'cluster', 'tenant_pkey', 'active'
])
const otherFields = computed(() => {
  if (!routeData.value || typeof routeData.value !== 'object') return []
  return Object.entries(routeData.value)
    .filter(([k]) => !ADVANCED_EXCLUDE.has(k))
    .sort(([a], [b]) => a.localeCompare(b))
})
</script>

<template>
  <div>
    <p class="back">
      <button type="button" class="back-btn" @click="goBack">← Routes</button>
    </p>
    <h1>Route: {{ pkey }}</h1>

    <p v-if="loading" class="loading">Loading…</p>
    <p v-else-if="error" class="error">{{ error }}</p>
    <template v-else-if="routeData">
      <div class="detail-content">
        <p v-if="!editing" class="toolbar">
          <button type="button" class="edit-btn" @click="startEdit">Edit</button>
          <button
            type="button"
            class="delete-btn"
            :disabled="deleting"
            @click="askConfirmDelete"
          >
            {{ deleting ? 'Deleting…' : 'Delete route' }}
          </button>
        </p>
        <p v-if="deleteError" class="error">{{ deleteError }}</p>
        <form v-else-if="editing" class="edit-form" @submit="saveEdit">
          <h2 class="detail-heading">Identity</h2>
          <label>name</label>
          <p class="detail-readonly value-immutable" title="Immutable">{{ routeData.pkey ?? '—' }}</p>
          <label>Local UID</label>
          <p class="detail-readonly value-immutable" title="Immutable">{{ routeData.shortuid ?? '—' }}</p>
          <label>KSUID</label>
          <p class="detail-readonly value-immutable" title="Immutable">{{ routeData.id ?? '—' }}</p>
          <label for="edit-desc">description</label>
          <input id="edit-desc" v-model="editDesc" type="text" class="edit-input" />
          <h2 class="detail-heading">Settings</h2>
          <label for="edit-tenant">Tenant</label>
          <select id="edit-tenant" v-model="editCluster" class="edit-input" required>
            <option v-for="opt in tenantOptionsForSelect" :key="opt" :value="opt">{{ opt }}</option>
          </select>
          <label class="edit-label-block">Active?</label>
          <div class="switch-toggle switch-ios">
            <input id="edit-active-yes" type="radio" value="YES" v-model="editActive" />
            <label for="edit-active-yes">YES</label>
            <input id="edit-active-no" type="radio" value="NO" v-model="editActive" />
            <label for="edit-active-no">NO</label>
          </div>
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
                <dd :class="{ 'value-immutable': f.immutable }" :title="f.immutable ? 'Immutable' : undefined">{{ f.value }}</dd>
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

    <DeleteConfirmModal
      :show="confirmDeleteOpen"
      title="Delete route?"
      :loading="deleting"
      @confirm="confirmAndDelete"
      @cancel="cancelConfirmDelete"
    >
      <template #body>
        <p>Route <strong>{{ pkey }}</strong> will be permanently deleted. This cannot be undone.</p>
      </template>
    </DeleteConfirmModal>
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
.detail-content {
  max-width: 36rem;
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
.detail-readonly {
  margin: 0 0 0.5rem 0;
  font-size: 0.9375rem;
  color: #64748b;
}
.value-immutable {
  color: #64748b;
  background: #f8fafc;
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
}
.detail-list dd.value-immutable {
  padding: 0.125rem 0.25rem;
  margin: 0;
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
.edit-label-block {
  display: block;
  margin-bottom: 0.25rem;
}
.switch-toggle.switch-ios {
  display: flex;
  flex-wrap: wrap;
  background: #e2e8f0;
  border-radius: 0.5rem;
  padding: 0.25rem;
  gap: 0;
}
.switch-toggle.switch-ios input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}
.switch-toggle.switch-ios label {
  flex: 1;
  min-width: 0;
  margin: 0;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  text-align: center;
  cursor: pointer;
  border-radius: 0.375rem;
  transition: background-color 0.15s, color 0.15s;
  color: #64748b;
}
.switch-toggle.switch-ios label:hover {
  color: #334155;
}
.switch-toggle.switch-ios input:checked + label {
  background: white;
  color: #0f172a;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
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
