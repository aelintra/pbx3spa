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
import FormSegmentedPill from '@/components/forms/FormSegmentedPill.vue'
import FormToggle from '@/components/forms/FormToggle.vue'
import FormReadonly from '@/components/forms/FormReadonly.vue'
import DeleteConfirmModal from '@/components/DeleteConfirmModal.vue'
import PanelBackLink from '@/components/PanelBackLink.vue'
import DetailActiveStatusBar from '@/components/DetailActiveStatusBar.vue'
const route = useRoute()
const router = useRouter()
const toast = useToastStore()
const { getSchema, ensureFetched } = useSchema()
function isReadOnly(field) {
  return getSchema('inroutes')?.read_only?.includes(field) ?? false
}
const inboundRoute = ref(null)
const tenants = ref([])
const routes = ref([])
const loading = ref(true)
const error = ref('')
const editCluster = ref('default')
const editDescription = ref('')
const editPkey = ref('')
const editTechnology = ref('DiD')
const editActive = ref('YES')
const editOpenroute = ref('None')
const editCloseroute = ref('None')
const editRouteProfile = ref('')
const editEntryDest = ref('None')
const routeProfiles = ref([])
const destinations = ref(null)
const destinationsLoading = ref(false)
const editAlertinfo = ref('')
const editCname = ref('')
const editDevicerec = ref('None')
const editMoh = ref('NO')
const editSwoclip = ref('YES')
const editDisa = ref('None')
const editDisapass = ref('')
const editInprefix = ref('')
const editTag = ref('')
const saveError = ref('')
const saving = ref(false)
const deleteError = ref('')
const deleting = ref(false)
const confirmDeleteOpen = ref(false)

const shortuid = computed(() => route.params.shortuid)

const clusterToTenantPkey = computed(() => {
  const map = new Map()
  for (const t of tenants.value) {
    if (t.id != null) map.set(String(t.id), t.pkey ?? t.id)
    if (t.shortuid != null) map.set(String(t.shortuid), t.pkey ?? t.shortuid)
    if (t.pkey != null) map.set(String(t.pkey), t.pkey)
  }
  return map
})

function tenantPkeyDisplay(clusterValue) {
  if (clusterValue == null || clusterValue === '') return '—'
  const s = String(clusterValue)
  return clusterToTenantPkey.value.get(s) ?? inboundRoute.value?.tenant_pkey ?? s
}

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

const devicerecOptions = ['None', 'Inbound', 'default']
const technologyOptions = ['DiD', 'CLiD', 'Class']

function normalizeDevicerec(v) {
  const s = (v ?? '').toString().trim()
  if (!s || s === '-') return 'None'
  if (s === 'OTR' || s === 'OTRR' || s === 'Outbound' || s === 'Both') return 'default'
  if (devicerecOptions.includes(s)) return s
  return 'None'
}

/** Normalize destinations API response (handles both { Queues: [] } and { queues: [] } shapes). */
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

const openrouteOptions = computed(() => ['None', 'Operator'])
const closerouteOptions = computed(() => ['None', 'Operator'])
const entryDestOptions = computed(() => ['None', 'Operator'])

function routeProfileOptionLabel(p) {
  const su = String(p?.shortuid ?? '').trim()
  const name = String(p?.name ?? '').trim()
  if (name && su) return `${name} (${su})`
  return name || su || ''
}

const routeProfileOptions = computed(() => {
  const opts = [{ value: '', label: '' }]
  const clusterVal = editCluster.value
  const map = clusterToTenantPkey.value
  const seen = new Set([''])
  for (const p of routeProfiles.value) {
    const pTenant = map.get(String(p.cluster)) ?? p.cluster
    const tenantOk =
      !clusterVal ||
      String(p.cluster) === String(clusterVal) ||
      String(pTenant) === String(clusterVal)
    if (!tenantOk) continue
    const su = String(p.shortuid ?? '')
    if (!su || seen.has(su)) continue
    seen.add(su)
    opts.push({ value: su, label: routeProfileOptionLabel(p) })
  }
  const cur = editRouteProfile.value
  if (cur && !seen.has(cur)) {
    const orphan = routeProfiles.value.find((p) => String(p.shortuid) === cur)
    opts.push({
      value: cur,
      label: orphan ? routeProfileOptionLabel(orphan) : cur
    })
  }
  return opts
})

async function loadDestinations() {
  const c = editCluster.value
  if (!c) {
    destinations.value = null
    routes.value = []
    routeProfiles.value = []
    return
  }
  destinationsLoading.value = true
  try {
    const [destResponse, routeResponse, profileResponse] = await Promise.all([
      getApiClient().get('destinations', { params: { cluster: c } }),
      getApiClient().get('routes'),
      getApiClient().get('routeprofiles')
    ])
    const destBody =
      destResponse && typeof destResponse === 'object' ? (destResponse.data ?? destResponse) : null
    destinations.value = destBody && typeof destBody === 'object' ? destBody : null
    routes.value = normalizeList(routeResponse, 'routes')
    const allProfiles = normalizeList(profileResponse, 'routeprofiles') || normalizeList(profileResponse)
    routeProfiles.value = allProfiles
  } catch {
    destinations.value = null
    routes.value = []
    routeProfiles.value = []
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

function syncEditFromRoute() {
  if (!inboundRoute.value) return
  const r = inboundRoute.value
  const tenantPkey = r.tenant_pkey ?? tenantPkeyDisplay(r.cluster)
  editCluster.value = tenantPkey ?? 'default'
  editPkey.value = r.pkey ?? ''
  editTechnology.value =
    r.technology && technologyOptions.includes(r.technology) ? r.technology : 'DiD'
  editDescription.value = r.description ?? r.desc ?? ''
  editActive.value = r.active ?? 'YES'
  editOpenroute.value = r.openroute ?? 'None'
  editCloseroute.value = r.closeroute ?? 'None'
  editRouteProfile.value = r.route_profile ? String(r.route_profile) : ''
  editEntryDest.value = r.entry_dest && String(r.entry_dest).trim() !== '' ? String(r.entry_dest) : 'None'
  editAlertinfo.value = r.alertinfo ?? ''
  editCname.value = r.cname ?? ''
  editDevicerec.value = normalizeDevicerec(r.devicerec)
  editMoh.value = r.moh === 'YES' ? 'YES' : 'NO'
  editSwoclip.value = r.swoclip ?? 'YES'
  editDisa.value = r.disa?.trim() || 'None'
  editDisapass.value = r.disapass ?? ''
  editInprefix.value = r.inprefix != null ? String(r.inprefix) : ''
  editTag.value = r.tag ?? ''
}

async function fetchInboundRoute() {
  if (!shortuid.value) return
  loading.value = true
  error.value = ''
  try {
    inboundRoute.value = await getApiClient().get(
      `inboundroutes/${encodeURIComponent(shortuid.value)}`
    )
    syncEditFromRoute()
    if (editCluster.value) loadDestinations()
  } catch (err) {
    error.value = firstErrorMessage(err, 'Failed to load inbound route')
    inboundRoute.value = null
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await ensureFetched()
  await fetchTenants()
  await fetchInboundRoute()
})
watch(shortuid, fetchInboundRoute)
watch(editCluster, () => {
  loadDestinations()
})

function goBack() {
  router.push({ name: 'inbound-routes' })
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
    const inprefixVal =
      editInprefix.value.trim() === '' ? undefined : parseInt(editInprefix.value, 10)
    const body = {
      pkey: editPkey.value.trim(),
      active: editActive.value,
      cluster: editCluster.value.trim(),
      technology: editTechnology.value,
      description: editDescription.value.trim() || undefined,
      openroute:
        editOpenroute.value && editOpenroute.value !== 'None' ? editOpenroute.value : 'None',
      closeroute:
        editCloseroute.value && editCloseroute.value !== 'None' ? editCloseroute.value : 'None',
      route_profile: editRouteProfile.value || null,
      entry_dest:
        editEntryDest.value && editEntryDest.value !== 'None' ? editEntryDest.value : null,
      alertinfo: editAlertinfo.value.trim() || undefined,
      cname: editCname.value.trim() || undefined,
      devicerec: editDevicerec.value || 'None',
      moh: editMoh.value,
      swoclip: editSwoclip.value,
      disa:
        editDisa.value.trim() && editDisa.value.trim() !== 'None'
          ? editDisa.value.trim()
          : undefined,
      disapass: editDisapass.value.trim() || undefined,
      inprefix: inprefixVal !== undefined && !isNaN(inprefixVal) ? inprefixVal : undefined,
      tag: editTag.value.trim() || undefined
    }
    await getApiClient().put(`inboundroutes/${encodeURIComponent(shortuid.value)}`, body)
    await fetchInboundRoute()
    toast.show(`Inbound route saved`)
  } catch (err) {
    saveError.value = firstErrorMessage(err, 'Failed to update inbound route')
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
    await getApiClient().delete(`inboundroutes/${encodeURIComponent(shortuid.value)}`)
    toast.show(`Inbound route deleted`)
    router.push({ name: 'inbound-routes' })
  } catch (err) {
    deleteError.value = firstErrorMessage(err, 'Failed to delete inbound route')
  } finally {
    deleting.value = false
    confirmDeleteOpen.value = false
  }
}

const panelTitleTenantSuffix = computed(() => {
  if (!inboundRoute.value) return ''
  const t = String(editCluster.value ?? '').trim()
  if (!t) return ''
  return ` (${t})`
})
</script>

<template>
  <div class="detail-view" @keydown="onKeydown">
    <PanelBackLink :to="{ name: 'inbound-routes' }" label="Inbound Routes">
      <div class="detail-panel-head">
        <div class="detail-title-status-row">
          <h1 class="detail-panel-title">
            Edit Inbound Route {{ inboundRoute?.pkey ?? '…' }}{{ panelTitleTenantSuffix }}
          </h1>
          <DetailActiveStatusBar
            v-if="inboundRoute"
            v-model="editActive"
            toggle-id="edit-inbound-active"
          />
        </div>
        <p
          v-if="inboundRoute && editActive === 'NO'"
          class="detail-active-inactive-hint"
          role="status"
        >
          Inactive inbound routes do not match calls until you activate this record and commit the
          change.
        </p>
      </div>
    </PanelBackLink>

    <p v-if="loading" class="loading">Loading…</p>
    <p v-else-if="error" class="error">{{ error }}</p>
    <template v-else-if="inboundRoute">
      <div class="detail-content">
        <p v-if="deleteError" class="error">{{ deleteError }}</p>

        <form class="edit-form" @submit="saveEdit">
          <p v-if="saveError" id="inbound-route-edit-error" class="error" role="alert">
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
            <FormReadonly
              v-if="isReadOnly('shortuid')"
              id="edit-identity-shortuid"
              label="UID"
              :value="inboundRoute.shortuid ?? '—'"
              class="readonly-identity"
            />
            <FormField
              v-else
              id="edit-identity-shortuid"
              :model-value="inboundRoute.shortuid ?? '—'"
              label="UID"
              disabled
              class="readonly-identity"
            />
            <FormReadonly
              v-if="isReadOnly('id')"
              id="edit-identity-id"
              label="KSUID"
              :value="inboundRoute.id ?? '—'"
              class="readonly-identity"
            />
            <FormField
              v-else
              id="edit-identity-id"
              :model-value="inboundRoute.id ?? '—'"
              label="KSUID"
              disabled
              class="readonly-identity"
            />
            <FormField
              v-if="!isReadOnly('pkey')"
              id="edit-identity-pkey"
              v-model="editPkey"
              label="Number (DiD/CLiD)"
              help-pkey="didnumber"
              type="text"
              placeholder="e.g. 0123456789 or _2XXX"
            />
            <FormReadonly
              v-else
              id="edit-identity-pkey"
              label="DiD/CLiD"
              help-pkey="didnumber"
              :value="inboundRoute.pkey ?? '—'"
              class="readonly-identity"
            />
            <FormSelect
              id="edit-technology"
              v-model="editTechnology"
              label="DiD Type"
              help-pkey="technology"
              :options="technologyOptions"
            />
            <FormField
              id="edit-description"
              v-model="editDescription"
              label="Description (optional)"
              type="text"
              placeholder="Freeform description"
            />
          </div>

          <h2 class="detail-heading">Settings</h2>
          <div class="form-fields">
            <FormSelect
              id="edit-cluster"
              v-model="editCluster"
              label="Tenant"
              :options="tenantOptionsForSelect"
              :required="true"
            />
            <FormSelect
              id="edit-route-profile"
              v-model="editRouteProfile"
              label="Route profile"
              help-pkey="route_profile"
              :options="routeProfileOptions"
              :loading="destinationsLoading"
            />
            <FormSelect
              id="edit-entry-dest"
              v-model="editEntryDest"
              label="Always route"
              help-pkey="entry_dest"
              :options="entryDestOptions"
              :option-groups="destinationGroups"
              :loading="destinationsLoading"
            />
            <FormSelect
              id="edit-openroute"
              v-model="editOpenroute"
              label="Legacy open"
              :options="openrouteOptions"
              :option-groups="destinationGroups"
              :loading="destinationsLoading"
            />
            <FormSelect
              id="edit-closeroute"
              v-model="editCloseroute"
              label="Legacy closed"
              :options="closerouteOptions"
              :option-groups="destinationGroups"
            />
            <FormField
              id="edit-alertinfo"
              v-model="editAlertinfo"
              label="Alert info (optional)"
              type="text"
            />
            <FormToggle id="edit-moh" v-model="editMoh" label="MOH" yes-value="YES" no-value="NO" />
            <FormToggle
              id="edit-swoclip"
              v-model="editSwoclip"
              label="SWOCLIP"
              help-pkey="swoclip"
              yes-value="YES"
              no-value="NO"
            />
            <FormSegmentedPill
              id="edit-disa"
              v-model="editDisa"
              label="DISA"
              :options="['None', 'DISA', 'CALLBACK']"
            />
            <FormField
              id="edit-disapass"
              v-model="editDisapass"
              label="DISA pass (optional)"
              type="text"
              autocomplete="off"
            />
            <FormField
              id="edit-inprefix"
              v-model="editInprefix"
              label="In prefix (optional)"
              type="number"
              placeholder="integer"
              min="0"
              step="1"
            />
            <FormField id="edit-tag" v-model="editTag" label="Tag (optional)" type="text" />
            <FormField id="edit-cname" v-model="editCname" label="CNAME" type="text" />
            <FormSelect
              id="edit-devicerec"
              v-model="editDevicerec"
              label="Device recording"
              :options="devicerecOptions"
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
      title="Delete inbound route?"
      :loading="deleting"
      @confirm="confirmAndDelete"
      @cancel="cancelConfirmDelete"
    >
      <template #body>
        <p>
          Inbound route <strong>{{ inboundRoute?.pkey ?? '—' }}</strong> will be permanently
          deleted. This cannot be undone.
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
