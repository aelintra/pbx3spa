<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useToastStore } from '@/stores/toast'
import DeleteConfirmModal from '@/components/DeleteConfirmModal.vue'

const route = useRoute()
const router = useRouter()
const toast = useToastStore()
const inboundRoute = ref(null)
const tenants = ref([])
const loading = ref(true)
const error = ref('')
const editing = ref(false)
const editCluster = ref('default')
const editDescription = ref('')
const editTrunkname = ref('')
const editActive = ref('YES')
const editOpenroute = ref('')
const editCloseroute = ref('')
const destinations = ref(null)
const destinationsLoading = ref(false)
const editAlertinfo = ref('')
const editMoh = ref('OFF')
const editSwoclip = ref('YES')
const editDisa = ref('')
const editDisapass = ref('')
const editInprefix = ref('')
const editTag = ref('')
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

/** Map cluster id, shortuid, or pkey → tenant pkey for display. */
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
  return clusterToTenantPkey.value.get(s) ?? inboundRoute.value?.tenant_pkey ?? s
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

async function loadDestinations() {
  const c = editCluster.value
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

async function fetchTenants() {
  try {
    const response = await getApiClient().get('tenants')
    tenants.value = normalizeList(response)
  } catch {
    tenants.value = []
  }
}

async function fetchInboundRoute() {
  if (!pkey.value) return
  loading.value = true
  error.value = ''
  try {
    inboundRoute.value = await getApiClient().get(`inboundroutes/${encodeURIComponent(pkey.value)}`)
    const tenantPkey = inboundRoute.value?.tenant_pkey ?? tenantPkeyDisplay(inboundRoute.value?.cluster)
    editCluster.value = tenantPkey ?? 'default'
    editDescription.value = inboundRoute.value?.description ?? inboundRoute.value?.desc ?? ''
    editTrunkname.value = inboundRoute.value?.trunkname ?? ''
    editActive.value = inboundRoute.value?.active ?? 'YES'
    editOpenroute.value = inboundRoute.value?.openroute ?? 'None'
    editCloseroute.value = inboundRoute.value?.closeroute ?? 'None'
    editAlertinfo.value = inboundRoute.value?.alertinfo ?? ''
    editMoh.value = (inboundRoute.value?.moh === 'NO') ? 'OFF' : (inboundRoute.value?.moh ?? 'OFF')
    editSwoclip.value = inboundRoute.value?.swoclip ?? 'YES'
    editDisa.value = inboundRoute.value?.disa ?? ''
    editDisapass.value = inboundRoute.value?.disapass ?? ''
    editInprefix.value = inboundRoute.value?.inprefix != null ? String(inboundRoute.value.inprefix) : ''
    editTag.value = inboundRoute.value?.tag ?? ''
    if (route.query.edit) {
      startEdit()
      if (editCluster.value) loadDestinations()
    }
  } catch (err) {
    error.value = err.data?.message || err.message || 'Failed to load inbound route'
    inboundRoute.value = null
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchTenants().then(() => fetchInboundRoute())
})
watch(pkey, fetchInboundRoute)
watch(editCluster, () => {
  if (editing.value) loadDestinations()
})
watch(editing, (isEditing) => {
  if (isEditing && editCluster.value) loadDestinations()
})

function goBack() {
  router.push({ name: 'inbound-routes' })
}

function startEdit() {
  editCluster.value = inboundRoute.value?.tenant_pkey ?? tenantPkeyDisplay(inboundRoute.value?.cluster) ?? 'default'
  editDescription.value = inboundRoute.value?.description ?? inboundRoute.value?.desc ?? ''
  editTrunkname.value = inboundRoute.value?.trunkname ?? ''
  editActive.value = inboundRoute.value?.active ?? 'YES'
    editOpenroute.value = inboundRoute.value?.openroute ?? 'None'
    editCloseroute.value = inboundRoute.value?.closeroute ?? 'None'
  editAlertinfo.value = inboundRoute.value?.alertinfo ?? ''
  editMoh.value = (inboundRoute.value?.moh === 'NO') ? 'OFF' : (inboundRoute.value?.moh ?? 'OFF')
  editSwoclip.value = inboundRoute.value?.swoclip ?? 'YES'
  editDisa.value = inboundRoute.value?.disa ?? ''
  editDisapass.value = inboundRoute.value?.disapass ?? ''
  editInprefix.value = inboundRoute.value?.inprefix != null ? String(inboundRoute.value.inprefix) : ''
  editTag.value = inboundRoute.value?.tag ?? ''
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
    await getApiClient().put(`inboundroutes/${encodeURIComponent(pkey.value)}`, {
      cluster: editCluster.value.trim(),
      description: editDescription.value.trim() || undefined,
      trunkname: editTrunkname.value.trim() || undefined,
      active: editActive.value,
      openroute: editOpenroute.value.trim() || undefined,
      closeroute: editCloseroute.value.trim() || undefined,
      alertinfo: editAlertinfo.value.trim() || undefined,
      moh: editMoh.value,
      swoclip: editSwoclip.value,
      disa: editDisa.value.trim() || undefined,
      disapass: editDisapass.value.trim() || undefined,
      inprefix: (() => { const n = parseInt(editInprefix.value, 10); return (editInprefix.value === '' || isNaN(n)) ? undefined : n })(),
      tag: editTag.value.trim() || undefined
    })
    await fetchInboundRoute()
    editing.value = false
    toast.show(`Inbound route ${pkey.value} saved`)
  } catch (err) {
    const msg =
      err.data?.cluster?.[0] ??
      err.data?.description?.[0] ??
      err.data?.trunkname?.[0] ??
      err.data?.active?.[0] ??
      err.data?.openroute?.[0] ??
      err.data?.closeroute?.[0] ??
      err.data?.alertinfo?.[0] ??
      err.data?.moh?.[0] ??
      err.data?.swoclip?.[0] ??
      err.data?.disa?.[0] ??
      err.data?.disapass?.[0] ??
      err.data?.inprefix?.[0] ??
      err.data?.tag?.[0] ??
      err.data?.message ??
      err.message
    saveError.value = msg || 'Failed to update inbound route'
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
    await getApiClient().delete(`inboundroutes/${encodeURIComponent(pkey.value)}`)
    toast.show(`Inbound route ${pkey.value} deleted`)
    router.push({ name: 'inbound-routes' })
  } catch (err) {
    deleteError.value = err.data?.message ?? err.message ?? 'Failed to delete inbound route'
  } finally {
    deleting.value = false
    confirmDeleteOpen.value = false
  }
}

/** Identity section: pkey, shortuid, id, description. */
const identityFields = computed(() => {
  if (!inboundRoute.value) return []
  const r = inboundRoute.value
  return [
    { label: 'DiD/CLiD', value: r.pkey ?? '—', immutable: true },
    { label: 'Local UID', value: r.shortuid ?? '—', immutable: true },
    { label: 'KSUID', value: r.id ?? '—', immutable: true },
    { label: 'description', value: r.description ?? r.desc ?? '—', immutable: false }
  ]
})

/** Settings section: all API-updateable fields besides Identity. */
const settingsFields = computed(() => {
  if (!inboundRoute.value) return []
  const r = inboundRoute.value
  return [
    { label: 'Tenant', value: tenantPkeyDisplay(r.cluster) },
    { label: 'Name', value: r.trunkname ?? '—' },
    { label: 'Active?', value: r.active ?? '—' },
    { label: 'Open route', value: r.openroute ?? '—' },
    { label: 'Close route', value: r.closeroute ?? '—' },
    { label: 'Alert info', value: r.alertinfo ?? '—' },
    { label: 'MOH', value: r.moh ?? '—' },
    { label: 'SWOCLIP', value: r.swoclip ?? '—' },
    { label: 'DISA', value: r.disa ?? '—' },
    { label: 'DISA pass', value: r.disapass ? '••••••' : '—' },
    { label: 'In prefix', value: r.inprefix != null ? String(r.inprefix) : '—' },
    { label: 'Tag', value: r.tag ?? '—' }
  ]
})

const ADVANCED_EXCLUDE = new Set([
  'id', 'pkey', 'shortuid', 'description', 'desc', 'cluster', 'tenant_pkey', 'carrier', 'trunkname', 'active',
  'openroute', 'closeroute', 'alertinfo', 'moh', 'swoclip', 'disa', 'disapass', 'inprefix', 'tag'
])
const otherFields = computed(() => {
  if (!inboundRoute.value || typeof inboundRoute.value !== 'object') return []
  return Object.entries(inboundRoute.value)
    .filter(([k]) => !ADVANCED_EXCLUDE.has(k))
    .sort(([a], [b]) => a.localeCompare(b))
})
</script>

<template>
  <div>
    <p class="back">
      <button type="button" class="back-btn" @click="goBack">← Inbound routes</button>
    </p>
    <h1>Inbound route: {{ pkey }}</h1>

    <p v-if="loading" class="loading">Loading…</p>
    <p v-else-if="error" class="error">{{ error }}</p>
    <template v-else-if="inboundRoute">
      <div class="detail-content">
        <p v-if="!editing" class="toolbar">
          <button type="button" class="edit-btn" @click="startEdit">Edit</button>
          <button
            type="button"
            class="delete-btn"
            :disabled="deleting"
            @click="askConfirmDelete"
          >
            {{ deleting ? 'Deleting…' : 'Delete inbound route' }}
          </button>
        </p>
        <p v-if="deleteError" class="error">{{ deleteError }}</p>
        <form v-else-if="editing" class="edit-form" @submit="saveEdit">
          <h2 class="detail-heading">Identity</h2>
          <label>DiD/CLiD</label>
          <p class="detail-readonly value-immutable" title="Immutable">{{ inboundRoute.pkey ?? '—' }}</p>
          <label>Local UID</label>
          <p class="detail-readonly value-immutable" title="Immutable">{{ inboundRoute.shortuid ?? '—' }}</p>
          <label>KSUID</label>
          <p class="detail-readonly value-immutable" title="Immutable">{{ inboundRoute.id ?? '—' }}</p>
          <label for="edit-description">description</label>
          <input id="edit-description" v-model="editDescription" type="text" class="edit-input" />
          <h2 class="detail-heading">Settings</h2>
          <label for="edit-tenant">Tenant</label>
          <select id="edit-tenant" v-model="editCluster" class="edit-input" required>
            <option v-for="opt in tenantOptionsForSelect" :key="opt" :value="opt">{{ opt }}</option>
          </select>
          <label for="edit-trunkname">Name</label>
          <input id="edit-trunkname" v-model="editTrunkname" type="text" class="edit-input" placeholder="Trunk name" />
          <label class="edit-label-block">Active?</label>
          <div class="switch-toggle switch-ios">
            <input id="edit-active-yes" type="radio" value="YES" v-model="editActive" />
            <label for="edit-active-yes">YES</label>
            <input id="edit-active-no" type="radio" value="NO" v-model="editActive" />
            <label for="edit-active-no">NO</label>
          </div>
          <label for="edit-openroute">Open route</label>
          <select id="edit-openroute" v-model="editOpenroute" class="edit-input" aria-label="Open route destination">
            <option value="None">None</option>
            <option value="Operator">Operator</option>
            <template v-for="(pkeys, group) in destinationGroups" :key="group">
              <optgroup v-if="pkeys.length" :label="group">
                <option v-for="p in pkeys" :key="p" :value="p">{{ p }}</option>
              </optgroup>
            </template>
          </select>
          <span v-if="destinationsLoading" class="hint">Loading…</span>
          <label for="edit-closeroute">Close route</label>
          <select id="edit-closeroute" v-model="editCloseroute" class="edit-input" aria-label="Closed route destination">
            <option value="None">None</option>
            <option value="Operator">Operator</option>
            <template v-for="(pkeys, group) in destinationGroups" :key="group">
              <optgroup v-if="pkeys.length" :label="group">
                <option v-for="p in pkeys" :key="p" :value="p">{{ p }}</option>
              </optgroup>
            </template>
          </select>
          <label for="edit-alertinfo">Alert info</label>
          <input id="edit-alertinfo" v-model="editAlertinfo" type="text" class="edit-input" />
          <label class="edit-label-block">MOH</label>
          <div class="switch-toggle switch-ios">
            <input id="edit-moh-on" type="radio" value="ON" v-model="editMoh" />
            <label for="edit-moh-on">ON</label>
            <input id="edit-moh-off" type="radio" value="OFF" v-model="editMoh" />
            <label for="edit-moh-off">OFF</label>
          </div>
          <label class="edit-label-block">SWOCLIP</label>
          <div class="switch-toggle switch-ios">
            <input id="edit-swoclip-yes" type="radio" value="YES" v-model="editSwoclip" />
            <label for="edit-swoclip-yes">YES</label>
            <input id="edit-swoclip-no" type="radio" value="NO" v-model="editSwoclip" />
            <label for="edit-swoclip-no">NO</label>
          </div>
          <label for="edit-disa">DISA</label>
          <select id="edit-disa" v-model="editDisa" class="edit-input">
            <option value="">—</option>
            <option value="DISA">DISA</option>
            <option value="CALLBACK">CALLBACK</option>
          </select>
          <label for="edit-disapass">DISA pass</label>
          <input id="edit-disapass" v-model="editDisapass" type="text" class="edit-input" autocomplete="off" />
          <label for="edit-inprefix">In prefix</label>
          <input id="edit-inprefix" v-model="editInprefix" type="number" class="edit-input" placeholder="integer" min="0" step="1" />
          <label for="edit-tag">Tag</label>
          <input id="edit-tag" v-model="editTag" type="text" class="edit-input" />
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
      title="Delete inbound route?"
      :loading="deleting"
      @confirm="confirmAndDelete"
      @cancel="cancelConfirmDelete"
    >
      <template #body>
        <p>Inbound route <strong>{{ pkey }}</strong> will be permanently deleted. This cannot be undone.</p>
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
