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

const route = useRoute()
const router = useRouter()
const toast = useToastStore()
const { getSchema, ensureFetched } = useSchema()
function isReadOnly(field) {
  return getSchema('holidaytimers')?.read_only?.includes(field) ?? false
}

const holidaytimer = ref(null)
const tenants = ref([])
const routes = ref([])
const routesLoading = ref(false)
const loading = ref(true)
const error = ref('')
const editCluster = ref('default')
const editDescription = ref('')
const editRoute = ref('')
const startDateTime = ref('')
const endDateTime = ref('')
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

/** Route select options: None (empty) + route pkeys from GET /routes */
const routeOptions = computed(() => {
  const list = (routes.value || []).map((r) => r.pkey).filter(Boolean)
  const uniq = [...new Set(list)].sort((a, b) => String(a).localeCompare(String(b)))
  return ['', ...uniq]
})

const routeOptionsForSelect = computed(() => {
  const list = routeOptions.value
  const cur = editRoute.value
  if (cur && !list.includes(cur)) return [cur, ...list].filter(Boolean)
  return list
})

/** Epoch seconds → datetime-local value (YYYY-MM-DDTHH:mm) in local time */
function epochToDatetimeLocal(epoch) {
  if (epoch == null || epoch === '') return ''
  const d = new Date(Number(epoch) * 1000)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day}T${h}:${min}`
}

/** datetime-local value (YYYY-MM-DDTHH:mm) → epoch seconds (local time interpreted) */
function datetimeLocalToEpoch(value) {
  if (value == null || String(value).trim() === '') return null
  const s = String(value).trim()
  const d = new Date(s)
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

async function loadRoutes() {
  routesLoading.value = true
  try {
    const response = await getApiClient().get('routes')
    routes.value = normalizeList(response, 'routes')
  } catch {
    routes.value = []
  } finally {
    routesLoading.value = false
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
    startDateTime.value = epochToDatetimeLocal(h?.stime)
    endDateTime.value = epochToDatetimeLocal(h?.etime)
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
  await loadRoutes()
  await fetchHolidaytimer()
})
watch(shortuid, fetchHolidaytimer)

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
  const stime = datetimeLocalToEpoch(startDateTime.value)
  const etime = datetimeLocalToEpoch(endDateTime.value)
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
    const stime = datetimeLocalToEpoch(startDateTime.value)
    const etime = datetimeLocalToEpoch(endDateTime.value)
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
</script>

<template>
  <div class="detail-view" @keydown="onKeydown">
    <h1>Edit Holiday timer {{ displayName ? `— ${displayName}` : '' }}</h1>

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
            <FormReadonly v-if="holidaytimer.pkey != null" id="edit-pkey" label="pkey" :value="String(holidaytimer.pkey)" class="readonly-identity" />
            <FormReadonly v-if="holidaytimer.shortuid != null && holidaytimer.shortuid !== ''" id="edit-shortuid" label="Local UID" :value="holidaytimer.shortuid" class="readonly-identity" />
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
              :options="routeOptionsForSelect"
              :loading="routesLoading"
              empty-text="None"
              hint="Override route when this holiday is active. Leave empty for none."
            />
            <FormField
              id="edit-start"
              v-model="startDateTime"
              label="Start date & time"
              type="datetime-local"
              hint="Start of holiday period (local time)"
            />
            <FormField
              id="edit-end"
              v-model="endDateTime"
              label="End date & time"
              type="datetime-local"
              hint="End of holiday period (local time)"
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
