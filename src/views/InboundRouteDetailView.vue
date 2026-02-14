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
import FormSegmentedPill from '@/components/forms/FormSegmentedPill.vue'
import FormToggle from '@/components/forms/FormToggle.vue'
import FormReadonly from '@/components/forms/FormReadonly.vue'
import DeleteConfirmModal from '@/components/DeleteConfirmModal.vue'

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
const editTrunkname = ref('')
const editActive = ref('YES')
const editOpenroute = ref('None')
const editCloseroute = ref('None')
const destinations = ref(null)
const destinationsLoading = ref(false)
const editAlertinfo = ref('')
const editCallback = ref('')
const editCallerid = ref('')
const editCallprogress = ref('YES')
const editCname = ref('')
const editDevicerec = ref('None')
const editMoh = ref('NO')
const editSwoclip = ref('YES')
const editDisa = ref('None')
const editDisapass = ref('')
const editHost = ref('')
const editIaxreg = ref('')
const editInprefix = ref('')
const editMatch = ref('')
const editPassword = ref('')
const editPeername = ref('')
const editPjsipreg = ref('')
const editRegister = ref('')
const editTag = ref('')
const editUsername = ref('')
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
  if (cur && !list.includes(cur)) return [cur, ...list].sort((a, b) => String(a).localeCompare(String(b)))
  return list
})

const devicerecOptions = ['None', 'OTR', 'OTRR', 'Inbound', 'Outbound', 'Both']

function normalizeDevicerec(v) {
  if (v == null || String(v).trim() === '') return 'None'
  const s = String(v).trim()
  return devicerecOptions.includes(s) ? s : 'None'
}

const regOptions = ['', 'SND', 'RCV']

function normalizeReg(v) {
  if (v == null || String(v).trim() === '') return ''
  const s = String(v).trim().toUpperCase()
  return regOptions.includes(s) ? s : ''
}

/** Normalize destinations API response (handles both { Queues: [] } and { queues: [] } shapes). */
function toDestArrays(d) {
  if (!d || typeof d !== 'object') return {}
  return {
    Queues: Array.isArray(d.Queues) ? d.Queues : (Array.isArray(d.queues) ? d.queues : []),
    Extensions: Array.isArray(d.Extensions) ? d.Extensions : (Array.isArray(d.extensions) ? d.extensions : []),
    IVRs: Array.isArray(d.IVRs) ? d.IVRs : (Array.isArray(d.ivrs) ? d.ivrs : []),
    CustomApps: Array.isArray(d.CustomApps) ? d.CustomApps : (Array.isArray(d.customApps) ? d.customApps : [])
  }
}

const destinationGroups = computed(() => {
  const d = destinations.value
  const clusterVal = editCluster.value
  const routeList = routes.value || []
  const routesForCluster = clusterVal
    ? routeList.filter((r) => (r.cluster ?? r.tenant_pkey ?? '') === clusterVal).map((r) => r.pkey).filter(Boolean)
    : []
  const base = toDestArrays(d)
  return {
    ...base,
    Routes: [...new Set(routesForCluster)].sort((a, b) => String(a).localeCompare(String(b)))
  }
})

const openrouteOptions = computed(() => ['None', 'Operator'])
const closerouteOptions = computed(() => ['None', 'Operator'])

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
    const destBody = destResponse && typeof destResponse === 'object' ? (destResponse.data ?? destResponse) : null
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
    const response = await getApiClient().get('tenants')
    tenants.value = normalizeList(response, 'tenants')
  } catch {
    tenants.value = []
  }
}

function syncEditFromRoute() {
  if (!inboundRoute.value) return
  const r = inboundRoute.value
  const tenantPkey = r.tenant_pkey ?? tenantPkeyDisplay(r.cluster)
  editCluster.value = tenantPkey ?? 'default'
  editDescription.value = r.description ?? r.desc ?? ''
  editTrunkname.value = r.trunkname ?? ''
  editActive.value = r.active ?? 'YES'
  editOpenroute.value = r.openroute ?? 'None'
  editCloseroute.value = r.closeroute ?? 'None'
  editAlertinfo.value = r.alertinfo ?? ''
  editCallback.value = r.callback ?? ''
  editCallerid.value = r.callerid ?? ''
  editCallprogress.value = (r.callprogress === 'NO') ? 'NO' : 'YES'
  editCname.value = r.cname ?? ''
  editDevicerec.value = normalizeDevicerec(r.devicerec)
  editMoh.value = (r.moh === 'YES') ? 'YES' : 'NO'
  editSwoclip.value = r.swoclip ?? 'YES'
  editDisa.value = r.disa?.trim() || 'None'
  editDisapass.value = r.disapass ?? ''
  editHost.value = r.host ?? ''
  editIaxreg.value = normalizeReg(r.iaxreg)
  editInprefix.value = r.inprefix != null ? String(r.inprefix) : ''
  editMatch.value = r.match ?? ''
  editPassword.value = ''
  editPeername.value = r.peername ?? ''
  editPjsipreg.value = normalizeReg(r.pjsipreg)
  editRegister.value = r.register ?? ''
  editTag.value = r.tag ?? ''
  editUsername.value = r.username ?? ''
}

async function fetchInboundRoute() {
  if (!shortuid.value) return
  loading.value = true
  error.value = ''
  try {
    inboundRoute.value = await getApiClient().get(`inboundroutes/${encodeURIComponent(shortuid.value)}`)
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
    const inprefixVal = editInprefix.value.trim() === '' ? undefined : parseInt(editInprefix.value, 10)
    const body = {
      active: editActive.value,
      cluster: editCluster.value.trim(),
      description: editDescription.value.trim() || undefined,
      trunkname: editTrunkname.value.trim() || undefined,
      openroute: editOpenroute.value || 'None',
      closeroute: editCloseroute.value || 'None',
      alertinfo: editAlertinfo.value.trim() || undefined,
      callback: editCallback.value.trim() || undefined,
      callerid: editCallerid.value.trim() || undefined,
      callprogress: editCallprogress.value,
      cname: editCname.value.trim() || undefined,
      devicerec: editDevicerec.value || 'None',
      moh: editMoh.value,
      swoclip: editSwoclip.value,
      disa: (editDisa.value.trim() && editDisa.value.trim() !== 'None') ? editDisa.value.trim() : undefined,
      disapass: editDisapass.value.trim() || undefined,
      host: editHost.value.trim() || undefined,
      iaxreg: editIaxreg.value || undefined,
      inprefix: inprefixVal !== undefined && !isNaN(inprefixVal) ? inprefixVal : undefined,
      match: editMatch.value.trim() || undefined,
      peername: editPeername.value.trim() || undefined,
      pjsipreg: editPjsipreg.value || undefined,
      register: editRegister.value.trim() || undefined,
      tag: editTag.value.trim() || undefined,
      username: editUsername.value.trim() || undefined
    }
    if (editPassword.value.trim()) body.password = editPassword.value.trim()
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
</script>

<template>
  <div class="detail-view" @keydown="onKeydown">
    <h1>Edit Inbound Route {{ inboundRoute?.pkey ?? '…' }}</h1>

    <p v-if="loading" class="loading">Loading…</p>
    <p v-else-if="error" class="error">{{ error }}</p>
    <template v-else-if="inboundRoute">
      <div class="detail-content">
        <p v-if="deleteError" class="error">{{ deleteError }}</p>

        <form class="edit-form" @submit="saveEdit">
          <p v-if="saveError" id="inbound-route-edit-error" class="error" role="alert">{{ saveError }}</p>

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
            <FormReadonly v-if="isReadOnly('pkey')" id="edit-identity-pkey" label="DiD/CLiD" :value="inboundRoute.pkey ?? '—'" class="readonly-identity" />
            <FormField v-else id="edit-identity-pkey" :model-value="inboundRoute.pkey ?? '—'" label="DiD/CLiD" disabled class="readonly-identity" />
            <FormReadonly v-if="isReadOnly('shortuid')" id="edit-identity-shortuid" label="Local UID" :value="inboundRoute.shortuid ?? '—'" class="readonly-identity" />
            <FormField v-else id="edit-identity-shortuid" :model-value="inboundRoute.shortuid ?? '—'" label="Local UID" disabled class="readonly-identity" />
            <FormReadonly v-if="isReadOnly('id')" id="edit-identity-id" label="KSUID" :value="inboundRoute.id ?? '—'" class="readonly-identity" />
            <FormField v-else id="edit-identity-id" :model-value="inboundRoute.id ?? '—'" label="KSUID" disabled class="readonly-identity" />
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
              hint="The tenant this inbound route belongs to."
            />
            <FormField
              id="edit-trunkname"
              v-model="editTrunkname"
              label="Name"
              type="text"
              placeholder="Trunk name"
            />
            <FormToggle
              id="edit-active"
              v-model="editActive"
              label="Active?"
              yes-value="YES"
              no-value="NO"
            />
            <FormSelect
              id="edit-openroute"
              v-model="editOpenroute"
              label="Open route"
              :options="openrouteOptions"
              :option-groups="destinationGroups"
              :loading="destinationsLoading"
            />
            <FormSelect
              id="edit-closeroute"
              v-model="editCloseroute"
              label="Closed route"
              :options="closerouteOptions"
              :option-groups="destinationGroups"
            />
            <FormField
              id="edit-alertinfo"
              v-model="editAlertinfo"
              label="Alert info (optional)"
              type="text"
            />
            <FormToggle
              id="edit-moh"
              v-model="editMoh"
              label="MOH"
              yes-value="YES"
              no-value="NO"
            />
            <FormToggle
              id="edit-callprogress"
              v-model="editCallprogress"
              label="Call progress"
              yes-value="YES"
              no-value="NO"
            />
            <FormToggle
              id="edit-swoclip"
              v-model="editSwoclip"
              label="SWOCLIP"
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
            <FormField
              id="edit-tag"
              v-model="editTag"
              label="Tag (optional)"
              type="text"
            />
            <FormField
              id="edit-cname"
              v-model="editCname"
              label="CNAME"
              type="text"
            />
            <FormSelect
              id="edit-devicerec"
              v-model="editDevicerec"
              label="Device recording"
              :options="devicerecOptions"
            />
          </div>

          <h2 class="detail-heading">Connection</h2>
          <div class="form-fields">
            <FormField
              id="edit-host"
              v-model="editHost"
              label="Host"
              type="text"
              placeholder="IP or hostname"
            />
            <FormField
              id="edit-username"
              v-model="editUsername"
              label="Username"
              type="text"
              autocomplete="off"
            />
            <FormField
              id="edit-password"
              v-model="editPassword"
              label="Password"
              type="password"
              placeholder="Leave blank to keep current"
              autocomplete="new-password"
            />
            <FormField
              id="edit-peername"
              v-model="editPeername"
              label="Peername"
              type="text"
            />
            <FormField
              id="edit-register"
              v-model="editRegister"
              label="Register"
              type="text"
            />
            <FormSegmentedPill
              id="edit-iaxreg"
              v-model="editIaxreg"
              label="IAX registration"
              :options="regOptions"
              empty-display="—"
            />
            <FormSegmentedPill
              id="edit-pjsipreg"
              v-model="editPjsipreg"
              label="PJSIP registration"
              :options="regOptions"
              empty-display="—"
            />
          </div>

          <h2 class="detail-heading">Advanced</h2>
          <div class="form-fields">
            <FormField
              id="edit-callback"
              v-model="editCallback"
              label="Callback"
              type="text"
            />
            <FormField
              id="edit-callerid"
              v-model="editCallerid"
              label="Caller ID"
              type="text"
            />
            <FormField
              id="edit-match"
              v-model="editMatch"
              label="Match"
              type="text"
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
        <p>Inbound route <strong>{{ inboundRoute?.pkey ?? '—' }}</strong> will be permanently deleted. This cannot be undone.</p>
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
