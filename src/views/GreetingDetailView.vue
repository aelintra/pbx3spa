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
import PanelBackLink from '@/components/PanelBackLink.vue'

const route = useRoute()
const router = useRouter()
const toast = useToastStore()
const { getSchema, ensureFetched } = useSchema()
function isReadOnly(field) {
  return getSchema('greetingrecords')?.read_only?.includes(field) ?? false
}

const greeting = ref(null)
const tenants = ref([])
const loading = ref(true)
const error = ref('')
const saveError = ref('')
const saving = ref(false)
const deleteError = ref('')
const deleting = ref(false)
const confirmDeleteOpen = ref(false)
const replacing = ref(false)
const replaceFile = ref(null)

const editCluster = ref('default')
const editCname = ref('')
const editDescription = ref('')

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
  if (cur && !list.includes(cur)) return [cur, ...list].sort((a, b) => String(a).localeCompare(String(b)))
  return list
})

async function fetchTenants() {
  try {
    const response = await getApiClient().get('tenants')
    tenants.value = normalizeList(response, 'tenants')
  } catch {
    tenants.value = []
  }
}

async function fetchGreeting() {
  if (!shortuid.value) return
  loading.value = true
  error.value = ''
  try {
    greeting.value = await getApiClient().get(`greetingrecords/${encodeURIComponent(shortuid.value)}`)
    const g = greeting.value
    const clusterRaw = g?.cluster ?? 'default'
    editCluster.value = tenantShortuidToPkey.value[clusterRaw] ?? clusterRaw
    editCname.value = g?.cname ?? ''
    editDescription.value = g?.description ?? ''
  } catch (err) {
    error.value = firstErrorMessage(err, 'Failed to load greeting')
    greeting.value = null
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await ensureFetched()
  await fetchTenants()
  await fetchGreeting()
})
watch(shortuid, fetchGreeting)

function goBack() {
  router.push({ name: 'greetings' })
}

function onKeydown(e) {
  if (e.key === 'Escape') {
    e.preventDefault()
    goBack()
  }
}

function onReplaceFileChange(event) {
  replaceFile.value = event?.target?.files?.[0] ?? null
}

async function saveEdit(e) {
  e.preventDefault()
  saveError.value = ''
  saving.value = true
  try {
    // If we have a replacement file, use multipart POST /replace; otherwise JSON PUT.
    if (replaceFile.value) {
      replacing.value = true
      const formData = new FormData()
      formData.append('cluster', editCluster.value.trim())
      if (editCname.value.trim()) formData.append('cname', editCname.value.trim())
      if (editDescription.value.trim()) formData.append('description', editDescription.value.trim())
      formData.append('greeting', replaceFile.value)
      await getApiClient().postFile(`greetingrecords/${encodeURIComponent(shortuid.value)}/replace`, formData)
    } else {
      const body = {
        cluster: editCluster.value.trim(),
        cname: editCname.value.trim() === '' ? null : editCname.value.trim(),
        description: editDescription.value.trim() === '' ? null : editDescription.value.trim()
      }
      await getApiClient().put(`greetingrecords/${encodeURIComponent(shortuid.value)}`, body)
    }

    replaceFile.value = null
    await fetchGreeting()
    toast.show(`Greeting saved`)
  } catch (err) {
    saveError.value = firstErrorMessage(err, 'Failed to update greeting')
  } finally {
    saving.value = false
    replacing.value = false
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
    await getApiClient().delete(`greetingrecords/${encodeURIComponent(shortuid.value)}`)
    toast.show('Greeting deleted')
    router.push({ name: 'greetings' })
  } catch (err) {
    deleteError.value = firstErrorMessage(err, 'Failed to delete greeting')
  } finally {
    deleting.value = false
    confirmDeleteOpen.value = false
  }
}

const displayName = computed(() => greeting.value?.pkey ?? '')

const panelTitleTenantSuffix = computed(() => {
  if (!greeting.value) return ''
  const t = String(editCluster.value ?? '').trim()
  if (!t) return ''
  return ` (${t})`
})
</script>

<template>
  <div class="detail-view" @keydown="onKeydown">
    <PanelBackLink :to="{ name: 'greetings' }" label="Greetings">
      <h1>Edit Greeting {{ displayName }}{{ panelTitleTenantSuffix }}</h1>
    </PanelBackLink>

    <p v-if="loading" class="loading">Loading…</p>
    <p v-else-if="error" class="error">{{ error }}</p>
    <template v-else-if="greeting">
      <div class="detail-content">
        <p v-if="deleteError" class="error">{{ deleteError }}</p>

        <form class="edit-form" @submit="saveEdit">
          <p v-if="saveError" id="greeting-edit-error" class="error" role="alert">{{ saveError }}</p>

          <div class="edit-actions edit-actions-top">
            <button type="submit" :disabled="saving">{{ saving ? (replacing ? 'Uploading…' : 'Saving…') : 'Save' }}</button>
            <button type="button" class="secondary" @click="goBack">Cancel</button>
            <button type="button" class="action-delete" :disabled="deleting" @click="askConfirmDelete">
              {{ deleting ? 'Deleting…' : 'Delete' }}
            </button>
          </div>

          <h2 class="detail-heading">Identity</h2>
          <div class="form-fields">
            <template v-if="greeting.shortuid != null && greeting.shortuid !== ''">
              <FormReadonly v-if="isReadOnly('shortuid')" id="edit-shortuid" label="UID" :value="greeting.shortuid ?? '—'" class="readonly-identity" />
              <FormField v-else id="edit-shortuid" :model-value="greeting.shortuid ?? '—'" label="UID" disabled class="readonly-identity" />
            </template>
            <template v-if="greeting.id != null && greeting.id !== ''">
              <FormReadonly v-if="isReadOnly('id')" id="edit-id" label="KSUID" :value="greeting.id ?? '—'" class="readonly-identity" />
              <FormField v-else id="edit-id" :model-value="greeting.id ?? '—'" label="KSUID" disabled class="readonly-identity" />
            </template>
            <FormReadonly id="edit-pkey" label="Greeting number" :value="String(greeting.pkey ?? '—')" class="readonly-identity" />
            <FormSelect id="edit-cluster" v-model="editCluster" label="Tenant (required)" :options="tenantOptionsForSelect" :required="true" />
          </div>

          <h2 class="detail-heading">Metadata</h2>
          <div class="form-fields">
            <FormField id="edit-cname" v-model="editCname" label="Common name" type="text" placeholder="Display name" />
            <FormField id="edit-description" v-model="editDescription" label="Description" type="text" />
            <FormReadonly id="edit-original" label="Original filename" :value="greeting.filename ?? '—'" />
            <FormReadonly id="edit-type" label="Type" :value="greeting.type ?? '—'" />
          </div>

          <h2 class="detail-heading">Audio</h2>
          <div class="form-fields">
            <label class="file-label" for="replaceFile">Replace audio (.wav or .mp3)</label>
            <input id="replaceFile" type="file" accept=".wav,.mp3,audio/wav,audio/mpeg" :disabled="saving" @change="onReplaceFileChange" />
            <p class="hint">Replacement will be saved as <strong>usergreeting{pkey}.wav/mp3</strong> in the tenant's sounds folder.</p>
          </div>

          <div class="edit-actions">
            <button type="submit" :disabled="saving">{{ saving ? (replacing ? 'Uploading…' : 'Saving…') : 'Save' }}</button>
            <button type="button" class="secondary" @click="goBack">Cancel</button>
            <button type="button" class="action-delete" :disabled="deleting" @click="askConfirmDelete">
              {{ deleting ? 'Deleting…' : 'Delete' }}
            </button>
          </div>
        </form>
      </div>
    </template>

    <DeleteConfirmModal
      :show="confirmDeleteOpen"
      title="Delete greeting?"
      :loading="deleting"
      @confirm="confirmAndDelete"
      @cancel="cancelConfirmDelete"
    >
      <template #body>
        <p>Greeting <strong>{{ displayName }}</strong> will be permanently deleted. This cannot be undone.</p>
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
.form-fields { display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.5rem; }
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
.file-label { font-size: 0.875rem; font-weight: 500; color: #0f172a; }
.hint { margin: 0; font-size: 0.875rem; color: #64748b; }
</style>

