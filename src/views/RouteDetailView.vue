<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useSchema } from '@/composables/useSchema'
import { useToastStore } from '@/stores/toast'
import { normalizeList } from '@/utils/listResponse'
import { firstErrorMessage } from '@/utils/formErrors'
import { validateRoutePkey } from '@/utils/validation'
import FormField from '@/components/forms/FormField.vue'
import FormSelect from '@/components/forms/FormSelect.vue'
import FormSegmentedPill from '@/components/forms/FormSegmentedPill.vue'
import FormToggle from '@/components/forms/FormToggle.vue'
import FormReadonly from '@/components/forms/FormReadonly.vue'
import DeleteConfirmModal from '@/components/DeleteConfirmModal.vue'
import PanelBackLink from '@/components/PanelBackLink.vue'
import DetailActiveStatusBar from '@/components/DetailActiveStatusBar.vue'
import { useFleetPosture } from '@/composables/useFleetPosture'
const route = useRoute()
const router = useRouter()
const toast = useToastStore()
const { getSchema, ensureFetched } = useSchema()
const { loadFleetPosture, hideRoutePaths, posture } = useFleetPosture()

const egressQualifyState = computed(() => String(posture.value?.egress_qualify?.state || 'Unknown'))
const egressQualifyLabel = computed(() => {
  const state = egressQualifyState.value
  const rtt = posture.value?.egress_qualify?.rtt_ms
  if (state === 'Avail' && rtt != null) return `Egress Avail · ${rtt} ms`
  if (state === 'Avail') return 'Egress Avail'
  if (state === 'Unavail') return 'Egress Unavail'
  return 'Egress Unknown'
})
const egressQualifyChipClass = computed(() => {
  const state = egressQualifyState.value
  if (state === 'Avail') return 'list-chip--on'
  if (state === 'Unavail') return 'list-chip--latency-bad'
  return 'list-chip--unknown'
})
const egressQualifyTitle = computed(() => {
  const q = posture.value?.egress_qualify
  return q?.latency || egressQualifyLabel.value
})

function isReadOnly(field) {
  return getSchema('routes')?.read_only?.includes(field) ?? false
}
const routeData = ref(null)
const tenants = ref([])
const trunks = ref([])
const loading = ref(true)
const error = ref('')
const editPkey = ref('')
const editCluster = ref('default')
const editCname = ref('')
const editDescription = ref('')
const editActive = ref('YES')
const editDialplan = ref('')
const editPath1 = ref('None')
const editPath2 = ref('None')
const editPath3 = ref('None')
const editPath4 = ref('None')
const editStrategy = ref('hunt')
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
  return clusterToTenantPkey.value.get(s) ?? routeData.value?.tenant_pkey ?? s
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

const trunkPkeys = computed(() => {
  const list = trunks.value.map((t) => t.pkey).filter(Boolean)
  return [...new Set(list)].sort((a, b) => String(a).localeCompare(String(b)))
})

function pathOptions(currentValue) {
  const base = ['None', ...trunkPkeys.value]
  if (!currentValue || currentValue === 'None') return base
  if (base.includes(currentValue)) return base
  return [currentValue, ...base].sort((a, b) =>
    a === 'None' ? -1 : b === 'None' ? 1 : String(a).localeCompare(String(b))
  )
}

async function fetchTenants() {
  try {
    const response = await getApiClient().get('tenants')
    tenants.value = normalizeList(response, 'tenants')
  } catch {
    tenants.value = []
  }
}

async function fetchTrunks() {
  try {
    const response = await getApiClient().get('trunks')
    const list = normalizeList(response, 'trunks') || normalizeList(response) || []
    // First cut: only show trunks in the default tenant (TRUNK_ROUTE_MULTITENANCY)
    trunks.value = list.filter((t) => String(t?.cluster ?? '') === 'default')
  } catch {
    trunks.value = []
  }
}

function syncEditFromRoute() {
  if (!routeData.value) return
  const r = routeData.value
  const tenantPkey = r.tenant_pkey ?? tenantPkeyDisplay(r.cluster)
  editCluster.value = tenantPkey ?? 'default'
  editPkey.value = r.pkey ?? ''
  editCname.value = r.cname ?? ''
  editDescription.value = r.description ?? ''
  editActive.value = r.active ?? 'YES'
  editDialplan.value = r.dialplan ?? ''
  editPath1.value = r.path1 && String(r.path1).trim() ? r.path1 : 'None'
  editPath2.value = r.path2 && String(r.path2).trim() ? r.path2 : 'None'
  editPath3.value = r.path3 && String(r.path3).trim() ? r.path3 : 'None'
  editPath4.value = r.path4 && String(r.path4).trim() ? r.path4 : 'None'
  editStrategy.value = r.strategy ?? 'hunt'
}

async function fetchRoute() {
  if (!shortuid.value) return
  loading.value = true
  error.value = ''
  try {
    routeData.value = await getApiClient().get(`routes/${encodeURIComponent(shortuid.value)}`)
    syncEditFromRoute()
  } catch (err) {
    error.value = firstErrorMessage(err, 'Failed to load route')
    routeData.value = null
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await ensureFetched()
  await loadFleetPosture({ force: true })
  await Promise.all([fetchTenants(), fetchTrunks()])
  await fetchRoute()
})
watch(shortuid, fetchRoute)

function goBack() {
  router.push({ name: 'routes' })
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
  const pkeyErr = validateRoutePkey(editPkey.value)
  if (pkeyErr) {
    saveError.value = pkeyErr
    return
  }
  const dialplanTrimmed = editDialplan.value.trim()
  if (!dialplanTrimmed) {
    saveError.value = 'Dialplan is required (e.g. _XXXXXX)'
    return
  }
  saving.value = true
  try {
    const payload = {
      pkey: editPkey.value.trim(),
      cluster: editCluster.value.trim(),
      cname: editCname.value.trim() || null,
      description: editDescription.value.trim() || null,
      active: editActive.value,
      dialplan: dialplanTrimmed,
      path1: editPath1.value !== 'None' && editPath1.value.trim() ? editPath1.value.trim() : null,
      path2: editPath2.value !== 'None' && editPath2.value.trim() ? editPath2.value.trim() : null,
      path3: editPath3.value !== 'None' && editPath3.value.trim() ? editPath3.value.trim() : null,
      path4: editPath4.value !== 'None' && editPath4.value.trim() ? editPath4.value.trim() : null,
      strategy: editStrategy.value
    }
    if (hideRoutePaths()) {
      payload.path1 = posture.value?.egress_trunk || 'Egress'
      payload.path2 = null
      payload.path3 = null
      payload.path4 = null
    }
    await getApiClient().put(`routes/${encodeURIComponent(shortuid.value)}`, payload)
    await fetchRoute()
    toast.show(`Route saved`)
  } catch (err) {
    saveError.value = firstErrorMessage(err, 'Failed to update route')
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
    await getApiClient().delete(`routes/${encodeURIComponent(shortuid.value)}`)
    toast.show(`Route deleted`)
    router.push({ name: 'routes' })
  } catch (err) {
    deleteError.value = firstErrorMessage(err, 'Failed to delete route')
  } finally {
    deleting.value = false
    confirmDeleteOpen.value = false
  }
}

const panelTitleTenantSuffix = computed(() => {
  if (!routeData.value) return ''
  const t = String(editCluster.value ?? '').trim()
  if (!t) return ''
  return ` (${t})`
})
</script>

<template>
  <div class="detail-view" @keydown="onKeydown">
    <PanelBackLink :to="{ name: 'routes' }" label="Routes">
      <div class="detail-panel-head">
        <div class="detail-title-status-row">
          <h1 class="detail-panel-title">
            Edit Route {{ routeData?.pkey ?? '…' }}{{ panelTitleTenantSuffix }}
          </h1>
          <DetailActiveStatusBar
            v-if="routeData"
            v-model="editActive"
            toggle-id="edit-route-active"
          />
        </div>
        <p
          v-if="routeData && editActive === 'NO'"
          class="detail-active-inactive-hint"
          role="status"
        >
          Inactive routes are not used until you activate this record and commit the change.
        </p>
      </div>
    </PanelBackLink>

    <p v-if="loading" class="loading">Loading…</p>
    <p v-else-if="error" class="error">{{ error }}</p>
    <template v-else-if="routeData">
      <div class="detail-content">
        <p v-if="deleteError" class="error">{{ deleteError }}</p>

        <form class="edit-form" @submit="saveEdit">
          <p v-if="saveError" id="route-edit-error" class="error" role="alert">{{ saveError }}</p>

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
              id="edit-identity-shortuid"
              label="UID"
              :value="routeData.shortuid ?? '—'"
              class="readonly-identity"
            />
            <FormReadonly
              id="edit-identity-id"
              label="KSUID"
              :value="routeData.id ?? '—'"
              class="readonly-identity"
            />
            <FormReadonly
              v-if="isReadOnly('pkey')"
              id="edit-identity-pkey"
              label="Route name"
              help-pkey="route"
              :value="routeData.pkey ?? '—'"
              class="readonly-identity"
            />
            <FormField
              v-else
              id="edit-identity-pkey"
              v-model="editPkey"
              label="Route name"
              help-pkey="route"
              type="text"
              placeholder="e.g. _XXXXXX"
            />
            <FormField
              id="edit-cname"
              v-model="editCname"
              label="Common name"
              type="text"
              placeholder="Display name"
            />
            <FormField
              id="edit-description"
              v-model="editDescription"
              label="Description"
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
            <FormSegmentedPill
              id="edit-strategy"
              v-model="editStrategy"
              label="Strategy"
              :options="['hunt', 'balance']"
            />
          </div>

          <h2 class="detail-heading">Dialplan</h2>
          <div class="form-fields">
            <FormField
              id="edit-dialplan"
              v-model="editDialplan"
              label="Dialplan"
              type="text"
              placeholder="_XXXXXX"
              :required="true"
            />
          </div>

          <h2 v-if="!hideRoutePaths()" class="detail-heading">Paths (trunks)</h2>
          <div v-if="!hideRoutePaths()" class="form-fields">
            <FormSelect
              id="edit-path1"
              v-model="editPath1"
              label="Path 1"
              :options="pathOptions(editPath1)"
            />
            <FormSelect
              id="edit-path2"
              v-model="editPath2"
              label="Path 2"
              :options="pathOptions(editPath2)"
            />
            <FormSelect
              id="edit-path3"
              v-model="editPath3"
              label="Path 3"
              :options="pathOptions(editPath3)"
            />
            <FormSelect
              id="edit-path4"
              v-model="editPath4"
              label="Path 4"
              :options="pathOptions(editPath4)"
            />
          </div>
          <p v-else class="fleet-route-note">
            Fleet node: outbound uses fixed <strong>{{ posture?.egress_trunk || 'Egress' }}</strong> trunk to
            {{ posture?.sbc_egress_host || 'SBC' }}.
            <span
              class="list-chip fleet-egress-chip"
              :class="egressQualifyChipClass"
              :title="egressQualifyTitle"
            >{{ egressQualifyLabel }}</span>
          </p>

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
      title="Delete route?"
      :loading="deleting"
      @confirm="confirmAndDelete"
      @cancel="cancelConfirmDelete"
    >
      <template #body>
        <p>
          Route <strong>{{ routeData?.pkey ?? '—' }}</strong> will be permanently deleted. This
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
