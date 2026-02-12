<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
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
const queue = ref(null)
const tenants = ref([])
const loading = ref(true)
const error = ref('')
const editCluster = ref('default')
const editDevicerec = ref('None')
const editGreetnum = ref('')
const editOptions = ref('')
const saveError = ref('')
const saving = ref(false)
const deleteError = ref('')
const deleting = ref(false)
const confirmDeleteOpen = ref(false)

const pkey = computed(() => route.params.pkey)

// Tenant Resolution Pattern (PANEL_PATTERN.md): resolve API cluster (may be shortuid) to pkey for dropdown
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

const devicerecOptions = ['None', 'OTR', 'OTRR', 'Inbound']

function normalizeDevicerec(v) {
  const s = (v ?? '').toString().trim()
  if (!s || s === '-') return 'None'
  if (devicerecOptions.includes(s)) return s
  return 'None'
}

async function fetchTenants() {
  try {
    const response = await getApiClient().get('tenants')
    tenants.value = normalizeList(response, 'tenants')
  } catch {
    tenants.value = []
  }
}

async function fetchQueue() {
  if (!pkey.value) return
  loading.value = true
  error.value = ''
  try {
    queue.value = await getApiClient().get(`queues/${encodeURIComponent(pkey.value)}`)
    const clusterRaw = queue.value?.cluster ?? 'default'
    editCluster.value = tenantShortuidToPkey.value[clusterRaw] ?? clusterRaw
    editDevicerec.value = normalizeDevicerec(queue.value?.devicerec)
    const g = queue.value?.greetnum
    editGreetnum.value = (g == null || g === '' || String(g).trim() === 'None') ? '' : String(g).trim()
    editOptions.value = queue.value?.options ?? ''
  } catch (err) {
    error.value = firstErrorMessage(err, 'Failed to load queue')
    queue.value = null
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchTenants().then(() => fetchQueue())
})
watch(pkey, fetchQueue)

function goBack() {
  router.push({ name: 'queues' })
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
    const body = {
      cluster: editCluster.value.trim(),
      devicerec: editDevicerec.value || 'None'
    }
    if (editGreetnum.value.trim() !== '') body.greetnum = editGreetnum.value.trim()
    if (editOptions.value.trim() !== '') body.options = editOptions.value.trim()
    await getApiClient().put(`queues/${encodeURIComponent(pkey.value)}`, body)
    await fetchQueue()
    toast.show(`Queue ${pkey.value} saved`)
  } catch (err) {
    saveError.value = firstErrorMessage(err, 'Failed to update queue')
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
    await getApiClient().delete(`queues/${encodeURIComponent(pkey.value)}`)
    toast.show(`Queue ${pkey.value} deleted`)
    router.push({ name: 'queues' })
  } catch (err) {
    deleteError.value = firstErrorMessage(err, 'Failed to delete queue')
  } finally {
    deleting.value = false
    confirmDeleteOpen.value = false
  }
}

const displayName = computed(() => queue.value?.pkey ?? pkey.value ?? '')
</script>

<template>
  <div class="detail-view" @keydown="onKeydown">
    <h1>Edit Queue {{ displayName }}</h1>

    <p v-if="loading" class="loading">Loading…</p>
    <p v-else-if="error" class="error">{{ error }}</p>
    <template v-else-if="queue">
      <div class="detail-content">
        <p v-if="deleteError" class="error">{{ deleteError }}</p>

        <form class="edit-form" @submit="saveEdit">
          <p v-if="saveError" id="queue-edit-error" class="error" role="alert">{{ saveError }}</p>

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
            <FormReadonly id="edit-identity-pkey" label="Queue name" :value="queue.pkey ?? '—'" class="readonly-identity" />
            <FormReadonly v-if="queue.shortuid != null && queue.shortuid !== ''" id="edit-identity-shortuid" label="Local UID" :value="queue.shortuid ?? '—'" class="readonly-identity" />
            <FormReadonly v-if="queue.id != null && queue.id !== ''" id="edit-identity-id" label="KSUID" :value="queue.id ?? '—'" class="readonly-identity" />
            <FormSelect
              id="edit-cluster"
              v-model="editCluster"
              label="Tenant"
              :options="tenantOptionsForSelect"
              :required="true"
            />
          </div>

          <h2 class="detail-heading">Options</h2>
          <div class="form-fields">
            <FormSelect
              id="edit-devicerec"
              v-model="editDevicerec"
              label="Device recording"
              :options="devicerecOptions"
              :required="true"
            />
            <FormField
              id="edit-greetnum"
              v-model="editGreetnum"
              label="Greeting number"
              type="text"
              placeholder="usergreeting1234"
            />
            <FormField
              id="edit-options"
              v-model="editOptions"
              label="Options"
              type="text"
              placeholder="Alpha options"
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
      title="Delete queue?"
      :loading="deleting"
      @confirm="confirmAndDelete"
      @cancel="cancelConfirmDelete"
    >
      <template #body>
        <p>Queue <strong>{{ displayName }}</strong> will be permanently deleted. This cannot be undone.</p>
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
