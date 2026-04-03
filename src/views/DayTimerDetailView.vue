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
import FormToggle from '@/components/forms/FormToggle.vue'
import FormReadonly from '@/components/forms/FormReadonly.vue'
import DeleteConfirmModal from '@/components/DeleteConfirmModal.vue'
import PanelBackLink from '@/components/PanelBackLink.vue'

const route = useRoute()
const router = useRouter()
const toast = useToastStore()
const { getSchema, ensureFetched } = useSchema()
function isReadOnly(field) {
  return getSchema('daytimers')?.read_only?.includes(field) ?? false
}

const daytimer = ref(null)
const tenants = ref([])
const loading = ref(true)
const error = ref('')
const allday = ref('YES')
const editCluster = ref('default')
const editDayofweek = ref('*')
const editDescription = ref('')
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

const dayOfWeekOptions = ['*', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

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
    const response = await getApiClient().get('tenants')
    tenants.value = normalizeList(response, 'tenants')
  } catch {
    tenants.value = []
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
    editDayofweek.value = d?.dayofweek ?? '*'
    editDescription.value = d?.description ?? ''
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
  saving.value = true
  try {
    const body = {
      cluster: editCluster.value.trim(),
      dayofweek: editDayofweek.value,
      description: editDescription.value.trim() || null,
      timespan: buildTimespan()
    }
    await getApiClient().put(`daytimers/${encodeURIComponent(shortuid.value)}`, body)
    await fetchDaytimer()
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
      <h1>Edit Day timer{{ displayName ? ` — ${displayName}` : '' }}{{ panelTitleTenantSuffix }}</h1>
    </PanelBackLink>

    <p v-if="loading" class="loading">Loading…</p>
    <p v-else-if="error" class="error">{{ error }}</p>
    <template v-else-if="daytimer">
      <div class="detail-content">
        <p v-if="deleteError" class="error">{{ deleteError }}</p>

        <form class="edit-form" @submit="saveEdit">
          <p v-if="saveError" id="daytimer-edit-error" class="error" role="alert">{{ saveError }}</p>

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
              <FormReadonly v-if="isReadOnly('shortuid')" id="edit-shortuid" label="UID" :value="daytimer.shortuid" class="readonly-identity" />
            </template>
            <FormReadonly v-if="daytimer.id != null && daytimer.id !== ''" id="edit-id" label="KSUID" :value="daytimer.id" class="readonly-identity" />
            <FormReadonly v-if="daytimer.state != null" id="edit-state" label="State" :value="daytimer.state" class="readonly-identity" />
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
            <FormSelect
              id="edit-dayofweek"
              v-model="editDayofweek"
              label="Day of week"
              :options="dayOfWeekOptions"
              hint="* = every day; mon–sun = weekday"
            />
            <FormToggle
              id="edit-allday"
              v-model="allday"
              label="All day"
              yes-value="YES"
              no-value="NO"
              hint="If yes, the rule is active all day; otherwise set start and end time."
            />
            <template v-if="allday === 'NO'">
              <FormField
                id="edit-start"
                v-model="startTime"
                label="Start time"
                type="text"
                placeholder="HH:MM e.g. 09:00"
                hint="24-hour format HH:MM"
              />
              <FormField
                id="edit-end"
                v-model="endTime"
                label="End time"
                type="text"
                placeholder="HH:MM e.g. 17:00"
                hint="24-hour format HH:MM"
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
        <p>Day timer <strong>{{ displayName || shortuid }}</strong> will be permanently deleted. This cannot be undone.</p>
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
.edit-form { margin-bottom: 1rem; display: flex; flex-direction: column; gap: 0.75rem; max-width: 52rem; }
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
