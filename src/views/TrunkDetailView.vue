<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useToastStore } from '@/stores/toast'
import DeleteConfirmModal from '@/components/DeleteConfirmModal.vue'

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
const editUsername = ref('')
const editPeername = ref('')
const editTrunkname = ref('')
const editPassword = ref('')
const editMoh = ref('OFF')
const editCallprogress = ref('OFF')
const editSwoclip = ref('YES')
const editAlertinfo = ref('')
const editCallerid = ref('')
const editInprefix = ref('')
const editMatch = ref('')
const editRegister = ref('')
const editTag = ref('')
const editDevicerec = ref('')
const editDisa = ref('')
const editDisapass = ref('')
const editTransform = ref('')
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
  return clusterToTenantPkey.value.get(s) ?? trunk.value?.tenant_pkey ?? s
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
    editUsername.value = trunk.value?.username ?? ''
    editPeername.value = trunk.value?.peername ?? ''
    editTrunkname.value = trunk.value?.trunkname ?? ''
    editPassword.value = '' // never re-fill password
    editMoh.value = trunk.value?.moh ?? 'OFF'
    editCallprogress.value = trunk.value?.callprogress ?? 'OFF'
    editSwoclip.value = trunk.value?.swoclip ?? 'YES'
    editAlertinfo.value = trunk.value?.alertinfo ?? ''
    editCallerid.value = trunk.value?.callerid ?? ''
    editInprefix.value = trunk.value?.inprefix ?? ''
    editMatch.value = trunk.value?.match ?? ''
    editRegister.value = trunk.value?.register ?? ''
    editTag.value = trunk.value?.tag ?? ''
    editDevicerec.value = trunk.value?.devicerec ?? ''
    editDisa.value = trunk.value?.disa ?? ''
    editDisapass.value = trunk.value?.disapass ?? ''
    editTransform.value = trunk.value?.transform ?? ''
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
  editUsername.value = trunk.value?.username ?? ''
  editPeername.value = trunk.value?.peername ?? ''
  editTrunkname.value = trunk.value?.trunkname ?? ''
  editMoh.value = trunk.value?.moh ?? 'OFF'
  editCallprogress.value = trunk.value?.callprogress ?? 'OFF'
  editSwoclip.value = trunk.value?.swoclip ?? 'YES'
  editAlertinfo.value = trunk.value?.alertinfo ?? ''
  editCallerid.value = trunk.value?.callerid ?? ''
  editInprefix.value = trunk.value?.inprefix ?? ''
  editMatch.value = trunk.value?.match ?? ''
  editRegister.value = trunk.value?.register ?? ''
  editTag.value = trunk.value?.tag ?? ''
  editDevicerec.value = trunk.value?.devicerec ?? ''
  editDisa.value = trunk.value?.disa ?? ''
  editDisapass.value = trunk.value?.disapass ?? ''
  editTransform.value = trunk.value?.transform ?? ''
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
    const body = {
      description: editDescription.value.trim() || undefined,
      active: editActive.value,
      cluster: editCluster.value.trim(),
      host: editHost.value.trim(),
      username: editUsername.value.trim() || undefined,
      peername: editPeername.value.trim() || undefined,
      trunkname: editTrunkname.value.trim() || undefined,
      moh: editMoh.value,
      callprogress: editCallprogress.value,
      swoclip: editSwoclip.value,
      alertinfo: editAlertinfo.value.trim() || undefined,
      callerid: editCallerid.value.trim() || undefined,
      inprefix: editInprefix.value.trim() || undefined,
      match: editMatch.value.trim() || undefined,
      register: editRegister.value.trim() || undefined,
      tag: editTag.value.trim() || undefined,
      devicerec: editDevicerec.value.trim() || undefined,
      disa: editDisa.value.trim() || undefined,
      disapass: editDisapass.value.trim() || undefined,
      transform: editTransform.value.trim() || undefined
    }
    if (editPassword.value.trim()) body.password = editPassword.value.trim()
    await getApiClient().put(`trunks/${encodeURIComponent(pkey.value)}`, body)
    await fetchTrunk()
    editing.value = false
    toast.show(`Trunk ${pkey.value} saved`)
  } catch (err) {
    const data = err?.data
const msg =
        (data && typeof data === 'object' && Object.values(data).flat().find(Boolean)) ||
        (data?.message ?? err.message)
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

/** Identity section: immutable fields grouped first, then editable. */
const identityFields = computed(() => {
  if (!trunk.value) return []
  const t = trunk.value
  return [
    { label: 'name', value: t.pkey ?? '—', immutable: true },
    { label: 'Local UID', value: t.shortuid ?? '—', immutable: true },
    { label: 'KSUID', value: t.id ?? '—', immutable: true },
    { label: 'description', value: t.description ?? '—', immutable: false }
  ]
})

/** Settings section: transport/connection and main config */
const settingsFields = computed(() => {
  if (!trunk.value) return []
  const t = trunk.value
  return [
    { label: 'Tenant', value: tenantPkeyDisplay(t.cluster) },
    { label: 'Active?', value: t.active ?? '—' },
    { label: 'host', value: t.host ?? '—' },
    { label: 'username', value: t.username ?? '—' },
    { label: 'peername', value: t.peername ?? '—' },
    { label: 'trunkname', value: t.trunkname ?? '—' },
    { label: 'password', value: t.password ? '••••••' : '—' },
    { label: 'moh', value: t.moh ?? '—' },
    { label: 'callprogress', value: t.callprogress ?? '—' },
    { label: 'swoclip', value: t.swoclip ?? '—' },
    { label: 'technology', value: t.technology ?? '—' },
    { label: 'transport', value: t.transport ?? '—' }
  ]
})

const ADVANCED_EXCLUDE = new Set([
  'id', 'pkey', 'shortuid', 'description', 'cluster', 'tenant_pkey', 'active', 'host',
  'username', 'peername', 'trunkname', 'password', 'moh', 'callprogress', 'swoclip', 'technology', 'transport'
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
          <h2 class="detail-heading">Identity</h2>
          <label>name</label>
          <p class="detail-readonly value-immutable" title="Immutable">{{ trunk.pkey ?? '—' }}</p>
          <label>Local UID</label>
          <p class="detail-readonly value-immutable" title="Immutable">{{ trunk.shortuid ?? '—' }}</p>
          <label>KSUID</label>
          <p class="detail-readonly value-immutable" title="Immutable">{{ trunk.id ?? '—' }}</p>
          <label for="edit-description">description</label>
          <input id="edit-description" v-model="editDescription" type="text" class="edit-input" />
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
          <label for="edit-host">host</label>
          <input id="edit-host" v-model="editHost" type="text" class="edit-input" required />
          <label for="edit-username">username</label>
          <input id="edit-username" v-model="editUsername" type="text" class="edit-input" autocomplete="off" />
          <label for="edit-peername">peername</label>
          <input id="edit-peername" v-model="editPeername" type="text" class="edit-input" autocomplete="off" />
          <label for="edit-trunkname">trunkname</label>
          <input id="edit-trunkname" v-model="editTrunkname" type="text" class="edit-input" autocomplete="off" />
          <label for="edit-password">password</label>
          <input id="edit-password" v-model="editPassword" type="password" class="edit-input" placeholder="Leave blank to keep current" autocomplete="new-password" />
          <label class="edit-label-block">moh</label>
          <div class="switch-toggle switch-ios">
            <input id="edit-moh-on" type="radio" value="ON" v-model="editMoh" />
            <label for="edit-moh-on">ON</label>
            <input id="edit-moh-off" type="radio" value="OFF" v-model="editMoh" />
            <label for="edit-moh-off">OFF</label>
          </div>
          <label class="edit-label-block">callprogress</label>
          <div class="switch-toggle switch-ios">
            <input id="edit-callprogress-on" type="radio" value="ON" v-model="editCallprogress" />
            <label for="edit-callprogress-on">ON</label>
            <input id="edit-callprogress-off" type="radio" value="OFF" v-model="editCallprogress" />
            <label for="edit-callprogress-off">OFF</label>
          </div>
          <label class="edit-label-block">swoclip</label>
          <div class="switch-toggle switch-ios">
            <input id="edit-swoclip-yes" type="radio" value="YES" v-model="editSwoclip" />
            <label for="edit-swoclip-yes">YES</label>
            <input id="edit-swoclip-no" type="radio" value="NO" v-model="editSwoclip" />
            <label for="edit-swoclip-no">NO</label>
          </div>
          <h2 class="detail-heading">Advanced</h2>
          <label for="edit-alertinfo">alertinfo</label>
          <input id="edit-alertinfo" v-model="editAlertinfo" type="text" class="edit-input" autocomplete="off" />
          <label for="edit-callerid">callerid</label>
          <input id="edit-callerid" v-model="editCallerid" type="text" class="edit-input" autocomplete="off" />
          <label for="edit-inprefix">inprefix</label>
          <input id="edit-inprefix" v-model="editInprefix" type="text" class="edit-input" autocomplete="off" />
          <label for="edit-match">match</label>
          <input id="edit-match" v-model="editMatch" type="text" class="edit-input" autocomplete="off" />
          <label for="edit-register">register</label>
          <input id="edit-register" v-model="editRegister" type="text" class="edit-input" autocomplete="off" />
          <label for="edit-tag">tag</label>
          <input id="edit-tag" v-model="editTag" type="text" class="edit-input" autocomplete="off" />
          <label for="edit-devicerec">devicerec</label>
          <input id="edit-devicerec" v-model="editDevicerec" type="text" class="edit-input" placeholder="None, OTR, OTRR, Inbound.Outbound, Both" autocomplete="off" />
          <label for="edit-disa">disa</label>
          <input id="edit-disa" v-model="editDisa" type="text" class="edit-input" placeholder="DISA, CALLBACK" autocomplete="off" />
          <label for="edit-disapass">disapass</label>
          <input id="edit-disapass" v-model="editDisapass" type="text" class="edit-input" autocomplete="off" />
          <label for="edit-transform">transform</label>
          <input id="edit-transform" v-model="editTransform" type="text" class="edit-input" autocomplete="off" />
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
      title="Delete trunk?"
      :loading="deleting"
      @confirm="confirmAndDelete"
      @cancel="cancelConfirmDelete"
    >
      <template #body>
        <p>Trunk <strong>{{ pkey }}</strong> will be permanently deleted. This cannot be undone.</p>
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
.detail-readonly {
  margin: 0 0 0.5rem 0;
  font-size: 0.9375rem;
  color: #64748b;
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
