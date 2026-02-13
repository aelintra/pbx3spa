<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useToastStore } from '@/stores/toast'
import { normalizeList } from '@/utils/listResponse'
import { firstErrorMessage } from '@/utils/formErrors'
import FormField from '@/components/forms/FormField.vue'
import FormSelect from '@/components/forms/FormSelect.vue'
import FormToggle from '@/components/forms/FormToggle.vue'
import FormReadonly from '@/components/forms/FormReadonly.vue'
import DeleteConfirmModal from '@/components/DeleteConfirmModal.vue'

const route = useRoute()
const router = useRouter()
const toast = useToastStore()
const queue = ref(null)
const tenants = ref([])
const loading = ref(true)
const error = ref('')
const editActive = ref('YES')
const editCluster = ref('default')
const editDescription = ref('')
const editDevicerec = ref('None')
const editDivert = ref('')
const editGreetnum = ref('')
const editGreeting = ref('')
const editMembers = ref('')
const editMusicclass = ref('')
const editOptions = ref('')
const editRetry = ref('')
const editWrapuptime = ref('')
const editMaxlen = ref('')
const editStrategy = ref('ringall')
const editTimeout = ref('')
const editAlertinfo = ref('')
const saveError = ref('')
const saving = ref(false)
const deleteError = ref('')
const deleting = ref(false)
const confirmDeleteOpen = ref(false)

const shortuid = computed(() => route.params.shortuid)

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

const devicerecOptions = ['None', 'OTR', 'OTRR', 'Inbound', 'default']
const strategyOptions = ['ringall', 'roundrobin', 'leastrecent', 'fewestcalls', 'random', 'rrmemory']

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
  if (!shortuid.value) return
  loading.value = true
  error.value = ''
  try {
    queue.value = await getApiClient().get(`queues/${encodeURIComponent(shortuid.value)}`)
    const q = queue.value
    const clusterRaw = q?.cluster ?? 'default'
    editCluster.value = tenantShortuidToPkey.value[clusterRaw] ?? clusterRaw
    editActive.value = (q?.active === 'NO') ? 'NO' : 'YES'
    editDescription.value = q?.description ?? ''
    editDevicerec.value = normalizeDevicerec(q?.devicerec)
    editAlertinfo.value = q?.alertinfo ?? ''
    editDivert.value = q?.divert != null && q?.divert !== '' ? String(q.divert) : ''
    const g = q?.greetnum
    editGreetnum.value = (g == null || g === '' || String(g).trim() === 'None') ? '' : String(g).trim()
    const gr = q?.greeting
    editGreeting.value = (gr == null || gr === '' || String(gr).trim() === 'None') ? '' : String(gr).trim()
    editMembers.value = q?.members ?? ''
    editMusicclass.value = q?.musicclass ?? ''
    editOptions.value = q?.options ?? ''
    editRetry.value = q?.retry != null && q?.retry !== '' ? String(q.retry) : ''
    editWrapuptime.value = q?.wrapuptime != null && q?.wrapuptime !== '' ? String(q.wrapuptime) : ''
    editMaxlen.value = q?.maxlen != null && q?.maxlen !== '' ? String(q.maxlen) : ''
    editStrategy.value = strategyOptions.includes(q?.strategy) ? q.strategy : 'ringall'
    editTimeout.value = q?.timeout != null && q?.timeout !== '' ? String(q.timeout) : ''
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
watch(shortuid, fetchQueue)

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
      active: editActive.value,
      cluster: editCluster.value.trim(),
      description: editDescription.value.trim() || undefined,
      devicerec: editDevicerec.value || 'None',
      alertinfo: editAlertinfo.value.trim() || undefined,
      greetnum: editGreetnum.value.trim() || undefined,
      greeting: editGreeting.value.trim() || undefined,
      members: editMembers.value.trim() || undefined,
      musicclass: editMusicclass.value.trim() || undefined,
      options: editOptions.value.trim() || undefined,
      strategy: editStrategy.value,
      maxlen: parseInt(editMaxlen.value, 10),
      retry: parseInt(editRetry.value, 10),
      timeout: parseInt(editTimeout.value, 10),
      wrapuptime: parseInt(editWrapuptime.value, 10),
      divert: parseInt(editDivert.value, 10)
    }
    if (Number.isNaN(body.maxlen)) delete body.maxlen
    else if (body.maxlen === 0) body.maxlen = 0
    if (Number.isNaN(body.retry)) delete body.retry
    if (Number.isNaN(body.timeout)) delete body.timeout
    if (Number.isNaN(body.wrapuptime)) delete body.wrapuptime
    if (Number.isNaN(body.divert)) delete body.divert
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
    await getApiClient().delete(`queues/${encodeURIComponent(shortuid.value)}`)
    toast.show(`Queue deleted`)
    router.push({ name: 'queues' })
  } catch (err) {
    deleteError.value = firstErrorMessage(err, 'Failed to delete queue')
  } finally {
    deleting.value = false
    confirmDeleteOpen.value = false
  }
}

const displayName = computed(() => queue.value?.pkey ?? '')
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
              label="Tenant (required)"
              :options="tenantOptionsForSelect"
              :required="true"
            />
            <FormToggle
              id="edit-active"
              v-model="editActive"
              label="Active"
              yes-value="YES"
              no-value="NO"
            />
            <FormField
              id="edit-description"
              v-model="editDescription"
              label="Description"
              type="text"
            />
          </div>

          <h2 class="detail-heading">Options</h2>
          <div class="form-fields">
            <FormSelect
              id="edit-devicerec"
              v-model="editDevicerec"
              label="Device recording (required)"
              :options="devicerecOptions"
              :required="true"
            />
            <FormSelect
              id="edit-strategy"
              v-model="editStrategy"
              label="Strategy"
              :options="strategyOptions"
            />
            <FormField
              id="edit-greetnum"
              v-model="editGreetnum"
              label="Greeting number"
              type="text"
              placeholder="e.g. usergreeting1234"
            />
            <FormField
              id="edit-greeting"
              v-model="editGreeting"
              label="Greeting"
              type="text"
              placeholder="Override greetnum"
            />
            <FormField
              id="edit-options"
              v-model="editOptions"
              label="Options"
              type="text"
              placeholder="e.g. CiIknrtT"
            />
            <FormField
              id="edit-musicclass"
              v-model="editMusicclass"
              label="Music class"
              type="text"
            />
            <FormField
              id="edit-members"
              v-model="editMembers"
              label="Members"
              type="text"
              placeholder="Comma-separated member list"
            />
          </div>

          <h2 class="detail-heading">Timing &amp; limits</h2>
          <div class="form-fields">
            <FormField
              id="edit-timeout"
              v-model="editTimeout"
              label="Timeout (seconds)"
              type="text"
              inputmode="numeric"
              placeholder="e.g. 30"
            />
            <FormField
              id="edit-retry"
              v-model="editRetry"
              label="Retry"
              type="text"
              inputmode="numeric"
              placeholder="e.g. 1"
            />
            <FormField
              id="edit-wrapuptime"
              v-model="editWrapuptime"
              label="Wrap-up time"
              type="text"
              inputmode="numeric"
              placeholder="seconds"
            />
            <FormField
              id="edit-maxlen"
              v-model="editMaxlen"
              label="Max length"
              type="text"
              inputmode="numeric"
              placeholder="0 = unlimited"
            />
            <FormField
              id="edit-divert"
              v-model="editDivert"
              label="Divert"
              type="text"
              inputmode="numeric"
            />
          </div>

          <h2 class="detail-heading">Advanced</h2>
          <div class="form-fields">
            <FormField
              id="edit-alertinfo"
              v-model="editAlertinfo"
              label="Alert info"
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
