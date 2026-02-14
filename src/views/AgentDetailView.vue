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
  return getSchema('agents')?.read_only?.includes(field) ?? false
}
const agent = ref(null)
const tenants = ref([])
const queues = ref([])
const loading = ref(true)
const error = ref('')
const editCluster = ref('default')
const editName = ref('')
const editPasswd = ref('')
const editQueue1 = ref('None')
const editQueue2 = ref('None')
const editQueue3 = ref('None')
const editQueue4 = ref('None')
const editQueue5 = ref('None')
const editQueue6 = ref('None')
const saveError = ref('')
const saving = ref(false)
const deleteError = ref('')
const deleting = ref(false)
const confirmDeleteOpen = ref(false)

const shortuid = computed(() => route.params.shortuid)

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

/** Map cluster id, shortuid, or pkey → tenant pkey for display (same pattern as other Detail views). Resolve API cluster (may be shortuid) to pkey for dropdown. */
const clusterToTenantPkey = computed(() => {
  const map = new Map()
  for (const t of tenants.value) {
    if (t.id != null) map.set(String(t.id), t.pkey ?? t.id)
    if (t.shortuid != null) map.set(String(t.shortuid), t.pkey ?? t.shortuid)
    if (t.pkey != null) map.set(String(t.pkey), t.pkey)
  }
  return map
})

/** Current tenant's shortuid (queue.cluster stores tenant shortuid, not pkey). Resolve from pkey or use as shortuid if it matches a tenant. */
const tenantShortuid = computed(() => {
  const cluster = String(editCluster.value ?? '').trim()
  if (!cluster) return ''
  const byPkey = tenants.value.find((x) => String(x.pkey ?? '').trim() === cluster)
  if (byPkey?.shortuid) return String(byPkey.shortuid).trim()
  const byShortuid = tenants.value.find((x) => String(x.shortuid ?? '').trim() === cluster)
  if (byShortuid) return cluster
  return cluster
})

/** Queues for the agent's tenant only. Queue rows use cluster = tenant shortuid, so filter by that. */
const queueOptionsForTenant = computed(() => {
  const shortuid = tenantShortuid.value
  const forTenant = queues.value
    .filter((q) => String(q.cluster ?? '').trim() === shortuid)
    .map((q) => q.pkey)
    .filter(Boolean)
  const uniq = [...new Set(forTenant)].sort((a, b) => String(a).localeCompare(String(b)))
  return uniq
})

const queueOptions = computed(() => ['None', ...queueOptionsForTenant.value])

/** Normalize queue from API for form: null/undefined/'-'/'None' → 'None'. */
function normalizeQueueFromApi(v) {
  const s = (v ?? '').toString().trim()
  return s === '' || s === '-' || s === 'None' ? 'None' : s
}

/** Normalize queue for save: empty/'-'/'None' → null so API gets null not '-'. */
function normalizeQueueForSave(v) {
  const s = (v ?? '').toString().trim()
  return s === '' || s === '-' || s === 'None' ? null : s
}

/** Set any queue selection to 'None' if it's not in the tenant's queues. */
function clearQueuesNotInTenant() {
  const allowed = new Set(['None', ...queueOptionsForTenant.value])
  const refs = [editQueue1, editQueue2, editQueue3, editQueue4, editQueue5, editQueue6]
  refs.forEach((r) => {
    if (r.value && !allowed.has(String(r.value).trim())) r.value = 'None'
  })
}

async function fetchTenants() {
  try {
    const response = await getApiClient().get('tenants')
    tenants.value = normalizeList(response, 'tenants')
  } catch {
    tenants.value = []
  }
}

async function fetchQueues() {
  try {
    const response = await getApiClient().get('queues')
    queues.value = normalizeList(response, 'queues') || normalizeList(response)
  } catch {
    queues.value = []
  }
}

async function fetchAgent() {
  if (!shortuid.value) return
  loading.value = true
  error.value = ''
  try {
    agent.value = await getApiClient().get(`agents/${encodeURIComponent(shortuid.value)}`)
    const clusterRaw = agent.value?.cluster ?? 'default'
    editCluster.value = clusterToTenantPkey.value.get(String(clusterRaw)) ?? clusterRaw
    editName.value = agent.value?.name ?? ''
    editPasswd.value = agent.value?.passwd != null ? String(agent.value.passwd) : ''
    editQueue1.value = normalizeQueueFromApi(agent.value?.queue1)
    editQueue2.value = normalizeQueueFromApi(agent.value?.queue2)
    editQueue3.value = normalizeQueueFromApi(agent.value?.queue3)
    editQueue4.value = normalizeQueueFromApi(agent.value?.queue4)
    editQueue5.value = normalizeQueueFromApi(agent.value?.queue5)
    editQueue6.value = normalizeQueueFromApi(agent.value?.queue6)
    clearQueuesNotInTenant()
  } catch (err) {
    error.value = firstErrorMessage(err, 'Failed to load agent')
    agent.value = null
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await ensureFetched()
  await fetchTenants()
  await fetchQueues()
  await fetchAgent()
})
watch(shortuid, fetchAgent)
watch(editCluster, clearQueuesNotInTenant)

function goBack() {
  router.push({ name: 'agents' })
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
  const passwdNum = editPasswd.value.trim() !== '' ? parseInt(editPasswd.value, 10) : undefined
  if (passwdNum !== undefined && (isNaN(passwdNum) || passwdNum < 1001 || passwdNum > 9999)) {
    saveError.value = 'Password must be 1001–9999'
    return
  }
  saving.value = true
  try {
    const body = {
      cluster: editCluster.value.trim(),
      name: editName.value.trim(),
      passwd: passwdNum ?? (agent.value?.passwd != null ? parseInt(agent.value.passwd, 10) : 1001)
    }
    body.queue1 = normalizeQueueForSave(editQueue1.value)
    body.queue2 = normalizeQueueForSave(editQueue2.value)
    body.queue3 = normalizeQueueForSave(editQueue3.value)
    body.queue4 = normalizeQueueForSave(editQueue4.value)
    body.queue5 = normalizeQueueForSave(editQueue5.value)
    body.queue6 = normalizeQueueForSave(editQueue6.value)
    await getApiClient().put(`agents/${encodeURIComponent(shortuid.value)}`, body)
    await fetchAgent()
    toast.show(`Agent saved`)
  } catch (err) {
    saveError.value = firstErrorMessage(err, 'Failed to update agent')
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
    await getApiClient().delete(`agents/${encodeURIComponent(shortuid.value)}`)
    toast.show(`Agent deleted`)
    router.push({ name: 'agents' })
  } catch (err) {
    deleteError.value = firstErrorMessage(err, 'Failed to delete agent')
  } finally {
    deleting.value = false
    confirmDeleteOpen.value = false
  }
}
</script>

<template>
  <div class="detail-view" @keydown="onKeydown">
    <h1>Edit Agent {{ agent?.pkey ?? '…' }}</h1>

    <p v-if="loading" class="loading">Loading…</p>
    <p v-else-if="error" class="error">{{ error }}</p>
    <template v-else-if="agent">
      <div class="detail-content">
        <p v-if="deleteError" class="error">{{ deleteError }}</p>

        <form class="edit-form" @submit="saveEdit">
          <p v-if="saveError" id="agent-edit-error" class="error" role="alert">{{ saveError }}</p>

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
            <FormReadonly v-if="isReadOnly('pkey')" id="edit-identity-pkey" label="Agent number" :value="agent.pkey ?? '—'" class="readonly-identity" />
            <FormField v-else id="edit-identity-pkey" :model-value="agent.pkey ?? '—'" label="Agent number" disabled class="readonly-identity" />
            <FormSelect
              id="edit-cluster"
              v-model="editCluster"
              label="Tenant"
              :options="tenantOptionsForSelect"
              :required="true"
            />
            <FormField
              id="edit-name"
              v-model="editName"
              label="Name"
              type="text"
              placeholder="e.g. agent_name"
              :required="true"
            />
            <FormField
              id="edit-passwd"
              v-model="editPasswd"
              label="Password"
              type="number"
              min="1001"
              max="9999"
              placeholder="1001–9999"
              :required="true"
              hint="1001–9999. Required on save."
            />
          </div>

          <h2 class="detail-heading">Queues</h2>
          <div class="form-fields">
            <FormSelect
              id="edit-queue1"
              v-model="editQueue1"
              label="Queue 1"
              :options="queueOptions"
            />
            <FormSelect
              id="edit-queue2"
              v-model="editQueue2"
              label="Queue 2"
              :options="queueOptions"
            />
            <FormSelect
              id="edit-queue3"
              v-model="editQueue3"
              label="Queue 3"
              :options="queueOptions"
            />
            <FormSelect
              id="edit-queue4"
              v-model="editQueue4"
              label="Queue 4"
              :options="queueOptions"
            />
            <FormSelect
              id="edit-queue5"
              v-model="editQueue5"
              label="Queue 5"
              :options="queueOptions"
            />
            <FormSelect
              id="edit-queue6"
              v-model="editQueue6"
              label="Queue 6"
              :options="queueOptions"
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
      title="Delete agent?"
      :loading="deleting"
      @confirm="confirmAndDelete"
      @cancel="cancelConfirmDelete"
    >
      <template #body>
        <p>Agent <strong>{{ agent?.pkey ?? '—' }}</strong> will be permanently deleted. This cannot be undone.</p>
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
