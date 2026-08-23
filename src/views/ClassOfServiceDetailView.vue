<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useSchema } from '@/composables/useSchema'
import { useToastStore } from '@/stores/toast'
import { loadTenantOptions } from '@/utils/loadTenantOptions'
import { firstErrorMessage } from '@/utils/formErrors'
import FormField from '@/components/forms/FormField.vue'
import FormSelect from '@/components/forms/FormSelect.vue'
import FormToggle from '@/components/forms/FormToggle.vue'
import FormReadonly from '@/components/forms/FormReadonly.vue'
import DeleteConfirmModal from '@/components/DeleteConfirmModal.vue'
import PanelBackLink from '@/components/PanelBackLink.vue'
import DetailActiveStatusBar from '@/components/DetailActiveStatusBar.vue'
const route = useRoute()
const router = useRouter()
const toast = useToastStore()
const { ensureFetched } = useSchema()
const cosrule = ref(null)
const tenants = ref([])
const loading = ref(true)
const error = ref('')
const editActive = ref('YES')
const editCluster = ref('default')
const editCname = ref('')
const editDescription = ref('')
const editDialplan = ref('')
const editDefaultopen = ref('NO')
const editDefaultclosed = ref('NO')
const editOrideopen = ref('NO')
const editOrideclosed = ref('NO')
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
  if (cur && !list.includes(cur))
    return [cur, ...list].sort((a, b) => String(a).localeCompare(String(b)))
  return list
})

async function fetchTenants() {
  try {
    tenants.value = await loadTenantOptions()
  } catch {
    tenants.value = []
  }
}

async function fetchCosrule() {
  if (!shortuid.value) return
  loading.value = true
  error.value = ''
  try {
    cosrule.value = await getApiClient().get(`cosrules/${encodeURIComponent(shortuid.value)}`)
    const c = cosrule.value
    const clusterRaw = c?.cluster ?? 'default'
    editCluster.value = tenantShortuidToPkey.value[clusterRaw] ?? clusterRaw
    editActive.value = c?.active === 'NO' ? 'NO' : 'YES'
    editCname.value = c?.cname ?? ''
    editDescription.value = c?.description ?? ''
    editDialplan.value = c?.dialplan ?? ''
    editDefaultopen.value = c?.defaultopen === 'YES' ? 'YES' : 'NO'
    editDefaultclosed.value = c?.defaultclosed === 'YES' ? 'YES' : 'NO'
    editOrideopen.value = c?.orideopen === 'YES' ? 'YES' : 'NO'
    editOrideclosed.value = c?.orideclosed === 'YES' ? 'YES' : 'NO'
  } catch (err) {
    error.value = firstErrorMessage(err, 'Failed to load Class of Service rule')
    cosrule.value = null
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await ensureFetched()
  await fetchTenants()
  await fetchCosrule()
})
watch(shortuid, fetchCosrule)

function goBack() {
  router.push({ name: 'cosrules' })
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
  if (!editDialplan.value || !String(editDialplan.value).trim()) {
    saveError.value = 'Dialplan is required'
    return
  }
  saving.value = true
  try {
    const body = {
      active: editActive.value,
      cluster: editCluster.value.trim(),
      cname: editCname.value.trim() === '' ? null : editCname.value.trim(),
      description: editDescription.value.trim() || null,
      dialplan: editDialplan.value.trim(),
      defaultopen: editDefaultopen.value,
      defaultclosed: editDefaultclosed.value,
      orideopen: editOrideopen.value,
      orideclosed: editOrideclosed.value
    }
    await getApiClient().put(`cosrules/${encodeURIComponent(shortuid.value)}`, body)
    await fetchCosrule()
    toast.show(
      `Class of Service rule ${cosrule.value?.cname || cosrule.value?.pkey || ''} saved`
    )
  } catch (err) {
    saveError.value = firstErrorMessage(err, 'Failed to update Class of Service rule')
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
    await getApiClient().delete(`cosrules/${encodeURIComponent(shortuid.value)}`)
    toast.show('Class of Service rule deleted')
    router.push({ name: 'cosrules' })
  } catch (err) {
    deleteError.value = firstErrorMessage(err, 'Failed to delete Class of Service rule')
  } finally {
    deleting.value = false
    confirmDeleteOpen.value = false
  }
}

const displayName = computed(
  () => cosrule.value?.cname || cosrule.value?.pkey || cosrule.value?.shortuid || ''
)

const panelTitleTenantSuffix = computed(() => {
  if (!cosrule.value) return ''
  const t = String(editCluster.value ?? '').trim()
  if (!t) return ''
  return ` (${t})`
})

/** Product seeds use stable pkey (HR_*); SPA create uses pkey === shortuid — hide redundant Key row. */
const showStableKey = computed(() => {
  const c = cosrule.value
  if (!c) return false
  const pkey = String(c.pkey ?? '').trim()
  const suid = String(c.shortuid ?? '').trim()
  return pkey !== '' && suid !== '' && pkey !== suid
})

/** Product seeds (HR_*): show Key + UID; SPA rules (pkey === shortuid): hide both readonly rows. */
const showUid = computed(() => {
  if (!showStableKey.value) return false
  const c = cosrule.value
  if (!c) return false
  return String(c.shortuid ?? '').trim() !== ''
})
</script>

<template>
  <div class="detail-view" @keydown="onKeydown">
    <PanelBackLink :to="{ name: 'cosrules' }" label="Class of Service">
      <div class="detail-panel-head detail-panel-head--compact">
        <div class="detail-title-status-row">
          <h1 class="detail-panel-title">
            Edit CoS {{ displayName }}{{ panelTitleTenantSuffix }}
          </h1>
          <DetailActiveStatusBar v-if="cosrule" v-model="editActive" toggle-id="edit-cos-active" />
        </div>
        <p v-if="cosrule && editActive === 'NO'" class="detail-active-inactive-hint" role="status">
          Inactive class-of-service rules do not apply until you activate this record and commit the
          change.
        </p>
      </div>
    </PanelBackLink>

    <p v-if="loading" class="loading">Loading…</p>
    <p v-else-if="error" class="error">{{ error }}</p>
    <template v-else-if="cosrule">
      <div class="detail-content">
        <p v-if="deleteError" class="error">{{ deleteError }}</p>

        <form class="edit-form" @submit="saveEdit">
          <p v-if="saveError" id="cos-edit-error" class="error" role="alert">{{ saveError }}</p>

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
          <div class="form-fields form-fields-compact">
            <FormReadonly
              v-if="showUid"
              id="edit-identity-shortuid"
              label="UID"
              :value="cosrule.shortuid ?? '—'"
              class="readonly-identity"
            />
            <FormReadonly
              v-if="showStableKey"
              id="edit-identity-pkey"
              label="Key"
              help-pkey="cosname"
              :value="cosrule.pkey ?? '—'"
              class="readonly-identity"
            />
            <FormField
              id="edit-cname"
              v-model="editCname"
              label="Common name"
              type="text"
              placeholder="Display name"
            />
            <FormSelect
              id="edit-cluster"
              v-model="editCluster"
              label="Tenant"
              :options="tenantOptionsForSelect"
              :required="true"
            />
            <FormField
              id="edit-description"
              v-model="editDescription"
              label="Description"
              multiline
              :rows="1"
            />
          </div>

          <h2 class="detail-heading">Settings</h2>
          <div class="form-fields form-fields-compact">
            <FormField
              id="edit-dialplan"
              v-model="editDialplan"
              label="Dialplan (required)"
              help-pkey="cosdialplan"
              multiline
              :rows="3"
              placeholder="Space-separated Asterisk patterns (e.g. _070. _001268.)"
              :required="true"
            />
            <div class="cos-toggle-grid">
              <FormToggle
                id="edit-defaultopen"
                v-model="editDefaultopen"
                label="Default open"
                help-pkey="cosopen"
                yes-value="YES"
                no-value="NO"
              />
              <FormToggle
                id="edit-orideopen"
                v-model="editOrideopen"
                label="Override open"
                help-pkey="orideopen"
                yes-value="YES"
                no-value="NO"
              />
              <FormToggle
                id="edit-defaultclosed"
                v-model="editDefaultclosed"
                label="Default closed"
                help-pkey="cosclosed"
                yes-value="YES"
                no-value="NO"
              />
              <FormToggle
                id="edit-orideclosed"
                v-model="editOrideclosed"
                label="Override closed"
                help-pkey="orideclosed"
                yes-value="YES"
                no-value="NO"
              />
            </div>
          </div>
        </form>
      </div>
    </template>

    <DeleteConfirmModal
      :show="confirmDeleteOpen"
      title="Delete Class of Service rule?"
      :loading="deleting"
      @confirm="confirmAndDelete"
      @cancel="cancelConfirmDelete"
    >
      <template #body>
        <p>
          Class of Service rule <strong>{{ displayName }}</strong> will be permanently deleted. This
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
.detail-panel-head--compact .detail-title-status-row {
  flex-wrap: wrap;
}
.detail-view :deep(.panel-back-header) {
  margin-bottom: 0.35rem;
}
.loading,
.error {
  margin-top: 0.5rem;
}
.error {
  color: #dc2626;
}
.detail-content {
  margin-top: 0.5rem;
}
.detail-heading {
  font-size: 1rem;
  font-weight: 600;
  color: #334155;
  margin: 0.75rem 0 0.25rem 0;
}
.detail-heading:first-of-type {
  margin-top: 0;
}
.form-fields-compact :deep(.form-field) {
  margin-bottom: 0.5rem;
}
.form-fields {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin-top: 0.25rem;
}
.cos-toggle-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 1.25rem;
  max-width: 36rem;
}
.cos-toggle-grid :deep(.form-field) {
  margin-bottom: 0.35rem;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
}
.cos-toggle-grid :deep(.form-field-label) {
  padding-top: 0;
}
@media (max-width: 640px) {
  .cos-toggle-grid {
    grid-template-columns: 1fr;
  }
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
  margin-bottom: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-width: 52rem;
}
.edit-actions {
  display: flex;
  flex-wrap: wrap;
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
