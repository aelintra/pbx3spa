<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useSchema } from '@/composables/useSchema'
import { useToastStore } from '@/stores/toast'
import { firstErrorMessage } from '@/utils/formErrors'
import FormField from '@/components/forms/FormField.vue'
import FormSelect from '@/components/forms/FormSelect.vue'
import FormToggle from '@/components/forms/FormToggle.vue'
import FormReadonly from '@/components/forms/FormReadonly.vue'
import DeleteConfirmModal from '@/components/DeleteConfirmModal.vue'
import PanelBackLink from '@/components/PanelBackLink.vue'
import DetailActiveStatusBar from '@/components/DetailActiveStatusBar.vue'
import { useAuthStore } from '@/stores/auth'
const route = useRoute()
const router = useRouter()
const toast = useToastStore()
const auth = useAuthStore()
const { getSchema, ensureFetched } = useSchema()
function isReadOnly(field) {
  return getSchema('trunks')?.read_only?.includes(field) ?? false
}
const trunk = ref(null)
const loading = ref(true)
const error = ref('')
const editPkey = ref('')
const editCname = ref('')
const editDescription = ref('')
const editActive = ref('YES')
const editHost = ref('')
const editUsername = ref('')
const editPeername = ref('')
const editTrunkname = ref('')
const editPassword = ref('')
const editCallprogress = ref('NO')
const editCallerid = ref('')
const editInprefix = ref('')
const editMatch = ref('')
const editPrivileged = ref('NO')
const editTechnology = ref('SIP')
const editPjsipreg = ref('')
const devicerecOptions = ['None', 'Inbound', 'Outbound', 'Both']

const sipPjsipregOptions = [
  { value: '', label: 'Trusted peer (no outbound registration)' },
  { value: 'RCV', label: 'Accept registration from provider' },
  { value: 'SND', label: 'Send registration to provider' }
]

function normalizePjsipregForSelect(v) {
  if (v == null || v === '') return ''
  const u = String(v).trim().toUpperCase()
  if (u === 'SND' || u === 'RCV') return u
  return ''
}

function normalizeDevicerec(s) {
  if (s == null || s === '') return 'None'
  const v = String(s).trim()
  if (v === 'OTR' || v === 'OTRR') return 'Both'
  return devicerecOptions.includes(v) ? v : 'None'
}

/** Normalize ON/OFF or YES/NO to YES/NO for API (callprogress, privileged). */
function normalizeYesNo(val) {
  if (val == null || val === '') return 'NO'
  const v = String(val).trim().toUpperCase()
  if (v === 'ON' || v === 'YES') return 'YES'
  return 'NO'
}

const editDevicerec = ref('None')
const editTransform = ref('')
const editPjsipOverlay = ref('')
const saveError = ref('')
const saving = ref(false)
const deleteError = ref('')
const deleting = ref(false)
const confirmDeleteOpen = ref(false)

const shortuid = computed(() => route.params.shortuid)

async function fetchTrunk() {
  if (!shortuid.value) return
  loading.value = true
  error.value = ''
  try {
    trunk.value = await getApiClient().get(`trunks/${encodeURIComponent(shortuid.value)}`)
    editPkey.value = trunk.value?.pkey ?? ''
    editCname.value = trunk.value?.cname ?? ''
    editDescription.value = trunk.value?.description ?? ''
    editActive.value = trunk.value?.active ?? 'YES'
    editHost.value = trunk.value?.host ?? ''
    editUsername.value = trunk.value?.username ?? ''
    editPeername.value = trunk.value?.peername ?? ''
    editTrunkname.value = trunk.value?.trunkname ?? ''
    editPassword.value = '' // never re-fill password
    editCallprogress.value = normalizeYesNo(trunk.value?.callprogress)
    editCallerid.value = trunk.value?.callerid ?? ''
    editInprefix.value = trunk.value?.inprefix ?? ''
    editMatch.value = trunk.value?.match ?? ''
    editPrivileged.value = normalizeYesNo(trunk.value?.privileged)
    editTechnology.value = trunk.value?.technology ?? 'SIP'
    editPjsipreg.value = normalizePjsipregForSelect(trunk.value?.pjsipreg)
    editDevicerec.value = normalizeDevicerec(trunk.value?.devicerec)
    editTransform.value = trunk.value?.transform ?? ''
    editPjsipOverlay.value = trunk.value?.pjsip_overlay ?? ''
  } catch (err) {
    error.value = firstErrorMessage(err, 'Failed to load trunk')
    trunk.value = null
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await ensureFetched()
  await fetchTrunk()
})
watch(shortuid, fetchTrunk)

watch(editTechnology, (t) => {
  if (t !== 'SIP') editPjsipreg.value = ''
})

function goBack() {
  router.push({ name: 'trunks' })
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
      pkey: editPkey.value.trim() || undefined,
      cname: editCname.value.trim() || undefined,
      description: editDescription.value.trim() || undefined,
      active: editActive.value,
      cluster: 'default', // TRUNK_ROUTE_MULTITENANCY: trunks are default-tenant only, not changeable
      host: editHost.value.trim(),
      username: editUsername.value.trim() || undefined,
      peername: editPeername.value.trim() || undefined,
      trunkname: editTrunkname.value.trim() || undefined,
      callprogress: editCallprogress.value,
      callerid: editCallerid.value.trim() || undefined,
      inprefix: editInprefix.value.trim() || undefined,
      match: editMatch.value.trim() || undefined,
      privileged: editPrivileged.value,
      technology: editTechnology.value === 'IAX2' ? 'IAX2' : 'SIP',
      pjsipreg:
        editTechnology.value === 'SIP'
          ? editPjsipreg.value
            ? editPjsipreg.value.trim().toUpperCase()
            : null
          : null,
      devicerec: editDevicerec.value || 'None',
      transform: editTransform.value.trim() || undefined
    }
    if (auth.isAdmin) {
      body.pjsip_overlay = editPjsipOverlay.value.trim() || null
    }
    if (editPassword.value.trim()) body.password = editPassword.value.trim()
    await getApiClient().put(`trunks/${encodeURIComponent(shortuid.value)}`, body)
    await fetchTrunk()
    toast.show(`Trunk saved`)
  } catch (err) {
    saveError.value = firstErrorMessage(err, 'Failed to update trunk')
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
    await getApiClient().delete(`trunks/${encodeURIComponent(shortuid.value)}`)
    toast.show(`Trunk deleted`)
    router.push({ name: 'trunks' })
  } catch (err) {
    deleteError.value = firstErrorMessage(err, 'Failed to delete trunk')
  } finally {
    deleting.value = false
    confirmDeleteOpen.value = false
  }
}
</script>

<template>
  <div class="detail-view" @keydown="onKeydown">
    <PanelBackLink :to="{ name: 'trunks' }" label="Trunks">
      <div class="detail-panel-head">
        <div class="detail-title-status-row">
          <h1 class="detail-panel-title">Edit Trunk {{ trunk?.pkey ?? '…' }}</h1>
          <DetailActiveStatusBar v-if="trunk" v-model="editActive" toggle-id="edit-trunk-active" />
        </div>
        <p v-if="trunk && editActive === 'NO'" class="detail-active-inactive-hint" role="status">
          Inactive trunks are not used for calling until you activate this record and commit the
          change.
        </p>
      </div>
    </PanelBackLink>

    <p v-if="loading" class="loading">Loading…</p>
    <p v-else-if="error" class="error">{{ error }}</p>
    <template v-else-if="trunk">
      <div class="detail-content">
        <p v-if="deleteError" class="error">{{ deleteError }}</p>

        <form class="edit-form" autocomplete="off" @submit="saveEdit">
          <p v-if="saveError" id="trunk-edit-error" class="error" role="alert">{{ saveError }}</p>

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
              :value="trunk.shortuid ?? '—'"
              class="readonly-identity"
            />
            <FormField
              v-else
              id="edit-identity-shortuid"
              :model-value="trunk.shortuid ?? '—'"
              label="UID"
              disabled
              class="readonly-identity"
            />
            <FormReadonly
              v-if="isReadOnly('id')"
              id="edit-identity-id"
              label="KSUID"
              :value="trunk.id ?? '—'"
              class="readonly-identity"
            />
            <FormField
              v-else
              id="edit-identity-id"
              :model-value="trunk.id ?? '—'"
              label="KSUID"
              disabled
              class="readonly-identity"
            />
            <FormReadonly
              v-if="isReadOnly('pkey')"
              id="edit-identity-pkey"
              label="Name"
              help-pkey="trunkname"
              :value="editPkey || '—'"
              class="readonly-identity"
            />
            <FormField
              v-else
              id="edit-identity-pkey"
              v-model="editPkey"
              label="Name"
              help-pkey="trunkname"
              type="text"
              placeholder="e.g. mytrunk"
            />
            <FormField
              id="edit-cname"
              v-model="editCname"
              label="Common name"
              type="text"
              placeholder="Display name"
            />
            <FormReadonly
              v-if="isReadOnly('transport')"
              id="edit-identity-transport"
              label="Transport"
              :value="trunk.transport ?? 'udp'"
              class="readonly-identity"
            />
            <FormField
              v-else
              id="edit-identity-transport"
              :model-value="trunk.transport ?? 'udp'"
              label="Transport"
              disabled
              class="readonly-identity"
            />
            <FormReadonly
              v-if="isReadOnly('technology') || editTechnology === 'IAX2'"
              id="edit-identity-technology"
              label="Technology"
              :value="editTechnology === 'IAX2' ? 'IAX2 (legacy — not supported)' : editTechnology || 'SIP'"
              class="readonly-identity"
            />
            <FormSelect
              v-else
              id="edit-technology"
              v-model="editTechnology"
              label="Technology"
              :options="['SIP']"
            />
            <FormField
              id="edit-description"
              v-model="editDescription"
              label="Description (optional)"
              type="text"
            />
          </div>

          <h2 class="detail-heading">Settings</h2>
          <div class="form-fields">
            <FormToggle
              id="edit-active"
              v-model="editActive"
              label="Active?"
              yes-value="YES"
              no-value="NO"
            />
            <FormSelect
              v-if="editTechnology === 'SIP'"
              id="edit-pjsipreg"
              v-model="editPjsipreg"
              label="SIP registration"
              help-pkey="pjsipreg"
              :options="sipPjsipregOptions"
            />
            <FormField
              id="edit-host"
              v-model="editHost"
              label="Host"
              type="text"
              :required="true"
              placeholder="e.g. sip.example.com, IP, or dynamic (accept-reg)"
            />
            <FormField
              id="edit-username"
              v-model="editUsername"
              label="Username"
              type="text"
              autocomplete="off"
            />
            <FormField
              id="edit-peername"
              v-model="editPeername"
              label="Peername"
              type="text"
              autocomplete="off"
            />
            <FormField
              id="edit-trunkname"
              v-model="editTrunkname"
              label="Trunkname"
              type="text"
              autocomplete="off"
            />
            <FormField
              id="edit-password"
              v-model="editPassword"
              label="Password"
              type="text"
              obscure
              placeholder="Leave blank to keep current"
              autocomplete="off"
            />
            <FormToggle
              id="edit-callprogress"
              v-model="editCallprogress"
              label="Call progress"
              yes-value="YES"
              no-value="NO"
            />
            <FormToggle
              id="edit-privileged"
              v-model="editPrivileged"
              label="Privileged"
              yes-value="YES"
              no-value="NO"
            />
          </div>

          <h2 class="detail-heading">Advanced</h2>
          <div class="form-fields">
            <FormField id="edit-callerid" v-model="editCallerid" label="Caller ID" type="text" hide-help />
            <FormField id="edit-inprefix" v-model="editInprefix" label="In prefix" type="text" />
            <FormField id="edit-match" v-model="editMatch" label="Match" type="text" />
            <FormSelect
              id="edit-devicerec"
              v-model="editDevicerec"
              label="Device recording"
              :options="devicerecOptions"
            />
            <FormField id="edit-transform" v-model="editTransform" label="Transform" type="text" />
            <FormField
              v-if="auth.isAdmin"
              id="edit-pjsip_overlay"
              v-model="editPjsipOverlay"
              label="PJSIP overlay"
              type="text"
              placeholder="Thin overlay fragment (type= + keys)"
              :multiline="true"
              :rows="8"
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
        <p>
          Trunk <strong>{{ trunk?.pkey ?? '—' }}</strong> will be permanently deleted. This cannot
          be undone.
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
/* Non-updateable identity fields (Name, UID, KSUID, Transport) – low-light */
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
</style>
