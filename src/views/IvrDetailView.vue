<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useToastStore } from '@/stores/toast'
import { useFormValidation, validateAll, focusFirstError } from '@/composables/useFormValidation'
import { validateTenant, validateGreetnum } from '@/utils/validation'
import FormField from '@/components/forms/FormField.vue'
import FormSelect from '@/components/forms/FormSelect.vue'
import FormToggle from '@/components/forms/FormToggle.vue'
import FormReadonly from '@/components/forms/FormReadonly.vue'
import { normalizeList } from '@/utils/listResponse'
import DeleteConfirmModal from '@/components/DeleteConfirmModal.vue'
import { OPTION_ENTRIES, buildIvrPayload } from '@/constants/ivrDestinations'
import { fieldErrors, firstErrorMessage } from '@/utils/formErrors'

const route = useRoute()
const router = useRouter()
const toast = useToastStore()
const ivr = ref(null)
const tenants = ref([])
const loading = ref(true)
const error = ref('')
const editing = ref(false)
const editCluster = ref('default')
const editActive = ref('YES')
const editCname = ref('')
const editName = ref('')
const editDescription = ref('')
const editGreetnum = ref('None')
const editListenforext = ref('NO')
const editTimeout = ref('operator')
const options = ref({
  option0: 'None', option1: 'None', option2: 'None', option3: 'None', option4: 'None', option5: 'None',
  option6: 'None', option7: 'None', option8: 'None', option9: 'None', option10: 'None', option11: 'None'
})
const tags = ref({
  tag0: '', tag1: '', tag2: '', tag3: '', tag4: '', tag5: '',
  tag6: '', tag7: '', tag8: '', tag9: '', tag10: '', tag11: ''
})
const alerts = ref({
  alert0: '', alert1: '', alert2: '', alert3: '', alert4: '', alert5: '',
  alert6: '', alert7: '', alert8: '', alert9: '', alert10: '', alert11: ''
})
const destinations = ref(null)
const destinationsLoading = ref(false)
const greetings = ref([])
const greetingsLoading = ref(false)
const saveError = ref('')
const saving = ref(false)
const deleteError = ref('')
const deleting = ref(false)
const confirmDeleteOpen = ref(false)

const shortuid = computed(() => route.params.shortuid)

// Field-level validation using composable (must be after refs are declared)
const clusterValidation = useFormValidation(editCluster, validateTenant)
const greetnumValidation = useFormValidation(editGreetnum, validateGreetnum)

/** Tenant list for dropdown: use pkey for both value and display (API may return shortuid in cluster). */
const tenantOptions = computed(() => {
  const list = tenants.value.map((t) => t.pkey).filter(Boolean)
  return [...new Set(list)].sort((a, b) => String(a).localeCompare(String(b)))
})

/** Map tenant shortuid -> pkey so we can resolve IVR.cluster (if shortuid) to pkey for the dropdown. */
const tenantShortuidToPkey = computed(() => {
  const map = {}
  for (const t of tenants.value) {
    if (t.shortuid) map[String(t.shortuid)] = t.pkey
  }
  return map
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
    CustomApps: Array.isArray(d.CustomApps) ? d.CustomApps : []
  }
})

const greetingOptions = computed(() => {
  const list = greetings.value
  if (!Array.isArray(list)) return []
  const nums = list
    .map((name) => {
      const m = String(name).match(/usergreeting(\d+)/i)
      return m ? parseInt(m[1], 10) : null
    })
    .filter((n) => n != null)
  return [...new Set(nums)].sort((a, b) => a - b)
})

function greetingOptionsWithNone(currentValue) {
  const base = ['None', ...greetingOptions.value.map((n) => String(n))]
  if (!currentValue || currentValue === 'None') return base
  if (base.includes(currentValue)) return base
  return [currentValue, ...base]
}

async function loadTenants() {
  try {
    const response = await getApiClient().get('tenants')
    tenants.value = normalizeList(response, 'tenants')
  } catch {
    tenants.value = []
  }
}

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

async function loadGreetings() {
  greetingsLoading.value = true
  try {
    const response = await getApiClient().get('greetings')
    greetings.value = Array.isArray(response) ? response : (response?.data ?? [])
  } catch {
    greetings.value = []
  } finally {
    greetingsLoading.value = false
  }
}

function syncEditFromIvr() {
  if (!ivr.value) return
  const r = ivr.value
  const clusterRaw = r.cluster ?? 'default'
  // IVR cluster may be stored as shortuid; resolve to pkey so dropdown displays pkey
  editCluster.value = tenantShortuidToPkey.value[clusterRaw] ?? clusterRaw
  editActive.value = r.active ?? 'YES'
  editCname.value = r.cname ?? ''
  editName.value = r.name ?? ''
  editDescription.value = r.description ?? ''
  editGreetnum.value = r.greetnum != null ? String(r.greetnum) : 'None'
  editListenforext.value = r.listenforext ?? 'NO'
  editTimeout.value = r.timeout ?? 'operator'
  for (let i = 0; i <= 11; i++) {
    options.value[`option${i}`] = r[`option${i}`] ?? 'None'
    tags.value[`tag${i}`] = r[`tag${i}`] ?? ''
    alerts.value[`alert${i}`] = r[`alert${i}`] ?? ''
  }
  // Reset validation state when loading IVR data
  clusterValidation.reset()
  greetnumValidation.reset()
}

async function fetchIvr() {
  if (!shortuid.value) return
  loading.value = true
  error.value = ''
  try {
    ivr.value = await getApiClient().get(`ivrs/${encodeURIComponent(shortuid.value)}`)
    syncEditFromIvr()
    editing.value = true
    saveError.value = ''
    if (editCluster.value) loadDestinations()
  } catch (err) {
    error.value = err.data?.message || err.message || 'Failed to load IVR'
    ivr.value = null
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadTenants()
  loadGreetings()
  fetchIvr()
})
watch(shortuid, fetchIvr)
watch(tenants, () => {
  if (ivr.value && editCluster.value) {
    const resolved = tenantShortuidToPkey.value[editCluster.value]
    if (resolved) editCluster.value = resolved
  }
}, { deep: true })
watch(editCluster, () => {
  if (editing.value) loadDestinations()
  if (clusterValidation.touched.value) {
    clusterValidation.validate()
  }
})
watch(editing, (isEditing) => {
  if (isEditing && editCluster.value) loadDestinations()
})

function goBack() {
  router.push({ name: 'ivrs' })
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
  
  // Validate all fields before submitting
  const validations = [
    { ...clusterValidation, fieldId: 'edit-cluster' },
    { ...greetnumValidation, fieldId: 'edit-greetnum' }
  ]
  
  if (!validateAll(validations)) {
    // Focus first error field
    await nextTick()
    focusFirstError(validations, (id) => document.getElementById(id))
    return
  }
  
  saving.value = true
  try {
    const body = {
      cluster: editCluster.value.trim(),
      active: editActive.value,
      ...buildIvrPayload(options.value, tags.value, alerts.value, editTimeout.value),
      listenforext: editListenforext.value
    }
    if (editCname.value.trim()) body.cname = editCname.value.trim()
    else body.cname = null
    if (editName.value.trim()) body.name = editName.value.trim()
    else body.name = null
    if (editDescription.value.trim()) body.description = editDescription.value.trim()
    if (editGreetnum.value && editGreetnum.value !== 'None') body.greetnum = parseInt(editGreetnum.value, 10)
    await getApiClient().put(`ivrs/${encodeURIComponent(shortuid.value)}`, body)
    await fetchIvr()
    editing.value = false
    toast.show(`IVR saved`)
  } catch (err) {
    const errors = fieldErrors(err)
    if (errors) {
      if (errors.cluster) {
        clusterValidation.touched.value = true
        clusterValidation.error.value = Array.isArray(errors.cluster) ? errors.cluster[0] : errors.cluster
      }
      if (errors.greetnum) {
        greetnumValidation.touched.value = true
        greetnumValidation.error.value = Array.isArray(errors.greetnum) ? errors.greetnum[0] : errors.greetnum
      }
      await nextTick()
      focusFirstError(validations, (id) => document.getElementById(id))
    }
    saveError.value = firstErrorMessage(err, 'Failed to update IVR')
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
    await getApiClient().delete(`ivrs/${encodeURIComponent(shortuid.value)}`)
    toast.show(`IVR deleted`)
    router.push({ name: 'ivrs' })
  } catch (err) {
    deleteError.value = err.data?.message ?? err.message ?? 'Failed to delete IVR'
  } finally {
    deleting.value = false
    confirmDeleteOpen.value = false
  }
}

</script>

<template>
  <div class="detail-view" @keydown="onKeydown">
    <h1>Edit IVR {{ ivr?.cname?.trim() ? ivr.cname.trim() : (ivr?.pkey ?? '…') }}</h1>

    <p v-if="loading" class="loading">Loading…</p>
    <p v-else-if="error" class="error">{{ error }}</p>
    <template v-else-if="ivr">
      <div class="detail-content">
        <p v-if="deleteError" class="error">{{ deleteError }}</p>

        <form class="edit-form" @submit="saveEdit">
          <p v-if="saveError" id="ivr-edit-error" class="error" role="alert">{{ saveError }}</p>

          <div class="edit-actions edit-actions-top">
            <button type="submit" :disabled="saving">{{ saving ? 'Saving…' : 'Save' }}</button>
            <button type="button" class="secondary" @click="cancelEdit">Cancel</button>
            <button type="button" class="action-delete" :disabled="deleting" @click="askConfirmDelete">
              {{ deleting ? 'Deleting…' : 'Delete' }}
            </button>
          </div>

          <h2 class="detail-heading">Identity</h2>
          <div class="form-fields">
            <FormReadonly
              id="edit-identity-pkey"
              label="IVR Direct Dial"
              :value="ivr.pkey ?? '—'"
            />
            <FormReadonly
              id="edit-identity-shortuid"
              label="Local UID"
              :value="ivr.shortuid ?? '—'"
            />
            <FormReadonly
              id="edit-identity-id"
              label="KSUID"
              :value="ivr.id ?? '—'"
            />
            <FormSelect
              id="edit-cluster"
              v-model="editCluster"
              label="Tenant"
              :options="tenantOptionsForSelect"
              :error="clusterValidation.error.value"
              :touched="clusterValidation.touched.value"
              :required="true"
              :disabled="destinationsLoading"
              hint="The tenant this IVR belongs to."
              @blur="clusterValidation.onBlur"
            />
            <FormField
              id="edit-description"
              v-model="editDescription"
              label="Description (optional)"
              type="text"
              placeholder="Freeform description"
            />
            <FormField
              id="edit-cname"
              v-model="editCname"
              label="Display name (optional)"
              type="text"
              placeholder="Common name / label"
            />
            <FormField
              id="edit-name"
              v-model="editName"
              label="Name (optional)"
              type="text"
              placeholder="Legacy name field"
            />
          </div>

          <h2 class="detail-heading">Settings</h2>
          <div class="form-fields">
            <FormToggle
              id="edit-active"
              v-model="editActive"
              label="Active?"
            />
            <FormSelect
              id="edit-greetnum"
              v-model="editGreetnum"
              label="Greeting Number"
              :options="greetingOptionsWithNone(editGreetnum)"
              :error="greetnumValidation.error.value"
              :touched="greetnumValidation.touched.value"
              :loading="greetingsLoading"
              hint="Greeting played when the IVR is activated. Greetings are created in the Greetings section."
              @blur="greetnumValidation.onBlur"
            />
            <FormToggle
              id="edit-listenforext"
              v-model="editListenforext"
              label="Listen for extension dial?"
            />
            <FormSelect
              id="edit-timeout"
              v-model="editTimeout"
              label="Action on IVR Timeout"
              :options="['operator', 'None']"
              :option-groups="destinationGroups"
              aria-label="Destination on timeout"
            />
          </div>

          <section class="destinations-section" aria-labelledby="ivr-edit-destinations-heading">
            <h2 id="ivr-edit-destinations-heading" class="destinations-heading">Keystroke options</h2>
            <div class="destinations-table">
              <div class="destinations-row destinations-header">
                <span class="dest-cell dest-key">Key</span>
                <span class="dest-cell dest-action">Action on KeyPress</span>
                <span class="dest-cell dest-tag">Tag</span>
                <span class="dest-cell dest-alert">Alert</span>
              </div>
              <template v-for="item in OPTION_ENTRIES" :key="item.key">
                <div class="destinations-row dest-row-fields" :class="{ 'destinations-row-none': options[item.key] === 'None' }">
                  <span class="dest-cell dest-key">{{ item.label }}</span>
                  <div class="dest-cell dest-action">
                    <FormSelect
                      :id="'edit-dest-' + item.key"
                      v-model="options[item.key]"
                      label="Action on KeyPress"
                      :aria-label="'Destination for key ' + item.label"
                      hide-label
                      :options="['None', 'Operator']"
                      :option-groups="destinationGroups"
                    />
                  </div>
                  <div class="dest-cell dest-tag">
                    <FormField
                      :id="'edit-tag-' + item.key"
                      v-model="tags[item.tagKey]"
                      label="Tag"
                      type="text"
                      placeholder="Tag"
                      :aria-label="'Tag for key ' + item.label"
                      hide-label
                      autocomplete="off"
                    />
                  </div>
                  <div class="dest-cell dest-alert">
                    <FormField
                      :id="'edit-alert-' + item.key"
                      v-model="alerts[item.alertKey]"
                      label="Alert"
                      type="text"
                      placeholder="Alert"
                      :aria-label="'Alert for key ' + item.label"
                      hide-label
                      autocomplete="off"
                    />
                  </div>
                </div>
              </template>
            </div>
            <p v-if="destinationsLoading" class="form-hint">Loading destinations…</p>
          </section>

          <div class="edit-actions">
            <button type="submit" :disabled="saving">{{ saving ? 'Saving…' : 'Save' }}</button>
            <button type="button" class="secondary" @click="cancelEdit">Cancel</button>
            <button type="button" class="action-delete" :disabled="deleting" @click="askConfirmDelete">
              {{ deleting ? 'Deleting…' : 'Delete' }}
            </button>
          </div>
        </form>
      </div>
    </template>

    <DeleteConfirmModal
      :show="confirmDeleteOpen"
      title="Delete IVR?"
      :loading="deleting"
      @confirm="confirmAndDelete"
      @cancel="cancelConfirmDelete"
    >
      <template #body>
        <p>IVR <strong>{{ ivr?.pkey ?? '—' }}</strong> will be permanently deleted. This cannot be undone.</p>
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
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-width: 52rem;
}
.edit-form label {
  font-size: 0.875rem;
  font-weight: 500;
}
.edit-label-block {
  display: block;
  margin-bottom: 0.25rem;
}
.form-label {
  font-size: 0.875rem;
  font-weight: 500;
  margin: 0;
}
.form-hint {
  font-size: 0.8125rem;
  color: #64748b;
  margin: 0.25rem 0 0 0;
}
/* iOS-style sliding pill toggle (on/off) */
.toggle-pill-ios {
  display: inline-block;
  cursor: pointer;
  user-select: none;
  vertical-align: middle;
}
.toggle-pill-ios input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
  pointer-events: none;
}
.toggle-pill-track {
  display: block;
  width: 51px;
  height: 31px;
  border-radius: 31px;
  background: #e2e8f0;
  position: relative;
  transition: background-color 0.2s ease;
}
.toggle-pill-thumb {
  position: absolute;
  left: 2px;
  top: 2px;
  width: 27px;
  height: 27px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s ease;
}
.toggle-pill-ios input:checked + .toggle-pill-track {
  background: #34c759;
}
.toggle-pill-ios input:checked + .toggle-pill-track .toggle-pill-thumb {
  transform: translateX(20px);
}
.toggle-pill-ios input:focus-visible + .toggle-pill-track {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}
.destinations-section {
  margin-top: 0.5rem;
  margin-bottom: 1.5rem;
  padding-top: 1rem;
}
.destinations-heading {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 1rem 0;
  color: #0f172a;
}
.timeout-select {
  min-width: 0;
  max-width: 20rem;
}
.destinations-table,
.readonly-destinations-table {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.destinations-row {
  display: grid;
  grid-template-columns: 2.5rem 1fr minmax(14rem, 1fr) minmax(20rem, 1fr);
  gap: 0.5rem 1rem;
  align-items: center;
}
.destinations-header {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #475569;
  padding-bottom: 0.25rem;
}
.destinations-row-none {
  opacity: 0.7;
}
.destinations-row-none .edit-input,
.destinations-row-none .dest-key {
  color: #64748b;
}
.readonly-destinations-table .dest-cell {
  font-size: 0.9375rem;
}
.readonly-destinations-table {
  margin-bottom: 1.5rem;
}
.dest-cell {
  min-width: 0;
}
.dest-row-fields .dest-cell :deep(.form-field) {
  margin-bottom: 0;
}
.dest-key {
  text-align: center;
  font-weight: 500;
}
.dest-action {
  min-width: 0;
}
.dest-tag,
.dest-alert {
  min-width: 0;
}
.destinations-row-none .dest-key,
.destinations-row-none .dest-cell :deep(.form-input),
.destinations-row-none .dest-cell :deep(.form-select) {
  color: #64748b;
}
.edit-input {
  padding: 0.5rem 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  font-size: 1rem;
  transition: border-color 0.15s ease;
}
.edit-input:focus {
  outline: none;
  border-color: #3b82f6;
}
.input-error {
  border-color: #dc2626;
  border-width: 2px;
}
.input-error:focus {
  border-color: #dc2626;
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
}
.input-valid {
  border-color: #16a34a;
}
.input-valid:focus {
  border-color: #16a34a;
  box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.1);
}
.field-error {
  color: #dc2626;
  font-size: 0.8125rem;
  margin: 0.25rem 0 0 0;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}
.field-error::before {
  content: "⚠";
  font-size: 0.875rem;
  flex-shrink: 0;
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
