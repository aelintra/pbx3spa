<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useSchema } from '@/composables/useSchema'
import { useToastStore } from '@/stores/toast'
import { useFormValidation } from '@/composables/useFormValidation'
import { validateTenant } from '@/utils/validation'
import { loadTenantOptions } from '@/utils/loadTenantOptions'
import { fieldErrors, firstErrorMessage } from '@/utils/formErrors'
import FormField from '@/components/forms/FormField.vue'
import FormSelect from '@/components/forms/FormSelect.vue'
import PanelBackLink from '@/components/PanelBackLink.vue'

const HOLIDAY_FORCE_MODE_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' }
]

const router = useRouter()
const toast = useToastStore()
const { ensureFetched, applySchemaDefaults } = useSchema()
const description = ref('')
const cluster = ref('default')
const forceMode = ref('closed')
const route = ref('Operator')
const tenants = ref([])
const destinations = ref(null)
const destinationsLoading = ref(false)
const tenantsLoading = ref(true)
const error = ref('')
const loading = ref(false)

const clusterValidation = useFormValidation(cluster, validateTenant)
/** Bumps after mount so description input remounts empty (avoids browser autofill on id=description). */
const descriptionInputKey = ref(0)

/** Epoch seconds → datetime-local (local browser timezone). */
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

function datetimeLocalToEpoch(s) {
  if (s == null || String(s).trim() === '') return null
  const d = new Date(String(s).trim())
  if (Number.isNaN(d.getTime())) return null
  return Math.floor(d.getTime() / 1000)
}

function defaultHolidayStartLocal() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return epochToDatetimeLocal(Math.floor(d.getTime() / 1000))
}

function defaultHolidayEndLocal() {
  const d = new Date()
  d.setHours(23, 59, 0, 0)
  return epochToDatetimeLocal(Math.floor(d.getTime() / 1000))
}

const startLocal = ref(defaultHolidayStartLocal())
const endLocal = ref(defaultHolidayEndLocal())

function toDestArrays(d) {
  if (!d || typeof d !== 'object') return {}
  return {
    Queues: Array.isArray(d.Queues) ? d.Queues : Array.isArray(d.queues) ? d.queues : [],
    Extensions: Array.isArray(d.Extensions)
      ? d.Extensions
      : Array.isArray(d.extensions)
        ? d.extensions
        : [],
    IVRs: Array.isArray(d.IVRs) ? d.IVRs : Array.isArray(d.ivrs) ? d.ivrs : [],
    CustomApps: Array.isArray(d.CustomApps)
      ? d.CustomApps
      : Array.isArray(d.customApps)
        ? d.customApps
        : []
  }
}

const destinationGroups = computed(() => toDestArrays(destinations.value))

const tenantOptionsForSelect = computed(() => {
  const list = tenants.value.map((t) => t.pkey).filter(Boolean)
  const unique = [...new Set(list)].sort((a, b) => String(a).localeCompare(String(b)))
  const cur = cluster.value
  if (cur && !unique.includes(cur))
    return [cur, ...unique].sort((a, b) => String(a).localeCompare(String(b)))
  return unique
})

async function loadTenants() {
  tenantsLoading.value = true
  try {
    tenants.value = await loadTenantOptions()
    if (tenants.value.length && !cluster.value) {
      const first = tenants.value.find((t) => t.pkey === 'default')?.pkey ?? tenants.value[0]?.pkey
      if (first) cluster.value = first
    }
  } catch {
    tenants.value = []
  } finally {
    tenantsLoading.value = false
  }
}

async function loadDestinations() {
  const c = cluster.value
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

onMounted(async () => {
  description.value = ''
  await ensureFetched()
  applySchemaDefaults('holidaytimers', {
    cluster
  })
  description.value = ''
  await loadTenants()
  if (cluster.value) await loadDestinations()
  description.value = ''
  descriptionInputKey.value += 1
})

watch(cluster, () => {
  loadDestinations()
})

function goBack() {
  router.push({ name: 'holidaytimers' })
}

function onKeydown(e) {
  if (e.key === 'Escape') {
    e.preventDefault()
    goBack()
  }
}

function validateDateTime() {
  const stime = datetimeLocalToEpoch(startLocal.value)
  const etime = datetimeLocalToEpoch(endLocal.value)
  if (stime == null) return 'Start date/time is required'
  if (etime == null) return 'End date/time is required'
  if (etime < stime) return 'End date/time must be after start date/time.'
  return null
}

async function onSubmit(e) {
  e.preventDefault()
  error.value = ''

  if (!clusterValidation.validate()) {
    await nextTick()
    const el = document.getElementById('cluster')
    if (el) el.focus()
    return
  }

  const dtErr = validateDateTime()
  if (dtErr) {
    error.value = dtErr
    return
  }

  loading.value = true
  try {
    const stime = datetimeLocalToEpoch(startLocal.value)
    const etime = datetimeLocalToEpoch(endLocal.value)
    const dest = (route.value && String(route.value).trim()) || 'Operator'
    const mode =
      String(forceMode.value || 'closed')
        .trim()
        .toLowerCase() === 'open'
        ? 'open'
        : 'closed'
    const body = {
      description: description.value.trim() || null,
      cluster: cluster.value.trim(),
      force_mode: mode,
      force_dest: dest,
      route: dest,
      stime,
      etime
    }
    const created = await getApiClient().post('holidaytimers', body)
    toast.show('Holiday timer created')
    if (created?.shortuid) {
      router.push({ name: 'holidaytimer-detail', params: { shortuid: created.shortuid } })
    } else {
      goBack()
    }
  } catch (err) {
    const errors = fieldErrors(err)
    if (errors) {
      if (errors.cluster) {
        clusterValidation.touched.value = true
        clusterValidation.error.value = Array.isArray(errors.cluster)
          ? errors.cluster[0]
          : errors.cluster
      }
      await nextTick()
      const el = document.getElementById('cluster')
      if (el) el.focus()
    }
    if (!errors) error.value = firstErrorMessage(err, 'Failed to create Holiday timer')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="create-view" @keydown="onKeydown">
    <PanelBackLink :to="{ name: 'holidaytimers' }" label="Holiday Timers">
      <h1>Create Holiday timer</h1>
    </PanelBackLink>

    <form class="form" autocomplete="off" @submit="onSubmit">
      <p v-if="error" id="holidaytimer-create-error" class="error" role="alert">{{ error }}</p>

      <div class="actions actions-top">
        <button type="submit" :disabled="loading || tenantsLoading">
          {{ loading ? 'Creating…' : 'Create' }}
        </button>
        <button type="button" class="secondary" @click="goBack">Cancel</button>
      </div>

      <h2 class="detail-heading">Holiday</h2>
      <div class="form-fields">
        <FormSelect
          id="cluster"
          v-model="cluster"
          label="Tenant"
          :options="tenantOptionsForSelect"
          :error="clusterValidation.error.value"
          :touched="clusterValidation.touched.value"
          :required="true"
          :loading="tenantsLoading"
          @blur="clusterValidation.onBlur"
        />
        <FormField
          id="holiday-description"
          v-model="description"
          label="Description"
          help-pkey="description"
          :input-key="descriptionInputKey"
          type="text"
          placeholder="e.g. Xmas"
          autocomplete="off"
        />
        <FormSelect
          id="force-mode"
          v-model="forceMode"
          label="Force mode"
          :options="HOLIDAY_FORCE_MODE_OPTIONS"
          hide-help
        />
        <FormSelect
          id="route"
          v-model="route"
          label="Force destination"
          :options="['Operator']"
          :option-groups="destinationGroups"
          :loading="destinationsLoading"
        />
        <FormField
          id="start-datetime"
          v-model="startLocal"
          label="Start"
          help-pkey="start_datetime"
          type="datetime-local"
          :step="60"
          required
        />
        <FormField
          id="end-datetime"
          v-model="endLocal"
          label="End"
          help-pkey="end_datetime"
          type="datetime-local"
          :step="60"
          required
        />
      </div>

      <div class="actions">
        <button type="submit" :disabled="loading || tenantsLoading">
          {{ loading ? 'Creating…' : 'Create' }}
        </button>
        <button type="button" class="secondary" @click="goBack">Cancel</button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.create-view {
  max-width: 52rem;
}
.form {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
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
.error {
  color: #dc2626;
  font-size: 0.875rem;
  margin: 0;
}
.actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.25rem;
}
.actions-top {
  margin-top: 0;
}
.actions button {
  padding: 0.5rem 1rem;
  font-size: 0.9375rem;
  font-weight: 500;
  border-radius: 0.375rem;
  cursor: pointer;
}
.actions button[type='submit'] {
  color: #fff;
  background: #2563eb;
  border: none;
}
.actions button[type='submit']:hover:not(:disabled) {
  background: #1d4ed8;
}
.actions button[type='submit']:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
.actions button.secondary {
  color: #64748b;
  background: transparent;
  border: 1px solid #e2e8f0;
}
.actions button.secondary:hover {
  background: #f1f5f9;
}
</style>
