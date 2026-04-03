<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useSchema } from '@/composables/useSchema'
import { useToastStore } from '@/stores/toast'
import { firstErrorMessage } from '@/utils/formErrors'
import FormField from '@/components/forms/FormField.vue'
import FormReadonly from '@/components/forms/FormReadonly.vue'
import DeleteConfirmModal from '@/components/DeleteConfirmModal.vue'
import PanelBackLink from '@/components/PanelBackLink.vue'

const route = useRoute()
const router = useRouter()
const toast = useToastStore()
const { getSchema, ensureFetched } = useSchema()

function isReadOnly(field) {
  return getSchema('helpcore')?.read_only?.includes(field) ?? false
}

const pkey = computed(() => route.params.pkey)
const messageRow = ref(null)
const loading = ref(true)
const error = ref('')
const saving = ref(false)
const saveError = ref('')
const deleting = ref(false)
const deleteError = ref('')
const confirmDeleteOpen = ref(false)

const editDisplayname = ref('')
const editHtext = ref('')

async function fetchMessage() {
  if (!pkey.value) return
  loading.value = true
  error.value = ''
  saveError.value = ''
  deleteError.value = ''
  try {
    messageRow.value = await getApiClient().get(`helpcore/${encodeURIComponent(pkey.value)}`)
    editDisplayname.value = messageRow.value?.displayname ?? ''
    editHtext.value = messageRow.value?.htext ?? ''
  } catch (err) {
    error.value = firstErrorMessage(err, 'Failed to load help message')
    messageRow.value = null
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await ensureFetched()
  await fetchMessage()
})
watch(pkey, fetchMessage)

function goBack() {
  router.push({ name: 'help-messages' })
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
  if (!pkey.value) return
  saveError.value = ''
  saving.value = true
  try {
    const body = {}
    if (!isReadOnly('displayname')) body.displayname = editDisplayname.value?.trim() || null
    if (!isReadOnly('htext')) body.htext = editHtext.value?.trim() || null
    const cleaned = Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined))
    await getApiClient().put(`helpcore/${encodeURIComponent(pkey.value)}`, cleaned)
    toast.show('Help message saved')
    await fetchMessage()
  } catch (err) {
    saveError.value = firstErrorMessage(err, 'Failed to save help message')
  } finally {
    saving.value = false
  }
}

function askDelete() {
  confirmDeleteOpen.value = true
}

async function confirmDelete() {
  if (!pkey.value) return
  deleting.value = true
  deleteError.value = ''
  try {
    await getApiClient().delete(`helpcore/${encodeURIComponent(pkey.value)}`)
    toast.show('Help message deleted')
    confirmDeleteOpen.value = false
    goBack()
  } catch (err) {
    deleteError.value = firstErrorMessage(err, 'Failed to delete help message')
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div class="detail-view" @keydown="onKeydown">
    <PanelBackLink :to="{ name: 'help-messages' }" label="Help Messages">
      <h1>Edit help message {{ pkey }}</h1>
    </PanelBackLink>

    <section v-if="loading || error" class="detail-states">
      <p v-if="loading" class="loading">Loading help message…</p>
      <p v-else-if="error" class="error">{{ error }}</p>
    </section>

    <form v-else class="form edit-form" @submit="saveEdit">
      <p v-if="saveError" class="error" role="alert">{{ saveError }}</p>
      <p v-if="deleteError" class="error" role="alert">{{ deleteError }}</p>

      <div class="edit-actions edit-actions-top">
        <button type="submit" :disabled="saving">{{ saving ? 'Saving…' : 'Save' }}</button>
        <button type="button" class="secondary" @click="cancelEdit">Cancel</button>
        <button type="button" class="action-delete" :disabled="deleting" @click="askDelete">
          {{ deleting ? 'Deleting…' : 'Delete' }}
        </button>
      </div>

      <h2 class="detail-heading">Identity</h2>
      <div class="form-fields">
        <FormReadonly id="edit-identity-pkey" label="Message key" :value="messageRow?.pkey ?? pkey ?? '—'" class="readonly-identity" />
        <FormField
          v-if="!isReadOnly('displayname')"
          id="displayname"
          v-model="editDisplayname"
          label="Display name"
        />
        <FormReadonly v-else id="displayname" label="Display name" :value="messageRow?.displayname ?? '—'" />
      </div>

      <h2 class="detail-heading">System</h2>
      <div class="form-fields">
        <FormReadonly id="z_created" label="Created" :value="messageRow?.z_created ?? '—'" />
        <FormReadonly id="z_updated" label="Updated" :value="messageRow?.z_updated ?? '—'" />
        <FormReadonly id="z_updater" label="Updater" :value="messageRow?.z_updater ?? '—'" />
      </div>

      <h2 class="detail-heading">Help text</h2>
      <div class="longtext-section">
        <div class="form-fields provision-section">
          <FormField
            v-if="!isReadOnly('htext')"
            id="htext"
            v-model="editHtext"
            label="Help text"
            multiline
            :rows="16"
          />
          <FormReadonly v-else id="htext" label="Help text" :value="messageRow?.htext ?? ''" />
        </div>
      </div>

      <div class="edit-actions">
        <button type="submit" :disabled="saving">{{ saving ? 'Saving…' : 'Save' }}</button>
        <button type="button" class="secondary" @click="cancelEdit">Cancel</button>
        <button type="button" class="action-delete" :disabled="deleting" @click="askDelete">
          {{ deleting ? 'Deleting…' : 'Delete' }}
        </button>
      </div>
    </form>

    <DeleteConfirmModal
      :show="confirmDeleteOpen"
      title="Delete help message?"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="() => (confirmDeleteOpen = false)"
    >
      <template #body>
        <p>Help message <strong>{{ pkey }}</strong> will be permanently deleted. This cannot be undone.</p>
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
.readonly-identity :deep(.form-field-label),
.readonly-identity :deep(.form-readonly) {
  color: #94a3b8;
}
.readonly-identity :deep(.form-readonly) {
  background-color: #f1f5f9;
  border-color: #e2e8f0;
}

.longtext-section .provision-section :deep(.form-input-textarea) {
  min-width: 80ch;
}
</style>
