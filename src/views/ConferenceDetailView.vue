<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useSchema } from '@/composables/useSchema'
import { useToastStore } from '@/stores/toast'
import { normalizeList } from '@/utils/listResponse'
import { firstErrorMessage } from '@/utils/formErrors'
import { validateConferencePkey } from '@/utils/validation'
import FormField from '@/components/forms/FormField.vue'
import FormSelect from '@/components/forms/FormSelect.vue'
import FormReadonly from '@/components/forms/FormReadonly.vue'
import DeleteConfirmModal from '@/components/DeleteConfirmModal.vue'
import PanelBackLink from '@/components/PanelBackLink.vue'
import DetailActiveStatusBar from '@/components/DetailActiveStatusBar.vue'

const route = useRoute()
const router = useRouter()
const toast = useToastStore()
const { getSchema, ensureFetched } = useSchema()
function isReadOnly(field) {
  return getSchema('conferences')?.read_only?.includes(field) ?? false
}
const conference = ref(null)
const tenants = ref([])
const loading = ref(true)
const error = ref('')
const editPkey = ref('')
const editActive = ref('YES')
const editCluster = ref('default')
const editCname = ref('')
const editDescription = ref('')
const editType = ref('simple')
const editPin = ref('None')
const editAdminpin = ref('None')
const saveError = ref('')
const saving = ref(false)
const deleteError = ref('')
const deleting = ref(false)
const confirmDeleteOpen = ref(false)

const shortuid = computed(() => route.params.shortuid)

const tenantShortuidToPkey = computed(() => {
  const map = {}
  for (const t of tenants.value) {
    if (t.shortuid) map[String(t.shortuid)] = t.pkey
    if (t.pkey) map[String(t.pkey)] = t.pkey
  }
  return map
})

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

const typeOptions = ['simple', 'hosted']

async function fetchTenants() {
  try {
    const response = await getApiClient().get('tenants')
    tenants.value = normalizeList(response, 'tenants')
  } catch {
    tenants.value = []
  }
}

function normalisePin(v) {
  if (v == null || v === '') return 'None'
  const s = String(v).trim()
  return s === '' || s === '-' ? 'None' : s
}

async function fetchConference() {
  if (!shortuid.value) return
  loading.value = true
  error.value = ''
  try {
    conference.value = await getApiClient().get(`conferences/${encodeURIComponent(shortuid.value)}`)
    const c = conference.value
    const clusterRaw = c?.cluster ?? 'default'
    editCluster.value = tenantShortuidToPkey.value[clusterRaw] ?? clusterRaw
    editPkey.value = c?.pkey != null && c?.pkey !== '' ? String(c.pkey) : ''
    editActive.value = (c?.active === 'NO') ? 'NO' : 'YES'
    editCname.value = c?.cname ?? ''
    editDescription.value = c?.description ?? ''
    editType.value = typeOptions.includes(c?.type) ? c.type : 'simple'
    editPin.value = normalisePin(c?.pin)
    editAdminpin.value = normalisePin(c?.adminpin)
  } catch (err) {
    error.value = firstErrorMessage(err, 'Failed to load conference')
    conference.value = null
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await ensureFetched()
  await fetchTenants()
  await fetchConference()
})
watch(shortuid, fetchConference)

function goBack() {
  router.push({ name: 'conferences' })
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

function parsePin(v) {
  if (v === '' || v == null || v === 'None') return null
  const n = Number(v)
  return isNaN(n) ? (String(v).trim() || null) : n
}

async function saveEdit(e) {
  e.preventDefault()
  saveError.value = ''
  const pkeyErr = validateConferencePkey(editPkey.value)
  if (pkeyErr) {
    saveError.value = pkeyErr
    return
  }
  saving.value = true
  try {
    const pkeyNum = parseInt(editPkey.value, 10)
    const body = {
      pkey: isNaN(pkeyNum) ? editPkey.value.trim() : pkeyNum,
      active: editActive.value,
      cluster: editCluster.value.trim(),
      cname: editCname.value.trim() === '' ? null : editCname.value.trim(),
      description: editDescription.value.trim() || null,
      type: editType.value,
      pin: parsePin(editPin.value) ?? 'None',
      adminpin: parsePin(editAdminpin.value) ?? 'None'
    }
    await getApiClient().put(`conferences/${encodeURIComponent(shortuid.value)}`, body)
    await fetchConference()
    toast.show(`Conference ${conference.value?.pkey ?? ''} saved`)
  } catch (err) {
    saveError.value = firstErrorMessage(err, 'Failed to update conference')
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
    await getApiClient().delete(`conferences/${encodeURIComponent(shortuid.value)}`)
    toast.show(`Conference deleted`)
    router.push({ name: 'conferences' })
  } catch (err) {
    deleteError.value = firstErrorMessage(err, 'Failed to delete conference')
  } finally {
    deleting.value = false
    confirmDeleteOpen.value = false
  }
}

const displayName = computed(() => conference.value?.pkey ?? '')

const panelTitleTenantSuffix = computed(() => {
  if (!conference.value) return ''
  const t = String(editCluster.value ?? '').trim()
  if (!t) return ''
  return ` (${t})`
})
</script>

<template>
  <div class="detail-view" @keydown="onKeydown">
    <PanelBackLink :to="{ name: 'conferences' }" label="Conferences">
      <div class="detail-panel-head">
        <div class="detail-title-status-row">
          <h1 class="detail-panel-title">Edit Conference {{ displayName }}{{ panelTitleTenantSuffix }}</h1>
          <DetailActiveStatusBar
            v-if="conference"
            v-model="editActive"
            toggle-id="edit-conference-active"
          />
        </div>
        <p v-if="conference && editActive === 'NO'" class="detail-inactive-banner" role="status">
          This record is inactive and will not participate in normal call flow until you activate it and commit the change.
        </p>
      </div>
    </PanelBackLink>

    <p v-if="loading" class="loading">Loading…</p>
    <p v-else-if="error" class="error">{{ error }}</p>
    <template v-else-if="conference">
      <div class="detail-content">
        <p v-if="deleteError" class="error">{{ deleteError }}</p>

        <form class="edit-form" @submit="saveEdit">
          <p v-if="saveError" id="conference-edit-error" class="error" role="alert">{{ saveError }}</p>

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
            <template v-if="conference.shortuid != null && conference.shortuid !== ''">
              <FormReadonly v-if="isReadOnly('shortuid')" id="edit-identity-shortuid" label="UID" :value="conference.shortuid ?? '—'" class="readonly-identity" />
              <FormField v-else id="edit-identity-shortuid" :model-value="conference.shortuid ?? '—'" label="UID" disabled class="readonly-identity" />
            </template>
            <template v-if="conference.id != null && conference.id !== ''">
              <FormReadonly v-if="isReadOnly('id')" id="edit-identity-id" label="KSUID" :value="conference.id ?? '—'" class="readonly-identity" />
              <FormField v-else id="edit-identity-id" :model-value="conference.id ?? '—'" label="KSUID" disabled class="readonly-identity" />
            </template>
            <FormReadonly v-if="isReadOnly('pkey')" id="edit-identity-pkey" label="Room number" :value="editPkey || '—'" class="readonly-identity" />
            <FormField v-else id="edit-identity-pkey" v-model="editPkey" label="Room number" type="text" inputmode="numeric" placeholder="e.g. 9000" hint="Unique per tenant. Positive number." />
            <FormField id="edit-cname" v-model="editCname" label="Common name" type="text" placeholder="Display name" />
            <FormSelect
              id="edit-cluster"
              v-model="editCluster"
              label="Tenant (required)"
              :options="tenantOptionsForSelect"
              :required="true"
            />
            <FormField
              id="edit-description"
              v-model="editDescription"
              label="Description"
              type="text"
            />
          </div>

          <h2 class="detail-heading">Settings</h2>
          <div class="form-fields">
            <FormSelect
              id="edit-type"
              v-model="editType"
              label="Type"
              :options="typeOptions"
            />
            <FormField
              id="edit-pin"
              v-model="editPin"
              label="Participant PIN"
              type="text"
              inputmode="numeric"
              placeholder="None or numeric PIN"
            />
            <FormField
              id="edit-adminpin"
              v-model="editAdminpin"
              label="Admin PIN"
              type="text"
              inputmode="numeric"
              placeholder="None or numeric PIN"
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
      title="Delete conference?"
      :loading="deleting"
      @confirm="confirmAndDelete"
      @cancel="cancelConfirmDelete"
    >
      <template #body>
        <p>Conference room <strong>{{ displayName }}</strong> will be permanently deleted. This cannot be undone.</p>
      </template>
    </DeleteConfirmModal>
  </div>
</template>

<style scoped>
.detail-view { max-width: 52rem; }
.loading, .error { margin-top: 1rem; }
.error { color: #dc2626; }
.detail-content { margin-top: 1rem; }
.detail-heading { font-size: 1rem; font-weight: 600; color: #334155; margin: 1.5rem 0 0.5rem 0; }
.detail-heading:first-of-type { margin-top: 0; }
.form-fields { display: flex; flex-direction: column; gap: 0; margin-top: 0.5rem; }
.readonly-identity :deep(.form-field-label),
.readonly-identity :deep(.form-readonly) { color: #94a3b8; }
.readonly-identity :deep(.form-readonly) { background-color: #f1f5f9; border-color: #e2e8f0; }
.edit-form { margin-bottom: 1rem; display: flex; flex-direction: column; gap: 0.75rem; }
.edit-actions { display: flex; gap: 0.5rem; }
.edit-actions button { padding: 0.375rem 0.75rem; font-size: 0.875rem; font-weight: 500; border-radius: 0.375rem; cursor: pointer; }
.edit-actions button[type="submit"] { color: #fff; background: #2563eb; border: none; }
.edit-actions button[type="submit"]:disabled { opacity: 0.7; cursor: not-allowed; }
.edit-actions button.secondary { color: #64748b; background: transparent; border: 1px solid #e2e8f0; }
.edit-actions button.secondary:hover { background: #f1f5f9; }
.edit-actions button.action-delete { color: #fff; background: #dc2626; border: none; }
.edit-actions button.action-delete:hover:not(:disabled) { background: #b91c1c; }
.edit-actions button.action-delete:disabled { opacity: 0.7; cursor: not-allowed; }
</style>
