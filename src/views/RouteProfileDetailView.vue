<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useToastStore } from '@/stores/toast'
import { normalizeList } from '@/utils/listResponse'
import { loadTenantOptions } from '@/utils/loadTenantOptions'
import { firstErrorMessage } from '@/utils/formErrors'
import {
  COMMON_SCHEDULE_MODES,
  validateScheduleMode
} from '@/utils/validation'
import FormField from '@/components/forms/FormField.vue'
import FormSelect from '@/components/forms/FormSelect.vue'
import FormReadonly from '@/components/forms/FormReadonly.vue'
import DeleteConfirmModal from '@/components/DeleteConfirmModal.vue'
import PanelBackLink from '@/components/PanelBackLink.vue'

const route = useRoute()
const router = useRouter()
const toast = useToastStore()

const profile = ref(null)
const tenants = ref([])
const destinations = ref(null)
const routes = ref([])
const destinationsLoading = ref(false)
const loading = ref(true)
const error = ref('')
const editName = ref('')
const editCluster = ref('default')
const editDescription = ref('')
const openDest = ref('')
const closedDest = ref('')
const extraLines = ref([])
const openError = ref('')
const openTouched = ref(false)
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

const destinationGroups = computed(() => {
  const d = destinations.value
  const clusterVal = editCluster.value
  const routeList = routes.value || []
  const routesForCluster = clusterVal
    ? routeList
        .filter((r) => (r.cluster ?? r.tenant_pkey ?? '') === clusterVal)
        .map((r) => r.pkey)
        .filter(Boolean)
    : []
  const base = toDestArrays(d)
  return {
    ...base,
    Routes: [...new Set(routesForCluster)].sort((a, b) => String(a).localeCompare(String(b)))
  }
})

const destPickOptions = computed(() => ['', 'Operator'])

const destBaseOptions = computed(() => ['None', 'Operator'])

function isNoneDest(v) {
  const t = String(v ?? '').trim()
  return !t || t.toLowerCase() === 'none'
}

function normalizeDestPick(v) {
  const t = String(v ?? '').trim()
  if (!t || t.toLowerCase() === 'none') return ''
  return t
}

function syncLinesFromProfile(rawLines) {
  const arr = (Array.isArray(rawLines) ? rawLines : []).map((l) => ({
    mode: String(l.mode || '').toLowerCase(),
    destination: l.destination || 'None'
  }))
  const open = arr.find((l) => l.mode === 'open')
  const closed = arr.find((l) => l.mode === 'closed')
  openDest.value = normalizeDestPick(open?.destination)
  closedDest.value = normalizeDestPick(closed?.destination)
  extraLines.value = arr
    .filter((l) => l.mode && l.mode !== 'open' && l.mode !== 'closed')
    .map((l) => ({ mode: l.mode, destination: l.destination || 'None' }))
}

function validateOpen() {
  openTouched.value = true
  if (isNoneDest(openDest.value)) {
    openError.value = 'Open destination is required'
    return false
  }
  openError.value = ''
  return true
}

async function loadDestinations() {
  const c = editCluster.value
  if (!c) {
    destinations.value = null
    routes.value = []
    return
  }
  destinationsLoading.value = true
  try {
    const [destResponse, routeResponse] = await Promise.all([
      getApiClient().get('destinations', { params: { cluster: c } }),
      getApiClient().get('routes')
    ])
    const destBody =
      destResponse && typeof destResponse === 'object' ? (destResponse.data ?? destResponse) : null
    destinations.value = destBody && typeof destBody === 'object' ? destBody : null
    routes.value = normalizeList(routeResponse, 'routes')
  } catch {
    destinations.value = null
    routes.value = []
  } finally {
    destinationsLoading.value = false
  }
}

async function fetchTenants() {
  try {
    tenants.value = await loadTenantOptions()
  } catch {
    tenants.value = []
  }
}

async function fetchProfile() {
  if (!shortuid.value) return
  loading.value = true
  error.value = ''
  try {
    profile.value = await getApiClient().get(`routeprofiles/${encodeURIComponent(shortuid.value)}`)
    const p = profile.value
    const clusterRaw = p?.cluster ?? 'default'
    editCluster.value = tenantShortuidToPkey.value[clusterRaw] ?? clusterRaw
    editName.value = p?.name ?? ''
    editDescription.value = p?.description ?? ''
    syncLinesFromProfile(p?.lines)
    openTouched.value = false
    openError.value = ''
    await loadDestinations()
  } catch (err) {
    error.value = firstErrorMessage(err, 'Failed to load Route profile')
    profile.value = null
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await fetchTenants()
  await fetchProfile()
})
watch(shortuid, fetchProfile)
watch(editCluster, () => {
  openDest.value = ''
  closedDest.value = ''
  loadDestinations()
})

watch(openDest, (v) => {
  if (!isNoneDest(v) && isNoneDest(closedDest.value)) {
    closedDest.value = v
  }
  if (openTouched.value) validateOpen()
})

function addLine() {
  extraLines.value.push({ mode: '', destination: 'None' })
}

function removeLine(i) {
  extraLines.value.splice(i, 1)
}

function goBack() {
  router.push({ name: 'routeprofiles' })
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
  if (!editName.value.trim()) {
    saveError.value = 'Name is required'
    return
  }
  if (!validateOpen()) return

  const open = openDest.value.trim()
  const closed = isNoneDest(closedDest.value) ? open : closedDest.value.trim()
  const bodyLines = [
    { mode: 'open', destination: open },
    { mode: 'closed', destination: closed }
  ]
  const seen = new Set(['open', 'closed'])
  for (const l of extraLines.value) {
    const mode = String(l.mode || '').trim().toLowerCase()
    if (!mode) continue
    const mErr = validateScheduleMode(mode)
    if (mErr) {
      saveError.value = mErr
      return
    }
    if (seen.has(mode)) {
      saveError.value = `Duplicate mode: ${mode}`
      return
    }
    seen.add(mode)
    const dest = String(l.destination || '').trim() || 'None'
    if (!dest || dest.toLowerCase() === 'none') {
      saveError.value = 'Each additional mode line needs a real destination (not None)'
      return
    }
    bodyLines.push({ mode, destination: dest })
  }
  saving.value = true
  try {
    await getApiClient().put(`routeprofiles/${encodeURIComponent(shortuid.value)}`, {
      name: editName.value.trim(),
      cluster: editCluster.value.trim(),
      description: editDescription.value.trim() || null,
      lines: bodyLines
    })
    await fetchProfile()
    toast.show('Route profile saved')
  } catch (err) {
    saveError.value = firstErrorMessage(err, 'Failed to update Route profile')
  } finally {
    saving.value = false
  }
}

function askConfirmDelete() {
  deleteError.value = ''
  confirmDeleteOpen.value = true
}

async function confirmAndDelete() {
  deleting.value = true
  deleteError.value = ''
  try {
    await getApiClient().delete(`routeprofiles/${encodeURIComponent(shortuid.value)}`)
    toast.show('Route profile deleted')
    router.push({ name: 'routeprofiles' })
  } catch (err) {
    deleteError.value = firstErrorMessage(err, 'Failed to delete Route profile')
  } finally {
    deleting.value = false
    confirmDeleteOpen.value = false
  }
}
</script>

<template>
  <div class="detail-view" @keydown="onKeydown">
    <PanelBackLink :to="{ name: 'routeprofiles' }" label="Route Profiles">
      <h1>Edit Route profile{{ editName ? ` — ${editName}` : '' }}</h1>
    </PanelBackLink>

    <p v-if="loading" class="loading">Loading…</p>
    <p v-else-if="error" class="error">{{ error }}</p>
    <template v-else-if="profile">
      <form class="edit-form" @submit="saveEdit">
        <p v-if="saveError" class="error" role="alert">{{ saveError }}</p>
        <p v-if="deleteError" class="error">{{ deleteError }}</p>
        <div class="edit-actions">
          <button type="submit" :disabled="saving">{{ saving ? 'Saving…' : 'Save' }}</button>
          <button type="button" class="secondary" @click="goBack">Cancel</button>
          <button type="button" class="action-delete" :disabled="deleting" @click="askConfirmDelete">
            {{ deleting ? 'Deleting…' : 'Delete' }}
          </button>
        </div>

        <h2 class="detail-heading">Identity</h2>
        <div class="form-fields">
          <FormReadonly id="uid" label="UID" :value="profile.shortuid ?? '—'" class="readonly-identity" />
          <FormField id="name" v-model="editName" label="Name" type="text" required />
          <FormSelect
            id="cluster"
            v-model="editCluster"
            label="Tenant"
            :options="tenantOptionsForSelect"
            :required="true"
          />
          <FormField id="description" v-model="editDescription" label="Description" type="text" />
        </div>

        <h2 class="detail-heading">Destinations</h2>
        <p class="hint">Where calls go when this profile's schedule is open or closed.</p>
        <div class="form-fields dest-fields">
          <FormSelect
            id="open-dest"
            v-model="openDest"
            label="Open destination"
            :options="destPickOptions"
            :option-groups="destinationGroups"
            :loading="destinationsLoading"
            :required="true"
            :error="openError"
            :touched="openTouched"
            @blur="validateOpen"
          />
          <FormSelect
            id="closed-dest"
            v-model="closedDest"
            label="Closed destination"
            :options="destPickOptions"
            :option-groups="destinationGroups"
            :loading="destinationsLoading"
            hide-help
          />
        </div>

        <template v-if="extraLines.length">
          <h2 class="detail-heading">Additional schedule modes</h2>
          <p class="hint">Optional — e.g. lunch or night when day timers use those modes.</p>
          <div v-for="(line, i) in extraLines" :key="i" class="line-row">
            <FormField
              :id="`line-mode-${i}`"
              v-model="line.mode"
              label="Mode"
              type="text"
              placeholder="e.g. lunch"
              list="schedule-mode-suggestions"
            />
            <FormSelect
              :id="`line-dest-${i}`"
              v-model="line.destination"
              label="Destination"
              :options="destBaseOptions"
              :option-groups="destinationGroups"
              :loading="destinationsLoading"
            />
            <button type="button" class="secondary line-remove" @click="removeLine(i)">Remove</button>
          </div>
        </template>
        <datalist id="schedule-mode-suggestions">
          <option v-for="m in COMMON_SCHEDULE_MODES" :key="m" :value="m" />
        </datalist>
        <button type="button" class="secondary" @click="addLine">Add schedule mode</button>

        <div class="edit-actions">
          <button type="submit" :disabled="saving">{{ saving ? 'Saving…' : 'Save' }}</button>
          <button type="button" class="secondary" @click="goBack">Cancel</button>
        </div>
      </form>
    </template>

    <DeleteConfirmModal
      :open="confirmDeleteOpen"
      title="Delete Route profile?"
      @cancel="confirmDeleteOpen = false"
      @confirm="confirmAndDelete"
    >
      <p>This profile and its mode lines will be permanently deleted.</p>
    </DeleteConfirmModal>
  </div>
</template>

<style scoped>
.detail-view {
  max-width: 52rem;
}
.edit-form {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.form-fields {
  display: grid;
  gap: 0.75rem;
  max-width: 28rem;
}
.dest-fields {
  display: flex;
  flex-direction: column;
  gap: 0;
  max-width: none;
}
.line-row {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 0.75rem;
  align-items: end;
  max-width: 40rem;
}
.line-remove {
  margin-bottom: 0.15rem;
}
.detail-heading {
  margin: 0.75rem 0 0;
  font-size: 1rem;
}
.hint {
  font-size: 0.85rem;
  opacity: 0.8;
  margin: 0;
}
.edit-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.edit-actions button,
.secondary {
  padding: 0.4rem 0.85rem;
  border-radius: 0.35rem;
  border: 1px solid var(--color-border, #ccc);
  cursor: pointer;
  font: inherit;
}
.edit-actions button[type='submit'] {
  background: var(--color-accent, #2563eb);
  color: #fff;
  border-color: transparent;
}
.secondary {
  background: transparent;
}
.action-delete {
  background: transparent;
  color: var(--color-danger, #b91c1c);
  border-color: var(--color-danger, #b91c1c);
}
.error {
  color: var(--color-danger, #b91c1c);
}
.loading {
  margin: 1rem 0;
}
@media (max-width: 40rem) {
  .line-row {
    grid-template-columns: 1fr;
  }
}
</style>
