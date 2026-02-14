<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
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
const routeData = ref(null)
const tenants = ref([])
const trunks = ref([])
const loading = ref(true)
const error = ref('')
const editCluster = ref('default')
const editDesc = ref('')
const editActive = ref('YES')
const editAuth = ref('NO')
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
  if (cur && !list.includes(cur)) return [cur, ...list].sort((a, b) => String(a).localeCompare(String(b)))
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
  return [currentValue, ...base].sort((a, b) => (a === 'None' ? -1 : b === 'None' ? 1 : String(a).localeCompare(String(b))))
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
    trunks.value = normalizeList(response, 'trunks') || normalizeList(response)
  } catch {
    trunks.value = []
  }
}

function syncEditFromRoute() {
  if (!routeData.value) return
  const r = routeData.value
  const tenantPkey = r.tenant_pkey ?? tenantPkeyDisplay(r.cluster)
  editCluster.value = tenantPkey ?? 'default'
  editDesc.value = r.description ?? ''
  editActive.value = r.active ?? 'YES'
  editAuth.value = r.auth ?? 'NO'
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

onMounted(() => {
  Promise.all([fetchTenants(), fetchTrunks()]).then(() => fetchRoute())
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
  const dialplanTrimmed = editDialplan.value.trim()
  if (!dialplanTrimmed) {
    saveError.value = 'Dialplan is required (e.g. _XXXXXX)'
    return
  }
  saving.value = true
  try {
    await getApiClient().put(`routes/${encodeURIComponent(shortuid.value)}`, {
      cluster: editCluster.value.trim(),
      description: editDesc.value.trim() || undefined,
      active: editActive.value,
      auth: editAuth.value,
      dialplan: dialplanTrimmed,
      path1: editPath1.value !== 'None' && editPath1.value.trim() ? editPath1.value.trim() : undefined,
      path2: editPath2.value !== 'None' && editPath2.value.trim() ? editPath2.value.trim() : undefined,
      path3: editPath3.value !== 'None' && editPath3.value.trim() ? editPath3.value.trim() : undefined,
      path4: editPath4.value !== 'None' && editPath4.value.trim() ? editPath4.value.trim() : undefined,
      strategy: editStrategy.value
    })
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
</script>

<template>
  <div class="detail-view" @keydown="onKeydown">
    <h1>Edit Route {{ routeData?.pkey ?? '…' }}</h1>

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
              id="edit-identity-pkey"
              label="Route name"
              :value="routeData.pkey ?? '—'"
            />
            <FormReadonly
              id="edit-identity-shortuid"
              label="Local UID"
              :value="routeData.shortuid ?? '—'"
            />
            <FormReadonly
              id="edit-identity-id"
              label="KSUID"
              :value="routeData.id ?? '—'"
            />
            <FormField
              id="edit-desc"
              v-model="editDesc"
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
              hint="The tenant this route belongs to."
            />
            <FormToggle
              id="edit-active"
              v-model="editActive"
              label="Active?"
              yes-value="YES"
              no-value="NO"
            />
            <FormToggle
              id="edit-auth"
              v-model="editAuth"
              label="Auth (PIN dial)"
              yes-value="YES"
              no-value="NO"
            />
            <FormSegmentedPill
              id="edit-strategy"
              v-model="editStrategy"
              label="Strategy"
              :options="['hunt', 'balance']"
              hint="Ring order: hunt = sequential, balance = round-robin."
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
              hint="Required. Example: _XXXXXX for 6-digit extension matching."
            />
          </div>

          <h2 class="detail-heading">Paths (trunks)</h2>
          <div class="form-fields">
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
        <p>Route <strong>{{ routeData?.pkey ?? '—' }}</strong> will be permanently deleted. This cannot be undone.</p>
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
