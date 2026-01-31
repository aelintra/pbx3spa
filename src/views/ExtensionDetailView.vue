<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useToastStore } from '@/stores/toast'

const route = useRoute()
const router = useRouter()
const toast = useToastStore()
const extension = ref(null)
const tenants = ref([])
const runtime = ref(null)
const runtimeError = ref('')
const loading = ref(true)
const error = ref('')
const editing = ref(false)
const editPkey = ref('')
const editCluster = ref('')
const editDesc = ref('')
const editActive = ref('YES')
const editLocation = ref('local')
const editTransport = ref('udp')
const saveError = ref('')
const saving = ref(false)
const deleteError = ref('')
const deleting = ref(false)
const editingRuntime = ref(false)
const editCfim = ref('')
const editCfbs = ref('')
const editRingdelay = ref('')
const runtimeSaveError = ref('')
const runtimeSaving = ref(false)
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

/** Map cluster id/shortuid/pkey → tenant pkey for display and dropdown */
const clusterToTenantPkey = computed(() => {
  const map = new Map()
  for (const t of tenants.value) {
    if (t.id != null) map.set(String(t.id), t.pkey ?? t.id)
    if (t.shortuid != null) map.set(String(t.shortuid), t.pkey ?? t.shortuid)
    if (t.pkey != null) map.set(String(t.pkey), t.pkey)
  }
  return map
})

const tenantOptions = computed(() => {
  const list = tenants.value.map((t) => t.pkey).filter(Boolean)
  return [...new Set(list)].sort((a, b) => String(a).localeCompare(String(b)))
})

/** Tenant options for dropdown, including current value if not in list (e.g. from API) */
const tenantOptionsForSelect = computed(() => {
  const list = tenantOptions.value
  const cur = editCluster.value
  if (cur && !list.includes(cur)) return [cur, ...list].sort((a, b) => String(a).localeCompare(String(b)))
  return list
})

/** Resolve extension cluster to tenant pkey for display */
function tenantPkeyDisplay(clusterValue) {
  if (clusterValue == null || clusterValue === '') return '—'
  const s = String(clusterValue)
  return clusterToTenantPkey.value.get(s) ?? extension.value?.tenant_pkey ?? s
}

/** Other fields for Advanced section (exclude identity/transport/runtime) */
const ADVANCED_EXCLUDE = new Set([
  'id', 'pkey', 'shortuid', 'cluster', 'tenant_pkey', 'active', 'device', 'devicemodel', 'location', 'desc', 'description',
  'transport', 'technology', 'macaddr'
])
const otherFields = computed(() => {
  if (!extension.value || typeof extension.value !== 'object') return []
  return Object.entries(extension.value)
    .filter(([k]) => !ADVANCED_EXCLUDE.has(k))
    .sort(([a], [b]) => a.localeCompare(b))
})

async function fetchTenants() {
  try {
    const response = await getApiClient().get('tenants')
    tenants.value = normalizeList(response)
  } catch {
    tenants.value = []
  }
}

async function fetchExtension() {
  if (!pkey.value) return
  loading.value = true
  error.value = ''
  runtime.value = null
  runtimeError.value = ''
  try {
    extension.value = await getApiClient().get(`extensions/${encodeURIComponent(pkey.value)}`)
    editPkey.value = extension.value?.pkey ?? ''
    const tenantPkey = extension.value?.tenant_pkey ?? tenantPkeyDisplay(extension.value?.cluster)
    editCluster.value = tenantPkey ?? 'default'
    editDesc.value = extension.value?.desc ?? extension.value?.description ?? ''
    editActive.value = extension.value?.active ?? 'YES'
    editLocation.value = extension.value?.location ?? 'local'
    editTransport.value = extension.value?.transport ?? 'udp'
    await fetchRuntime()
    if (route.query.edit) startEdit()
  } catch (err) {
    error.value = err.data?.message || err.message || 'Failed to load extension'
    extension.value = null
  } finally {
    loading.value = false
  }
}

async function fetchRuntime() {
  if (!pkey.value) return
  runtimeError.value = ''
  try {
    runtime.value = await getApiClient().get(`extensions/${encodeURIComponent(pkey.value)}/runtime`)
    editCfim.value = runtime.value?.cfim ?? ''
    editCfbs.value = runtime.value?.cfbs ?? ''
    editRingdelay.value = runtime.value?.ringdelay != null ? String(runtime.value.ringdelay) : ''
  } catch (err) {
    runtimeError.value = err.data?.message || err.message || 'Runtime unavailable'
    runtime.value = null
  }
}

/** Identity section fields for view mode */
const identityFields = computed(() => {
  if (!extension.value) return []
  const ext = extension.value
  return [
    { label: 'Ext', value: ext.pkey ?? '—' },
    { label: 'SIP Identity', value: ext.shortuid ?? '—' },
    { label: 'KSUID', value: ext.id ?? '—' },
    { label: 'Tenant', value: tenantPkeyDisplay(ext.cluster) },
    { label: 'User', value: ext.desc ?? ext.description ?? '—' },
    { label: 'Device', value: ext.device ?? '—' },
    { label: 'Device model', value: ext.devicemodel ?? '—' },
    { label: 'MAC', value: ext.macaddr ?? '—' },
    { label: 'Active?', value: ext.active ?? '—' }
  ]
})

/** Transport section fields for view mode */
const transportFields = computed(() => {
  if (!extension.value) return []
  const ext = extension.value
  return [
    { label: 'Location', value: ext.location ?? '—' },
    { label: 'Transport', value: ext.transport ?? '—' }
  ]
})

onMounted(() => {
  fetchTenants().then(() => fetchExtension())
})
watch(pkey, fetchExtension)

function goBack() {
  router.push({ name: 'extensions' })
}

function startEdit() {
  editPkey.value = extension.value?.pkey ?? ''
  editCluster.value = extension.value?.tenant_pkey ?? tenantPkeyDisplay(extension.value?.cluster) ?? 'default'
  editDesc.value = extension.value?.desc ?? extension.value?.description ?? ''
  editActive.value = extension.value?.active ?? 'YES'
  editLocation.value = extension.value?.location ?? 'local'
  editTransport.value = extension.value?.transport ?? 'udp'
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
    const newPkey = editPkey.value.trim()
    await getApiClient().put(`extensions/${encodeURIComponent(pkey.value)}`, {
      pkey: newPkey,
      cluster: editCluster.value.trim(),
      device: extension.value.device ?? 'MAILBOX',
      desc: editDesc.value.trim() || null,
      location: editLocation.value,
      active: editActive.value,
      transport: editTransport.value
    })
    toast.show(`Extension ${newPkey} saved`)
    editing.value = false
    if (newPkey !== pkey.value) {
      router.push({ name: 'extension-detail', params: { pkey: newPkey } })
    } else {
      await fetchExtension()
    }
  } catch (err) {
    const msg =
      err.data?.pkey?.[0] ??
      err.data?.cluster?.[0] ??
      err.data?.desc?.[0] ??
      err.data?.active?.[0] ??
      err.data?.location?.[0] ??
      err.data?.transport?.[0] ??
      err.data?.message ??
      err.message
    saveError.value = msg || 'Failed to update extension'
  } finally {
    saving.value = false
  }
}

function startEditRuntime() {
  editCfim.value = runtime.value?.cfim ?? ''
  editCfbs.value = runtime.value?.cfbs ?? ''
  editRingdelay.value = runtime.value?.ringdelay != null ? String(runtime.value.ringdelay) : ''
  runtimeSaveError.value = ''
  editingRuntime.value = true
}

function cancelEditRuntime() {
  editingRuntime.value = false
  runtimeSaveError.value = ''
}

async function saveRuntime(e) {
  e.preventDefault()
  runtimeSaveError.value = ''
  runtimeSaving.value = true
  try {
    await getApiClient().put(`extensions/${encodeURIComponent(pkey.value)}/runtime`, {
      cfim: editCfim.value.trim() || null,
      cfbs: editCfbs.value.trim() || null,
      ringdelay: editRingdelay.value === '' ? null : parseInt(editRingdelay.value, 10)
    })
    await fetchRuntime()
    editingRuntime.value = false
    toast.show('Runtime settings saved')
  } catch (err) {
    runtimeSaveError.value = err.data?.message ?? err.message ?? 'Failed to update runtime'
  } finally {
    runtimeSaving.value = false
  }
}

async function doDelete() {
  if (!confirm(`Delete extension "${pkey.value}"? This cannot be undone.`)) return
  deleteError.value = ''
  deleting.value = true
  try {
    await getApiClient().delete(`extensions/${encodeURIComponent(pkey.value)}`)
    router.push({ name: 'extensions' })
  } catch (err) {
    deleteError.value = err.data?.message ?? err.message ?? 'Failed to delete extension'
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div>
    <p class="back">
      <button type="button" class="back-btn" @click="goBack">← Extensions</button>
    </p>
    <h1>Extension: {{ pkey }}</h1>

    <p v-if="loading" class="loading">Loading…</p>
    <p v-else-if="error" class="error">{{ error }}</p>
    <template v-else-if="extension">
      <div class="detail-content">
        <p v-if="!editing" class="toolbar">
          <button type="button" class="edit-btn" @click="startEdit">Edit</button>
          <button
            type="button"
            class="delete-btn"
            :disabled="deleting"
            @click="doDelete"
          >
            {{ deleting ? 'Deleting…' : 'Delete extension' }}
          </button>
        </p>
        <p v-if="deleteError" class="error">{{ deleteError }}</p>
        <form v-else-if="editing" class="edit-form" @submit="saveEdit">
          <h2 class="detail-heading">Identity</h2>
          <label>SIP Identity</label>
          <p class="detail-readonly">{{ extension.shortuid ?? '—' }}</p>
          <label for="edit-tenant">Tenant</label>
          <select id="edit-tenant" v-model="editCluster" class="edit-input" required>
            <option v-for="opt in tenantOptionsForSelect" :key="opt" :value="opt">{{ opt }}</option>
          </select>
          <label for="edit-desc">User (extension name)</label>
          <input id="edit-desc" v-model="editDesc" type="text" class="edit-input" placeholder="e.g. John Doe" maxlength="255" />
          <label class="edit-label-block">Active?</label>
          <div class="switch-toggle switch-ios">
            <input id="edit-active-yes" type="radio" value="YES" v-model="editActive" />
            <label for="edit-active-yes">YES</label>
            <input id="edit-active-no" type="radio" value="NO" v-model="editActive" />
            <label for="edit-active-no">NO</label>
          </div>
          <h2 class="detail-heading">Transport</h2>
          <label class="edit-label-block">Location</label>
          <div class="switch-toggle switch-ios">
            <input id="edit-location-local" type="radio" value="local" v-model="editLocation" />
            <label for="edit-location-local">local</label>
            <input id="edit-location-remote" type="radio" value="remote" v-model="editLocation" />
            <label for="edit-location-remote">remote</label>
          </div>
          <label class="edit-label-block">Transport protocol</label>
          <div class="switch-toggle switch-ios">
            <input id="edit-transport-udp" type="radio" value="udp" v-model="editTransport" />
            <label for="edit-transport-udp">udp</label>
            <input id="edit-transport-tcp" type="radio" value="tcp" v-model="editTransport" />
            <label for="edit-transport-tcp">tcp</label>
            <input id="edit-transport-tls" type="radio" value="tls" v-model="editTransport" />
            <label for="edit-transport-tls">tls</label>
            <input id="edit-transport-wss" type="radio" value="wss" v-model="editTransport" />
            <label for="edit-transport-wss">wss</label>
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
                <dd>{{ f.value }}</dd>
              </template>
            </dl>
          </section>
          <section class="detail-section">
            <h2 class="detail-heading">Transport</h2>
            <dl class="detail-list">
              <template v-for="f in transportFields" :key="f.label">
                <dt>{{ f.label }}</dt>
                <dd>{{ f.value }}</dd>
              </template>
            </dl>
          </section>
          <section class="detail-section">
            <h2 class="detail-heading">Runtime</h2>
            <p v-if="runtimeError" class="error">{{ runtimeError }}</p>
            <template v-else-if="runtime">
              <p v-if="!editingRuntime" class="toolbar">
                <button type="button" class="edit-btn" @click="startEditRuntime">Edit runtime</button>
              </p>
              <form v-else class="edit-form" @submit="saveRuntime">
                <label for="edit-cfim">cfim (call forward no answer)</label>
                <input id="edit-cfim" v-model="editCfim" type="text" class="edit-input" placeholder="e.g. +1234567890" />
                <label for="edit-cfbs">cfbs (call forward busy)</label>
                <input id="edit-cfbs" v-model="editCfbs" type="text" class="edit-input" placeholder="e.g. +1234567890" />
                <label for="edit-ringdelay">ringdelay (seconds)</label>
                <input id="edit-ringdelay" v-model="editRingdelay" type="number" min="0" class="edit-input" placeholder="0" />
                <p v-if="runtimeSaveError" class="error">{{ runtimeSaveError }}</p>
                <div class="edit-actions">
                  <button type="submit" :disabled="runtimeSaving">{{ runtimeSaving ? 'Saving…' : 'Save' }}</button>
                  <button type="button" class="secondary" @click="cancelEditRuntime">Cancel</button>
                </div>
              </form>
              <dl v-if="!editingRuntime" class="detail-list">
                <dt>cfim</dt>
                <dd>{{ runtime.cfim ?? '—' }}</dd>
                <dt>cfbs</dt>
                <dd>{{ runtime.cfbs ?? '—' }}</dd>
                <dt>ringdelay</dt>
                <dd>{{ runtime.ringdelay != null ? runtime.ringdelay : '—' }}</dd>
              </dl>
            </template>
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
  </div>
</template>

<style scoped>
.detail-content {
  max-width: 36rem;
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
/* Segmented pill (binary and limited choice) */
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
.detail-readonly {
  margin: 0 0 0.5rem 0;
  font-size: 0.9375rem;
  color: #64748b;
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
