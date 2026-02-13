<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useToastStore } from '@/stores/toast'
import { normalizeList } from '@/utils/listResponse'
import { firstErrorMessage } from '@/utils/formErrors'
import FormField from '@/components/forms/FormField.vue'
import FormSelect from '@/components/forms/FormSelect.vue'
import FormToggle from '@/components/forms/FormToggle.vue'
import FormReadonly from '@/components/forms/FormReadonly.vue'
import DeleteConfirmModal from '@/components/DeleteConfirmModal.vue'

const route = useRoute()
const router = useRouter()
const toast = useToastStore()
const extension = ref(null)
const tenants = ref([])
const runtime = ref(null)
const runtimeError = ref('')
const loading = ref(true)
const error = ref('')
const editCluster = ref('')
const editDesc = ref('')
const editActive = ref('YES')
const editTransport = ref('udp')
const editCallbackto = ref('desk')
const editCallerid = ref('')
const editCellphone = ref('')
const editCelltwin = ref('OFF')
const editDevicerec = ref('None')
const editDvrvmail = ref('')
const editProtocol = ref('IPV4')
const editVmailfwd = ref('')
const saveError = ref('')
const saving = ref(false)
const deleteError = ref('')
const deleting = ref(false)
const confirmDeleteOpen = ref(false)
const editingRuntime = ref(false)
const editCfim = ref('')
const editCfbs = ref('')
const editRingdelay = ref('')
const runtimeSaveError = ref('')
const runtimeSaving = ref(false)

const shortuid = computed(() => route.params.shortuid)

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
  return clusterToTenantPkey.value.get(s) ?? extension.value?.tenant_pkey ?? s
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
    tenants.value = normalizeList(response, 'tenants')
  } catch {
    tenants.value = []
  }
}

async function fetchExtension() {
  if (!shortuid.value) return
  loading.value = true
  error.value = ''
  runtime.value = null
  runtimeError.value = ''
  try {
    extension.value = await getApiClient().get(`extensions/${encodeURIComponent(shortuid.value)}`)
    const ext = extension.value
    const tenantPkey = ext?.tenant_pkey ?? tenantPkeyDisplay(ext?.cluster)
    editCluster.value = tenantPkey ?? 'default'
    editDesc.value = ext?.desc ?? ext?.description ?? ''
    editActive.value = ext?.active ?? 'YES'
    editTransport.value = ext?.transport ?? 'udp'
    editCallbackto.value = ext?.callbackto ?? 'desk'
    editCallerid.value = ext?.callerid != null ? String(ext.callerid) : ''
    editCellphone.value = ext?.cellphone != null ? String(ext.cellphone) : ''
    editCelltwin.value = ext?.celltwin ?? 'OFF'
    editDevicerec.value = ext?.devicerec ?? 'None'
    editDvrvmail.value = ext?.dvrvmail ?? ''
    editProtocol.value = ext?.protocol ?? 'IPV4'
    editVmailfwd.value = ext?.vmailfwd ?? ''
  } catch (err) {
    error.value = firstErrorMessage(err, 'Failed to load extension')
    extension.value = null
  } finally {
    loading.value = false
  }
}

async function fetchRuntime() {
  if (!shortuid.value) return
  runtimeError.value = ''
  try {
    runtime.value = await getApiClient().get(`extensions/${encodeURIComponent(shortuid.value)}/runtime`)
    editCfim.value = runtime.value?.cfim ?? ''
    editCfbs.value = runtime.value?.cfbs ?? ''
    editRingdelay.value = runtime.value?.ringdelay != null ? String(runtime.value.ringdelay) : ''
  } catch (err) {
    runtimeError.value = firstErrorMessage(err, 'Runtime unavailable')
    runtime.value = null
  }
}

onMounted(() => {
  fetchTenants().then(() => fetchExtension().then(() => fetchRuntime()))
})
watch(shortuid, () => {
  fetchExtension().then(() => fetchRuntime())
})

function goBack() {
  router.push({ name: 'extensions' })
}

function cancelEdit() {
  goBack()
}

function onKeydown(e) {
  if (e.key === 'Escape') {
    e.preventDefault()
    goBack()
  }
}

async function saveEdit(e) {
  e.preventDefault()
  saveError.value = ''
  saving.value = true
  try {
    const body = {
      pkey: extension.value?.pkey,
      cluster: editCluster.value.trim(),
      device: extension.value?.device ?? 'MAILBOX',
      desc: editDesc.value.trim() || undefined,
      active: editActive.value,
      transport: editTransport.value,
      callbackto: editCallbackto.value,
      callerid: editCallerid.value.trim() ? parseInt(editCallerid.value, 10) : undefined,
      cellphone: editCellphone.value.trim() ? parseInt(editCellphone.value, 10) : undefined,
      celltwin: editCelltwin.value,
      devicerec: editDevicerec.value,
      dvrvmail: editDvrvmail.value.trim() || undefined,
      protocol: editProtocol.value,
      vmailfwd: editVmailfwd.value.trim() || undefined
    }
    await getApiClient().put(`extensions/${encodeURIComponent(shortuid.value)}`, body)
    await fetchExtension()
    toast.show(`Extension saved`)
  } catch (err) {
    saveError.value = firstErrorMessage(err, 'Failed to update extension')
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
    await getApiClient().delete(`extensions/${encodeURIComponent(shortuid.value)}`)
    toast.show(`Extension deleted`)
    router.push({ name: 'extensions' })
  } catch (err) {
    deleteError.value = firstErrorMessage(err, 'Failed to delete extension')
  } finally {
    deleting.value = false
    confirmDeleteOpen.value = false
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
    await getApiClient().put(`extensions/${encodeURIComponent(shortuid.value)}/runtime`, {
      cfim: editCfim.value.trim() || null,
      cfbs: editCfbs.value.trim() || null,
      ringdelay: editRingdelay.value === '' ? null : parseInt(editRingdelay.value, 10)
    })
    await fetchRuntime()
    editingRuntime.value = false
    toast.show('Runtime settings saved')
  } catch (err) {
    runtimeSaveError.value = firstErrorMessage(err, 'Failed to update runtime')
  } finally {
    runtimeSaving.value = false
  }
}
</script>

<template>
  <div class="detail-view" @keydown="onKeydown">
    <h1>Edit Extension {{ pkey }}</h1>

    <p v-if="loading" class="loading">Loading…</p>
    <p v-else-if="error" class="error">{{ error }}</p>
    <template v-else-if="extension">
      <div class="detail-content">
        <p v-if="deleteError" class="error">{{ deleteError }}</p>

        <form class="edit-form" @submit="saveEdit">
          <p v-if="saveError" id="extension-edit-error" class="error" role="alert">{{ saveError }}</p>

          <div class="edit-actions edit-actions-top">
            <button type="submit" :disabled="saving">{{ saving ? 'Saving…' : 'Save' }}</button>
            <button type="button" class="secondary" @click="cancelEdit">Cancel</button>
            <button
              type="button"
              class="action-delete"
              :disabled="deleting"
              @click="askConfirmDelete"
            >
              {{ deleting ? 'Deleting…' : 'Delete' }}
            </button>
          </div>

          <h2 class="detail-heading">Identity</h2>
          <div class="form-fields">
            <FormReadonly id="edit-identity-pkey" label="Ext" :value="extension.pkey ?? '—'" class="readonly-identity" />
            <FormReadonly id="edit-identity-shortuid" label="SIP Identity" :value="extension.shortuid ?? '—'" class="readonly-identity" />
            <FormReadonly id="edit-identity-id" label="KSUID" :value="extension.id ?? '—'" class="readonly-identity" />
            <FormReadonly id="edit-identity-macaddr" label="MAC address" :value="extension.macaddr?.trim() || 'Unknown'" class="readonly-identity" />
            <FormReadonly id="edit-identity-device" label="Device" :value="extension.device ?? '—'" class="readonly-identity" />
            <FormSelect
              id="edit-cluster"
              v-model="editCluster"
              label="Tenant"
              :options="tenantOptionsForSelect"
              :required="true"
            />
            <FormField
              id="edit-desc"
              v-model="editDesc"
              label="User (extension name)"
              type="text"
              placeholder="e.g. John Doe"
            />
            <FormToggle
              id="edit-active"
              v-model="editActive"
              label="Active?"
              yes-value="YES"
              no-value="NO"
            />
          </div>

          <h2 class="detail-heading">Transport</h2>
          <div class="form-fields">
            <FormSelect
              id="edit-transport"
              v-model="editTransport"
              label="Transport"
              :options="['udp', 'tcp', 'tls', 'wss']"
              hint="SIP transport."
            />
          </div>

          <h2 class="detail-heading">Advanced</h2>
          <div class="form-fields">
            <FormSelect
              id="edit-callbackto"
              v-model="editCallbackto"
              label="Callback to"
              :options="['desk', 'cell']"
            />
            <FormField id="edit-callerid" v-model="editCallerid" label="Caller ID" type="text" inputmode="numeric" />
            <FormField id="edit-cellphone" v-model="editCellphone" label="Cell phone" type="text" inputmode="numeric" />
            <FormToggle
              id="edit-celltwin"
              v-model="editCelltwin"
              label="Cell twin"
              yes-value="ON"
              no-value="OFF"
            />
            <FormSelect
              id="edit-devicerec"
              v-model="editDevicerec"
              label="Devicerec"
              :options="['default', 'None', 'OTR', 'OTRR', 'Inbound', 'Outbound', 'Both']"
            />
            <FormField id="edit-dvrvmail" v-model="editDvrvmail" label="DVR voicemail" type="text" />
            <FormSelect
              id="edit-protocol"
              v-model="editProtocol"
              label="Protocol"
              :options="['IPV4', 'IPV6']"
            />
            <FormField id="edit-vmailfwd" v-model="editVmailfwd" label="Voicemail forward (email)" type="email" />
          </div>

          <div class="edit-actions">
            <button type="submit" :disabled="saving">{{ saving ? 'Saving…' : 'Save' }}</button>
            <button type="button" class="secondary" @click="cancelEdit">Cancel</button>
            <button
              type="button"
              class="action-delete"
              :disabled="deleting"
              @click="askConfirmDelete"
            >
              {{ deleting ? 'Deleting…' : 'Delete' }}
            </button>
          </div>
        </form>

        <section class="detail-section">
          <h2 class="detail-heading">Runtime</h2>
          <p v-if="runtimeError" class="error">{{ runtimeError }}</p>
          <p v-else-if="!runtime" class="muted">Runtime params appear after Asterisk config is regenerated.</p>
          <template v-else-if="runtime">
            <p v-if="!editingRuntime" class="toolbar">
              <button type="button" class="edit-btn" @click="startEditRuntime">Edit runtime</button>
            </p>
            <form v-else class="edit-form runtime-form" @submit="saveRuntime">
              <FormField
                id="edit-cfim"
                v-model="editCfim"
                label="cfim (call forward no answer)"
                type="text"
                placeholder="e.g. +1234567890"
              />
              <FormField
                id="edit-cfbs"
                v-model="editCfbs"
                label="cfbs (call forward busy)"
                type="text"
                placeholder="e.g. +1234567890"
              />
              <FormField
                id="edit-ringdelay"
                v-model="editRingdelay"
                label="ringdelay (seconds)"
                type="number"
                placeholder="0"
              />
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
      </div>
    </template>

    <DeleteConfirmModal
      :show="confirmDeleteOpen"
      title="Delete extension?"
      :loading="deleting"
      @confirm="confirmAndDelete"
      @cancel="cancelConfirmDelete"
    >
      <template #body>
        <p>Extension <strong>{{ pkey }}</strong> will be permanently deleted. This cannot be undone.</p>
      </template>
    </DeleteConfirmModal>
  </div>
</template>

<style scoped>
.detail-view {
  max-width: 52rem;
}
.loading,
.error {
  margin-top: 1rem;
}
.error {
  color: #dc2626;
}
.muted {
  color: #64748b;
  font-size: 0.875rem;
  margin: 0;
}
.detail-content {
  margin-top: 1rem;
}
.detail-heading {
  font-size: 1rem;
  font-weight: 600;
  color: #334155;
  margin: 1.5rem 0 0.5rem 0;
}
.detail-heading:first-of-type {
  margin-top: 0;
}
.form-fields {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin-top: 0.5rem;
}
.readonly-identity :deep(.form-field-label),
.readonly-identity :deep(.form-readonly) {
  color: #94a3b8;
}
.readonly-identity :deep(.form-readonly) {
  background-color: #f1f5f9;
  border-color: #e2e8f0;
}
.edit-form {
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.edit-form.runtime-form {
  margin-top: 0.5rem;
}
.detail-list {
  margin-top: 0.5rem;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.25rem 2rem;
  font-size: 0.9375rem;
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
.edit-actions button.action-delete {
  color: #fff;
  background: #dc2626;
  border: none;
}
.edit-actions button.action-delete:hover:not(:disabled) {
  background: #b91c1c;
}
.edit-actions button.action-delete:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
</style>
