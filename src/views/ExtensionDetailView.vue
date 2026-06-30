<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useSchema } from '@/composables/useSchema'
import { useToastStore } from '@/stores/toast'
import { normalizeList } from '@/utils/listResponse'
import { firstErrorMessage } from '@/utils/formErrors'
import FormField from '@/components/forms/FormField.vue'
import FormSelect from '@/components/forms/FormSelect.vue'
import FormSegmentedPill from '@/components/forms/FormSegmentedPill.vue'
import FormToggle from '@/components/forms/FormToggle.vue'
import FormReadonly from '@/components/forms/FormReadonly.vue'
import DeleteConfirmModal from '@/components/DeleteConfirmModal.vue'
import PanelBackLink from '@/components/PanelBackLink.vue'
import DetailActiveStatusBar from '@/components/DetailActiveStatusBar.vue'
const route = useRoute()
const { getSchema, ensureFetched } = useSchema()

/** True if field is read-only per schema (extensions). */
function isReadOnly(field) {
  return getSchema('extensions')?.read_only?.includes(field) ?? false
}
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
const editCname = ref('')
const editDescription = ref('')
const editCallmax = ref('')
const editActive = ref('YES')
const editTransport = ref('udp')
const editCallbackto = ref('desk')
const editCallerid = ref('')
const editCellphone = ref('')
const editCelltwin = ref('OFF')
const editDevicerec = ref('None')
const editDvrvmail = ref('')
const editExtalert = ref('')
const editMacaddr = ref('')
const editProtocol = ref('IPV4')
const editProvision = ref('')
const editProvisionwith = ref('IP')
const editTechnology = ref('SIP')
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
const confirmRegenerateSipOpen = ref(false)
const regeneratingSip = ref(false)
const regenerateSipError = ref('')

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
  if (cur && !list.includes(cur))
    return [cur, ...list].sort((a, b) => String(a).localeCompare(String(b)))
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
    editCname.value = ext?.cname ?? ''
    editDescription.value = ext?.description ?? ''
    editCallmax.value = ext?.callmax != null && ext?.callmax !== '' ? String(ext.callmax) : ''
    editActive.value = ext?.active ?? 'YES'
    editTransport.value = ext?.transport ?? 'udp'
    editCallbackto.value = ext?.callbackto ?? 'desk'
    editCallerid.value = ext?.callerid != null ? String(ext.callerid) : ''
    editCellphone.value = ext?.cellphone != null ? String(ext.cellphone) : ''
    editCelltwin.value = ext?.celltwin ?? 'OFF'
    const rawDevicerec = ext?.devicerec
    editDevicerec.value =
      rawDevicerec === 'OTR' || rawDevicerec === 'OTRR' ? 'Both' : (rawDevicerec ?? 'None')
    editDvrvmail.value = ext?.dvrvmail ?? ''
    editExtalert.value = ext?.extalert ?? ''
    editMacaddr.value = ext?.macaddr != null ? String(ext.macaddr).trim() : ''
    editProtocol.value = ext?.protocol ?? 'IPV4'
    editProvision.value = ext?.provision ?? ''
    editProvisionwith.value = ext?.provisionwith === 'FQDN' ? 'FQDN' : 'IP'
    editTechnology.value = ext?.technology ?? 'SIP'
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
    runtime.value = await getApiClient().get(
      `extensions/${encodeURIComponent(shortuid.value)}/runtime`
    )
    editCfim.value = runtime.value?.cfim ?? ''
    editCfbs.value = runtime.value?.cfbs ?? ''
    editRingdelay.value = runtime.value?.ringdelay != null ? String(runtime.value.ringdelay) : ''
  } catch (err) {
    runtimeError.value = firstErrorMessage(err, 'Runtime unavailable')
    runtime.value = null
  }
}

onMounted(async () => {
  await ensureFetched()
  await fetchTenants()
  await fetchExtension()
  if (extension.value) await fetchRuntime()
})
watch(shortuid, () => {
  fetchExtension().then(() => {
    if (extension.value) fetchRuntime()
  })
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
      device: extension.value?.device ?? 'General SIP',
      desc: editDesc.value.trim() || undefined,
      cname: editCname.value.trim() || undefined,
      description: editDescription.value.trim() || undefined,
      callmax: editCallmax.value.trim() ? parseInt(editCallmax.value, 10) : undefined,
      active: editActive.value,
      transport: editTransport.value,
      callbackto: editCallbackto.value,
      callerid: editCallerid.value.trim() || undefined,
      cellphone: editCellphone.value.trim() || undefined,
      celltwin: editCelltwin.value,
      devicerec: editDevicerec.value,
      dvrvmail: editDvrvmail.value.trim() || undefined,
      extalert: editExtalert.value.trim() || undefined,
      macaddr: editMacaddr.value.trim()
        ? editMacaddr.value.trim().replace(/[^0-9a-fA-F]/g, '')
        : null,
      protocol: editProtocol.value,
      provision: editProvision.value.trim() || undefined,
      provisionwith: editProvisionwith.value,
      technology: editTechnology.value || undefined,
      vmailfwd: editVmailfwd.value.trim() || undefined
    }
    if (body.callmax !== undefined && Number.isNaN(body.callmax)) delete body.callmax
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

function openRegenerateSipModal() {
  regenerateSipError.value = ''
  confirmRegenerateSipOpen.value = true
}

function cancelRegenerateSip() {
  if (regeneratingSip.value) return
  confirmRegenerateSipOpen.value = false
}

async function confirmRegenerateSip() {
  regenerateSipError.value = ''
  regeneratingSip.value = true
  try {
    const data = await getApiClient().post(
      `extensions/${encodeURIComponent(shortuid.value)}/regenerate-sip-password`,
      {}
    )
    if (extension.value && data && typeof data === 'object') {
      Object.assign(extension.value, data)
    }
    confirmRegenerateSipOpen.value = false
    toast.show(
      'SIP password regenerated. Copy the new value into the phone before it can register again.'
    )
  } catch (err) {
    regenerateSipError.value = firstErrorMessage(err, 'Failed to regenerate SIP password')
  } finally {
    regeneratingSip.value = false
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

const panelTitleTenantSuffix = computed(() => {
  if (!extension.value) return ''
  const t = String(editCluster.value ?? '').trim()
  if (!t) return ''
  return ` (${t})`
})
</script>

<template>
  <div class="detail-view" @keydown="onKeydown">
    <PanelBackLink :to="{ name: 'extensions' }" label="Extensions">
      <div class="detail-panel-head">
        <div class="detail-title-status-row">
          <h1 class="detail-panel-title">
            Edit Extension {{ extension?.pkey ?? '…' }}{{ panelTitleTenantSuffix }}
          </h1>
          <DetailActiveStatusBar
            v-if="extension"
            v-model="editActive"
            toggle-id="edit-extension-active"
          />
        </div>
        <p
          v-if="extension && editActive === 'NO'"
          class="detail-active-inactive-hint"
          role="status"
        >
          Inactive extensions do not take calls until you activate this record and commit the
          change.
        </p>
      </div>
    </PanelBackLink>

    <p v-if="loading" class="loading">Loading…</p>
    <div v-else-if="error" class="error-state">
      <p class="error">{{ error }}</p>
      <div class="error-actions">
        <button type="button" class="btn secondary" @click="goBack">Back to extensions</button>
        <button
          type="button"
          class="btn btn-primary"
          @click="() => fetchExtension().then(() => extension.value && fetchRuntime())"
        >
          Retry
        </button>
      </div>
    </div>
    <template v-else-if="extension">
      <div class="detail-content">
        <p v-if="deleteError" class="error">{{ deleteError }}</p>

        <form class="edit-form" @submit="saveEdit">
          <p v-if="saveError" id="extension-edit-error" class="error" role="alert">
            {{ saveError }}
          </p>

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
            <FormReadonly
              v-if="isReadOnly('shortuid')"
              id="edit-identity-shortuid"
              label="UID"
              :value="extension.shortuid ?? '—'"
              class="readonly-identity"
            />
            <FormField
              v-else
              id="edit-identity-shortuid"
              :model-value="extension.shortuid ?? '—'"
              label="UID"
              disabled
              class="readonly-identity"
            />
            <FormReadonly
              v-if="isReadOnly('id')"
              id="edit-identity-id"
              label="KSUID"
              :value="extension.id ?? '—'"
              class="readonly-identity"
            />
            <FormField
              v-else
              id="edit-identity-id"
              :model-value="extension.id ?? '—'"
              label="KSUID"
              disabled
              class="readonly-identity"
            />
            <FormReadonly
              v-if="isReadOnly('pkey')"
              id="edit-identity-pkey"
              label="Ext Dial"
              help-pkey="blkstart"
              :value="extension.pkey ?? '—'"
              class="readonly-identity"
            />
            <FormField
              v-else
              id="edit-identity-pkey"
              :model-value="extension.pkey ?? '—'"
              label="Ext Dial"
              help-pkey="blkstart"
              disabled
              class="readonly-identity"
            />
            <FormReadonly
              v-if="isReadOnly('shortuid')"
              id="edit-identity-sip-user"
              label="SIP User"
              help-pkey="shortuid"
              :value="extension.shortuid ?? '—'"
              class="readonly-identity"
            />
            <FormField
              v-else
              id="edit-identity-sip-user"
              :model-value="extension.shortuid ?? '—'"
              label="SIP User"
              help-pkey="shortuid"
              disabled
              class="readonly-identity"
            />
            <div class="form-field sip-passwd-field readonly-identity">
              <label for="edit-identity-passwd" class="form-field-label">SIP Password</label>
              <div class="form-field-input-wrapper">
                <div class="sip-passwd-inline">
                  <p
                    id="edit-identity-passwd"
                    class="sip-passwd-value value-immutable"
                    title="Immutable"
                  >
                    {{ extension.passwd ?? '—' }}
                  </p>
                  <button
                    type="button"
                    class="sip-regenerate-btn"
                    :disabled="saving || regeneratingSip"
                    @click="openRegenerateSipModal"
                  >
                    Regen
                  </button>
                </div>
              </div>
            </div>
            <FormReadonly
              v-if="isReadOnly('macaddr')"
              id="edit-identity-macaddr"
              label="MAC address"
              :value="extension.macaddr?.trim() || '—'"
              class="readonly-identity"
            />
            <FormField
              v-else
              id="edit-identity-macaddr"
              v-model="editMacaddr"
              label="MAC address"
              type="text"
              placeholder="12 hex digits or 00:11:22:33:44:55"
            />
            <FormReadonly
              v-if="isReadOnly('device')"
              id="edit-identity-device"
              label="Device"
              :value="extension.device ?? '—'"
              class="readonly-identity"
            />
            <FormField
              v-else
              id="edit-identity-device"
              :model-value="extension.device ?? '—'"
              label="Device"
              disabled
              class="readonly-identity"
            />
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
            <FormField
              id="edit-cname"
              v-model="editCname"
              label="Common name"
              type="text"
              placeholder="Display name"
            />
            <FormField
              id="edit-description"
              v-model="editDescription"
              label="Description"
              type="text"
              placeholder="Freeform description"
            />
          </div>

          <h2 class="detail-heading">Transport</h2>
          <div class="form-fields">
            <FormSelect
              id="edit-transport"
              v-model="editTransport"
              label="Transport"
              :options="['udp', 'tcp', 'tls', 'wss']"
            />
          </div>

          <h2 class="detail-heading">Advanced</h2>
          <div class="form-fields">
            <FormSegmentedPill
              id="edit-callbackto"
              v-model="editCallbackto"
              label="Callback to"
              :options="['desk', 'cell']"
            />
            <FormField
              id="edit-callerid"
              v-model="editCallerid"
              label="Caller ID"
              type="text"
              inputmode="numeric"
            />
            <FormField
              id="edit-cellphone"
              v-model="editCellphone"
              label="Cell phone"
              type="text"
              inputmode="numeric"
            />
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
              :options="['default', 'None', 'Inbound', 'Outbound', 'Both']"
            />
            <FormField
              id="edit-dvrvmail"
              v-model="editDvrvmail"
              label="DVR voicemail"
              type="text"
            />
            <FormField
              id="edit-callmax"
              v-model="editCallmax"
              label="Call max"
              type="text"
              inputmode="numeric"
              placeholder="e.g. 3"
            />
            <FormField id="edit-extalert" v-model="editExtalert" label="Ext alert" type="text" />
            <FormSegmentedPill
              id="edit-protocol"
              v-model="editProtocol"
              label="Protocol (IP version)"
              :options="['IPV4', 'IPV6']"
            />
            <FormField
              id="edit-vmailfwd"
              v-model="editVmailfwd"
              label="Voicemail forward (email)"
              type="email"
            />
            <FormField
              id="edit-provision"
              v-model="editProvision"
              label="Provision"
              type="text"
              placeholder="Provisioning string"
              :multiline="true"
              :rows="8"
            />
            <FormSelect
              id="edit-provisionwith"
              v-model="editProvisionwith"
              label="Provision with"
              :options="['IP', 'FQDN']"
            />
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
          <p v-else-if="!runtime" class="muted">
            Runtime params appear after Asterisk config is regenerated.
          </p>
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
                <button type="submit" :disabled="runtimeSaving">
                  {{ runtimeSaving ? 'Saving…' : 'Save' }}
                </button>
                <button type="button" class="secondary" @click="cancelEditRuntime">Cancel</button>
              </div>
            </form>
            <dl v-if="!editingRuntime" class="detail-list">
              <template v-if="runtime.ip != null || runtime.latency != null">
                <dt>IP (from Asterisk)</dt>
                <dd>{{ runtime.ip ?? 'Unknown' }}</dd>
                <dt>Status (RTT)</dt>
                <dd>{{ runtime.latency ?? 'Unknown' }}</dd>
              </template>
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

    <Teleport to="body">
      <div
        v-if="confirmRegenerateSipOpen"
        class="sip-modal-backdrop"
        @click.self="cancelRegenerateSip"
      >
        <div
          class="sip-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="regenerate-sip-title"
        >
          <h2 id="regenerate-sip-title" class="sip-modal-title">Regenerate SIP password?</h2>
          <div class="sip-modal-body">
            <p>
              The current password will <strong>stop working immediately</strong>. This phone must
              be updated to the new secret before it can register again.
            </p>
            <p class="sip-modal-hint">
              Use <strong>Commit</strong> when you are ready so Asterisk config matches the
              database.
            </p>
            <p v-if="regenerateSipError" class="error">{{ regenerateSipError }}</p>
          </div>
          <div class="sip-modal-actions">
            <button
              type="button"
              class="sip-modal-btn sip-modal-btn-cancel"
              @click="cancelRegenerateSip"
            >
              Cancel
            </button>
            <button
              type="button"
              class="sip-modal-btn sip-modal-btn-confirm"
              :disabled="regeneratingSip"
              @click="confirmRegenerateSip"
            >
              {{ regeneratingSip ? 'Regenerating…' : 'Regenerate' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <DeleteConfirmModal
      :show="confirmDeleteOpen"
      title="Delete extension?"
      :loading="deleting"
      @confirm="confirmAndDelete"
      @cancel="cancelConfirmDelete"
    >
      <template #body>
        <p>
          Extension <strong>{{ extension?.pkey ?? '—' }}</strong> will be permanently deleted. This
          cannot be undone.
        </p>
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
.error-state {
  margin-top: 1rem;
}
.error-state .error {
  margin-bottom: 1rem;
}
.error-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.75rem;
}
.error-actions button {
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-weight: 500;
  cursor: pointer;
}
.error-actions button.secondary {
  color: #64748b;
  background: transparent;
  border: 1px solid #e2e8f0;
}
.error-actions button.secondary:hover {
  background: #f1f5f9;
}
.error-actions button.btn-primary {
  color: #fff;
  background: #2563eb;
  border: none;
}
.error-actions button.btn-primary:hover {
  background: #1d4ed8;
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
  max-width: 52rem;
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
.edit-actions button[type='submit'] {
  color: #fff;
  background: #2563eb;
  border: none;
}
.edit-actions button[type='submit']:disabled {
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

/* SIP password row: same grid as FormField / FormReadonly (label | value+button) */
.sip-passwd-field.form-field {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 2fr;
  gap: 0.375rem 1rem;
  align-items: start;
  margin-bottom: 0.75rem;
  width: 100%;
  min-width: 0;
}
.sip-passwd-field .form-field-label {
  font-weight: 500;
  color: #475569;
  padding-top: 0.375rem;
  white-space: nowrap;
}
.sip-passwd-field .form-field-input-wrapper {
  min-width: 0;
}
.sip-passwd-inline {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  gap: 0.5rem;
  width: 100%;
  min-width: 0;
}
.sip-passwd-value {
  flex: 1;
  min-width: 0;
  margin: 0;
  padding: 0.5rem 0.75rem;
  font-size: 0.9375rem;
  line-height: 1.5;
  border-radius: 0.375rem;
  word-break: break-all;
}
.readonly-identity.sip-passwd-field .form-field-label,
.readonly-identity.sip-passwd-field .sip-passwd-value {
  color: #94a3b8;
}
.readonly-identity.sip-passwd-field .sip-passwd-value {
  background-color: #f1f5f9;
  border: 1px solid #e2e8f0;
}
.sip-regenerate-btn {
  flex-shrink: 0;
  align-self: stretch;
  padding: 0 0.65rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: #fff;
  background: #dc2626;
  border: 1px solid #b91c1c;
  border-radius: 0.375rem;
  cursor: pointer;
  white-space: nowrap;
}
.sip-regenerate-btn:hover:not(:disabled) {
  background: #b91c1c;
  border-color: #991b1b;
}
.sip-regenerate-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.sip-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}
.sip-modal {
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  padding: 1.5rem;
  max-width: 26rem;
  width: 100%;
}
.sip-modal-title {
  margin: 0 0 0.75rem 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #0f172a;
}
.sip-modal-body {
  margin: 0 0 1.25rem 0;
  font-size: 0.9375rem;
  color: #475569;
  line-height: 1.5;
}
.sip-modal-body :deep(strong),
.sip-modal-body strong {
  color: #0f172a;
}
.sip-modal-hint {
  margin: 0.75rem 0 0 0;
  font-size: 0.875rem;
  color: #64748b;
}
.sip-modal-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}
.sip-modal-btn {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 0.375rem;
  cursor: pointer;
  border: none;
}
.sip-modal-btn-cancel {
  background: #f1f5f9;
  color: #475569;
}
.sip-modal-btn-cancel:hover {
  background: #e2e8f0;
}
.sip-modal-btn-confirm {
  background: #2563eb;
  color: #fff;
}
.sip-modal-btn-confirm:hover:not(:disabled) {
  background: #1d4ed8;
}
.sip-modal-btn-confirm:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
</style>
