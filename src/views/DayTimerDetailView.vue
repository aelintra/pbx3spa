<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useSchema } from '@/composables/useSchema'
import { useToastStore } from '@/stores/toast'
import { normalizeList } from '@/utils/listResponse'
import { loadTenantOptions } from '@/utils/loadTenantOptions'
import { firstErrorMessage } from '@/utils/formErrors'
import FormField from '@/components/forms/FormField.vue'
import FormSelect from '@/components/forms/FormSelect.vue'
import FormToggle from '@/components/forms/FormToggle.vue'
import FormReadonly from '@/components/forms/FormReadonly.vue'
import DeleteConfirmModal from '@/components/DeleteConfirmModal.vue'
import PanelBackLink from '@/components/PanelBackLink.vue'
import DetailActiveStatusBar from '@/components/DetailActiveStatusBar.vue'
import { COMMON_SCHEDULE_MODES, validateScheduleMode, validateSchedulePriority, validateDayOfWeek, normalizeDayOfWeek, dayOfWeekLabel } from '@/utils/validation'
const route = useRoute()
const router = useRouter()
const toast = useToastStore()
const { getSchema, ensureFetched } = useSchema()
function isReadOnly(field) {
  return getSchema('daytimers')?.read_only?.includes(field) ?? false
}

const daytimer = ref(null)
const tenants = ref([])
const routeProfiles = ref([])
const daytimersForSuggest = ref([])
const loading = ref(true)
const error = ref('')
const allday = ref('YES')
const editActive = ref('YES')
const editCluster = ref('default')
const editDayofweek = ref('*')
const editDescription = ref('')
const editMode = ref('closed')
const editPriority = ref(0)
const startTime = ref('09:00')
const endTime = ref('17:00')
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

/** pkey or shortuid → shortuid (profiles/daytimers store cluster as shortuid). */
const tenantPkeyToShortuid = computed(() => {
  const map = {}
  for (const t of tenants.value) {
    if (t.shortuid == null) continue
    const su = String(t.shortuid)
    map[su] = su
    if (t.pkey != null) map[String(t.pkey)] = su
  }
  return map
})

const dayOfWeekOptions = [
  { value: '*', label: 'Every day' },
  { value: 'mon-fri', label: 'Mon–Fri' },
  { value: 'mon-thu', label: 'Mon–Thu' },
  { value: 'tue-fri', label: 'Tue–Fri' },
  { value: 'sat-sun', label: 'Sat–Sun' },
  { value: 'mon', label: 'mon' },
  { value: 'tue', label: 'tue' },
  { value: 'wed', label: 'wed' },
  { value: 'thu', label: 'thu' },
  { value: 'fri', label: 'fri' },
  { value: 'sat', label: 'sat' },
  { value: 'sun', label: 'sun' }
]

const dayOfWeekOptionsForSelect = computed(() => {
  const cur = normalizeDayOfWeek(editDayofweek.value)
  const opts = [...dayOfWeekOptions]
  if (cur && !opts.some((o) => o.value === cur)) {
    opts.push({ value: cur, label: dayOfWeekLabel(cur) })
  }
  return opts
})

/** Presets + modes already used on this tenant (profiles + day timers). Type a new string anytime. */
const modeSuggestions = computed(() => {
  const seen = new Set(COMMON_SCHEDULE_MODES)
  const clusterVal = editCluster.value
  const clusterSu = tenantPkeyToShortuid.value[String(clusterVal)] ?? String(clusterVal)
  for (const p of routeProfiles.value) {
    const pTenant = tenantShortuidToPkey.value[String(p.cluster)] ?? p.cluster
    if (
      String(p.cluster) !== String(clusterVal) &&
      String(p.cluster) !== String(clusterSu) &&
      String(pTenant) !== String(clusterVal)
    ) {
      continue
    }
    for (const l of Array.isArray(p.lines) ? p.lines : []) {
      const m = String(l?.mode ?? '')
        .trim()
        .toLowerCase()
      if (m) seen.add(m)
    }
  }
  for (const d of daytimersForSuggest.value) {
    const dTenant = tenantShortuidToPkey.value[String(d.cluster)] ?? d.cluster
    if (
      String(d.cluster) !== String(clusterVal) &&
      String(d.cluster) !== String(clusterSu) &&
      String(dTenant) !== String(clusterVal)
    ) {
      continue
    }
    const m = String(d?.mode ?? '')
      .trim()
      .toLowerCase()
    if (m) seen.add(m)
  }
  const cur = String(editMode.value || '')
    .trim()
    .toLowerCase()
  if (cur) seen.add(cur)
  return [...seen].sort((a, b) => a.localeCompare(b))
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

function normalizeEditMode() {
  editMode.value = String(editMode.value || '')
    .trim()
    .toLowerCase()
}

function parseTimespan(ts) {
  if (ts == null || ts === '') return { start: '', end: '', allDay: true }
  const s = String(ts).trim()
  if (s === '*' || s === '*-*') return { start: '', end: '', allDay: true }
  const dash = s.indexOf('-')
  if (dash === -1) return { start: s || '', end: '', allDay: false }
  return {
    start: s.slice(0, dash).trim() || '',
    end: s.slice(dash + 1).trim() || '',
    allDay: false
  }
}

async function fetchTenants() {
  try {
    tenants.value = await loadTenantOptions()
  } catch {
    tenants.value = []
  }
}

async function fetchModeSuggestionSources() {
  try {
    const [profileResponse, daytimerResponse] = await Promise.all([
      getApiClient().get('routeprofiles'),
      getApiClient().get('daytimers')
    ])
    routeProfiles.value =
      normalizeList(profileResponse, 'routeprofiles') || normalizeList(profileResponse) || []
    daytimersForSuggest.value =
      normalizeList(daytimerResponse, 'daytimers') || normalizeList(daytimerResponse) || []
  } catch {
    routeProfiles.value = []
    daytimersForSuggest.value = []
  }
}

async function fetchDaytimer() {
  if (!shortuid.value) return
  loading.value = true
  error.value = ''
  try {
    daytimer.value = await getApiClient().get(`daytimers/${encodeURIComponent(shortuid.value)}`)
    const d = daytimer.value
    const clusterRaw = d?.cluster ?? 'default'
    editCluster.value = tenantShortuidToPkey.value[clusterRaw] ?? clusterRaw
    editDayofweek.value = normalizeDayOfWeek(d?.dayofweek ?? '*')
    editDescription.value = d?.description ?? ''
    editMode.value = (d?.mode || 'closed').toLowerCase()
    editPriority.value = d?.priority != null ? Number(d.priority) : 0
    editActive.value = d?.active === 'NO' ? 'NO' : 'YES'
    const parsed = parseTimespan(d?.timespan)
    allday.value = parsed.allDay ? 'YES' : 'NO'
    startTime.value = parsed.start || '09:00'
    endTime.value = parsed.end || '17:00'
  } catch (err) {
    error.value = firstErrorMessage(err, 'Failed to load Day timer')
    daytimer.value = null
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await ensureFetched()
  await fetchTenants()
  await fetchModeSuggestionSources()
  await fetchDaytimer()
})
watch(shortuid, fetchDaytimer)

function goBack() {
  router.push({ name: 'daytimers' })
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

function buildTimespan() {
  if (allday.value === 'YES') return '*'
  const s = (startTime.value || '').trim()
  const e = (endTime.value || '').trim()
  if (!s && !e) return '*'
  return `${s || '*'}-${e || '*'}`
}

const HHMM_REGEX = /^(2[0-3]|[01][0-9]):([0-5][0-9])$/

function validateTimespan() {
  if (allday.value === 'YES') return null
  const s = (startTime.value || '').trim()
  const e = (endTime.value || '').trim()
  if (!s) return 'Start time is required when not all day'
  if (!e) return 'End time is required when not all day'
  if (!HHMM_REGEX.test(s)) return 'Start time must be HH:MM (e.g. 09:00)'
  if (!HHMM_REGEX.test(e)) return 'End time must be HH:MM (e.g. 17:00)'
  return null
}

async function saveEdit(e) {
  e.preventDefault()
  saveError.value = ''
  const tsErr = validateTimespan()
  if (tsErr) {
    saveError.value = tsErr
    return
  }
  normalizeEditMode()
  editDayofweek.value = normalizeDayOfWeek(editDayofweek.value)
  const dowErr = validateDayOfWeek(editDayofweek.value)
  if (dowErr) {
    saveError.value = dowErr
    return
  }
  const modeErr = validateScheduleMode(editMode.value)
  if (modeErr) {
    saveError.value = modeErr
    return
  }
  const priErr = validateSchedulePriority(editPriority.value, { allowEmpty: false })
  if (priErr) {
    saveError.value = priErr
    return
  }
  saving.value = true
  try {
    const body = {
      cluster: editCluster.value.trim(),
      dayofweek: normalizeDayOfWeek(editDayofweek.value),
      description: editDescription.value.trim() || null,
      timespan: buildTimespan(),
      mode: editMode.value,
      priority: Number(editPriority.value),
      ...(isReadOnly('active') ? {} : { active: editActive.value })
    }
    await getApiClient().put(`daytimers/${encodeURIComponent(shortuid.value)}`, body)
    await fetchDaytimer()
    await fetchModeSuggestionSources()
    toast.show('Day timer saved')
  } catch (err) {
    saveError.value = firstErrorMessage(err, 'Failed to update Day timer')
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
    await getApiClient().delete(`daytimers/${encodeURIComponent(shortuid.value)}`)
    toast.show('Day timer deleted')
    router.push({ name: 'daytimers' })
  } catch (err) {
    deleteError.value = firstErrorMessage(err, 'Failed to delete Day timer')
  } finally {
    deleting.value = false
    confirmDeleteOpen.value = false
  }
}

const displayName = computed(() => daytimer.value?.description || daytimer.value?.shortuid || '')

const panelTitleTenantSuffix = computed(() => {
  if (!daytimer.value) return ''
  const t = String(editCluster.value ?? '').trim()
  if (!t) return ''
  return ` (${t})`
})
</script>

<template>
  <div class="detail-view" @keydown="onKeydown">
    <PanelBackLink :to="{ name: 'daytimers' }" label="Day Timers">
      <div class="detail-panel-head">
        <div class="detail-title-status-row">
          <h1 class="detail-panel-title">
            Edit Day timer{{ displayName ? ` — ${displayName}` : '' }}{{ panelTitleTenantSuffix }}
          </h1>
          <DetailActiveStatusBar
            v-if="daytimer"
            v-model="editActive"
            :readonly="isReadOnly('active')"
            toggle-id="edit-daytimer-active"
          />
        </div>
        <p v-if="daytimer && editActive === 'NO'" class="detail-active-inactive-hint" role="status">
          Inactive day timers are not used in schedules until you activate this record and commit
          the change.
        </p>
      </div>
    </PanelBackLink>

    <p v-if="loading" class="loading">Loading…</p>
    <p v-else-if="error" class="error">{{ error }}</p>
    <template v-else-if="daytimer">
      <div class="detail-content">
        <p v-if="deleteError" class="error">{{ deleteError }}</p>

        <form class="edit-form" @submit="saveEdit">
          <p v-if="saveError" id="daytimer-edit-error" class="error" role="alert">
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
            <template v-if="daytimer.shortuid != null && daytimer.shortuid !== ''">
              <FormReadonly
                v-if="isReadOnly('shortuid')"
                id="edit-shortuid"
                label="UID"
                :value="daytimer.shortuid"
                class="readonly-identity"
              />
            </template>
            <FormReadonly
              v-if="daytimer.id != null && daytimer.id !== ''"
              id="edit-id"
              label="KSUID"
              :value="daytimer.id"
              class="readonly-identity"
            />
            <FormReadonly
              v-if="daytimer.state != null"
              id="edit-state"
              label="State"
              :value="daytimer.state"
              class="readonly-identity"
            />
          </div>

          <h2 class="detail-heading">Rule</h2>
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
              placeholder="e.g. Office hours"
            />
            <FormField
              id="edit-mode"
              v-model="editMode"
              label="Mode when matched"
              help-pkey="mode"
              type="text"
              placeholder="e.g. lunch or evening"
              list="daytimer-mode-suggestions"
              hint="Presets and modes already used on this tenant. Type a new mode anytime (same string on the route profile)."
              @blur="normalizeEditMode"
            />
            <datalist id="daytimer-mode-suggestions">
              <option v-for="m in modeSuggestions" :key="m" :value="m" />
            </datalist>
            <FormField
              id="edit-priority"
              v-model="editPriority"
              label="Priority (higher wins)"
              help-pkey="priority"
              type="number"
              min="0"
              max="9999"
            />
            <FormSelect
              id="edit-dayofweek"
              v-model="editDayofweek"
              label="Day of week"
              :options="dayOfWeekOptionsForSelect"
            />
            <FormToggle
              id="edit-allday"
              v-model="allday"
              label="All day"
              yes-value="YES"
              no-value="NO"
            />
            <template v-if="allday === 'NO'">
              <FormField
                id="edit-start"
                v-model="startTime"
                label="Start time"
                help-pkey="start"
                type="text"
                placeholder="HH:MM e.g. 09:00"
              />
              <FormField
                id="edit-end"
                v-model="endTime"
                label="End time"
                help-pkey="end"
                type="text"
                placeholder="HH:MM e.g. 17:00"
              />
            </template>
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
      title="Delete Day timer?"
      :loading="deleting"
      @confirm="confirmAndDelete"
      @cancel="cancelConfirmDelete"
    >
      <template #body>
        <p>
          Day timer <strong>{{ displayName || shortuid }}</strong> will be permanently deleted. This
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
