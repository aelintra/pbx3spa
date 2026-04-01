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
import FormReadonly from '@/components/forms/FormReadonly.vue'
import DeleteConfirmModal from '@/components/DeleteConfirmModal.vue'
import PanelBackLink from '@/components/PanelBackLink.vue'

const route = useRoute()
const router = useRouter()
const toast = useToastStore()
const { getSchema, ensureFetched } = useSchema()
function isReadOnly(field) {
  return getSchema('holidaytimers')?.read_only?.includes(field) ?? false
}

const holidaytimer = ref(null)
const tenants = ref([])
const destinations = ref(null)
const destinationsLoading = ref(false)
const loading = ref(true)
const error = ref('')
const editCluster = ref('default')
const editDescription = ref('')
const editRoute = ref('')
const startDate = ref('')
const startTime = ref('')
const endDate = ref('')
const endTime = ref('')
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

/** Internal destinations for route dropdown (Queues, Extensions, IVRs, CustomApps) — same shape as Inbound Route. */
function toDestArrays(d) {
  if (!d || typeof d !== 'object') return {}
  return {
    Queues: Array.isArray(d.Queues) ? d.Queues : (Array.isArray(d.queues) ? d.queues : []),
    Extensions: Array.isArray(d.Extensions) ? d.Extensions : (Array.isArray(d.extensions) ? d.extensions : []),
    IVRs: Array.isArray(d.IVRs) ? d.IVRs : (Array.isArray(d.ivrs) ? d.ivrs : []),
    CustomApps: Array.isArray(d.CustomApps) ? d.CustomApps : (Array.isArray(d.customApps) ? d.customApps : [])
  }
}

const destinationGroups = computed(() => toDestArrays(destinations.value))

/** Epoch seconds → date input value (YYYY-MM-DD) in local time */
function epochToDate(epoch) {
  if (epoch == null || epoch === '') return ''
  const d = new Date(Number(epoch) * 1000)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Epoch seconds → time input value (HH:mm) in local time */
function epochToTime(epoch) {
  if (epoch == null || epoch === '') return ''
  const d = new Date(Number(epoch) * 1000)
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${min}`
}

/** Date (YYYY-MM-DD) + time (HH:mm) in local time → epoch seconds */
function dateAndTimeToEpoch(dateStr, timeStr) {
  if (dateStr == null || String(dateStr).trim() === '') return null
  const datePart = String(dateStr).trim()
  const timePart = (timeStr != null && String(timeStr).trim() !== '') ? String(timeStr).trim() : '00:00'
  const d = new Date(`${datePart}T${timePart}`)
  if (Number.isNaN(d.getTime())) return null
  return Math.floor(d.getTime() / 1000)
}

function stateDisplay(item) {
  if (!item) return '—'
  const stime = item.stime != null ? Number(item.stime) : null
  const etime = item.etime != null ? Number(item.etime) : null
  if (stime == null || etime == null) return '—'
  const now = Math.floor(Date.now() / 1000)
  return now >= stime && now < etime ? '*INUSE*' : 'IDLE'
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
    const body = response && typeof response === 'object' ? (response.data ?? response) : null
    destinations.value = body && typeof body === 'object' ? body : null
  } catch {
    destinations.value = null
  } finally {
    destinationsLoading.value = false
  }
}

async function fetchTenants() {
  try {
    const response = await getApiClient().get('tenants')
    tenants.value = normalizeList(response, 'tenants')
  } catch {
    tenants.value = []
  }
}

async function fetchHolidaytimer() {
  if (!shortuid.value) return
  loading.value = true
  error.value = ''
  try {
    holidaytimer.value = await getApiClient().get(`holidaytimers/${encodeURIComponent(shortuid.value)}`)
    const h = holidaytimer.value
    const clusterRaw = h?.cluster ?? 'default'
    editCluster.value = tenantShortuidToPkey.value[clusterRaw] ?? clusterRaw
    editDescription.value = h?.description ?? ''
    editRoute.value = (h?.route && String(h.route).trim() !== '') ? String(h.route).trim() : ''
    startDate.value = epochToDate(h?.stime)
    startTime.value = epochToTime(h?.stime)
    endDate.value = epochToDate(h?.etime)
    endTime.value = epochToTime(h?.etime)
  } catch (err) {
    error.value = firstErrorMessage(err, 'Failed to load Holiday timer')
    holidaytimer.value = null
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await ensureFetched()
  await fetchTenants()
  await fetchHolidaytimer()
  if (editCluster.value) loadDestinations()
})
watch(shortuid, fetchHolidaytimer)
watch(editCluster, () => {
  loadDestinations()
})

function goBack() {
  router.push({ name: 'holidaytimers' })
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

function validateDateTime() {
  const stime = dateAndTimeToEpoch(startDate.value, startTime.value)
  const etime = dateAndTimeToEpoch(endDate.value, endTime.value)
  if (stime != null && etime != null && etime < stime) {
    return 'End date/time must be after start date/time.'
  }
  return null
}

async function saveEdit(e) {
  e.preventDefault()
  saveError.value = ''
  const err = validateDateTime()
  if (err) {
    saveError.value = err
    return
  }
  saving.value = true
  try {
    const stime = dateAndTimeToEpoch(startDate.value, startTime.value)
    const etime = dateAndTimeToEpoch(endDate.value, endTime.value)
    const body = {
      cluster: editCluster.value.trim(),
      description: editDescription.value.trim() || null,
      route: (editRoute.value && editRoute.value.trim() !== '') ? editRoute.value.trim() : null,
      stime: stime ?? undefined,
      etime: etime ?? undefined
    }
    await getApiClient().put(`holidaytimers/${encodeURIComponent(shortuid.value)}`, body)
    await fetchHolidaytimer()
    toast.show('Holiday timer saved')
  } catch (err) {
    saveError.value = firstErrorMessage(err, 'Failed to update Holiday timer')
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
    await getApiClient().delete(`holidaytimers/${encodeURIComponent(shortuid.value)}`)
    toast.show('Holiday timer deleted')
    router.push({ name: 'holidaytimers' })
  } catch (err) {
    deleteError.value = firstErrorMessage(err, 'Failed to delete Holiday timer')
  } finally {
    deleting.value = false
    confirmDeleteOpen.value = false
  }
}

const displayName = computed(() => holidaytimer.value?.description || holidaytimer.value?.shortuid || '')

const panelTitleTenantSuffix = computed(() => {
  if (!holidaytimer.value) return ''
  const t = String(editCluster.value ?? '').trim()
  if (!t) return ''
  return ` (${t})`
})
</script>

<template>
  <div class="detail-view" @keydown="onKeydown">
    <PanelBackLink :to="{ name: 'holidaytimers' }" label="Holiday Timers">
      <h1>Edit Holiday timer{{ displayName ? ` — ${displayName}` : '' }}{{ panelTitleTenantSuffix }}</h1>
    </PanelBackLink>

    <p v-if="loading" class="loading">Loading…</p>
    <p v-else-if="error" class="error">{{ error }}</p>
    <template v-else-if="holidaytimer">
      <div class="detail-content">
        <p v-if="deleteError" class="error">{{ deleteError }}</p>

        <form class="edit-form" @submit="saveEdit">
          <p v-if="saveError" id="holidaytimer-edit-error" class="error" role="alert">{{ saveError }}</p>

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
            <FormReadonly v-if="holidaytimer.shortuid != null && holidaytimer.shortuid !== ''" id="edit-shortuid" label="UID" :value="holidaytimer.shortuid" class="readonly-identity" />
            <FormReadonly v-if="holidaytimer.id != null && holidaytimer.id !== ''" id="edit-id" label="KSUID" :value="holidaytimer.id" class="readonly-identity" />
            <FormReadonly v-if="stateDisplay(holidaytimer)" id="edit-state" label="State" :value="stateDisplay(holidaytimer)" class="readonly-identity" />
          </div>

          <h2 class="detail-heading">Holiday</h2>
          <div class="form-fields">
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
              type="text"
              placeholder="e.g. Christmas"
            />
            <FormSelect
              id="edit-route"
              v-model="editRoute"
              label="Route"
              :options="['Operator']"
              :option-groups="destinationGroups"
              :loading="destinationsLoading"
              empty-text="None"
              hint="Internal destination when this holiday is active (queue, extension, IVR, custom app). Leave empty for none."
            />
            <FormField
              id="edit-start-date"
              v-model="startDate"
              label="Start date"
              type="date"
              hint="Start of holiday period (local time)"
            />
            <FormField
              id="edit-start-time"
              v-model="startTime"
              label="Start time"
              type="time"
              hint="Start time (local)"
            />
            <FormField
              id="edit-end-date"
              v-model="endDate"
              label="End date"
              type="date"
              hint="End of holiday period (local time)"
            />
            <FormField
              id="edit-end-time"
              v-model="endTime"
              label="End time"
              type="time"
              hint="End time (local)"
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
      title="Delete Holiday timer?"
      :loading="deleting"
      @confirm="confirmAndDelete"
      @cancel="cancelConfirmDelete"
    >
      <template #body>
        <p>Holiday timer <strong>{{ displayName || shortuid }}</strong> will be permanently deleted. This cannot be undone.</p>
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
