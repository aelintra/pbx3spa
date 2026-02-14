<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useSchema } from '@/composables/useSchema'
import { useToastStore } from '@/stores/toast'
import FormField from '@/components/forms/FormField.vue'
import FormSelect from '@/components/forms/FormSelect.vue'
import FormSegmentedPill from '@/components/forms/FormSegmentedPill.vue'
import FormToggle from '@/components/forms/FormToggle.vue'
import FormReadonly from '@/components/forms/FormReadonly.vue'
import DeleteConfirmModal from '@/components/DeleteConfirmModal.vue'
import { ADVANCED_KEYS, ADVANCED_FIELDS, buildAdvancedPayload } from '@/constants/tenantAdvanced'
import { firstErrorMessage } from '@/utils/formErrors'

const route = useRoute()
const router = useRouter()
const toast = useToastStore()
const { getSchema, ensureFetched } = useSchema()
function isReadOnly(field) {
  return getSchema('tenants')?.read_only?.includes(field) ?? false
}
const tenant = ref(null)
const loading = ref(true)
const error = ref('')
const editDescription = ref('')
const editClusterclid = ref('')
const editAbstimeout = ref('')
const editChanmax = ref('')
const editMasteroclo = ref('AUTO')
const saveError = ref('')
const saving = ref(false)
const deleteError = ref('')
const deleting = ref(false)
const confirmDeleteOpen = ref(false)

const pkey = computed(() => route.params.pkey)
const isDefault = computed(() => tenant.value?.pkey === 'default')

const formAdvanced = reactive(
  Object.fromEntries(ADVANCED_KEYS.map((k) => [k, '']))
)

async function fetchTenant() {
  if (!pkey.value) return
  loading.value = true
  error.value = ''
  try {
    tenant.value = await getApiClient().get(`tenants/${encodeURIComponent(pkey.value)}`)
    syncEditFromTenant()
  } catch (err) {
    error.value = err.data?.message || err.message || 'Failed to load tenant'
    tenant.value = null
  } finally {
    loading.value = false
  }
}

function syncEditFromTenant() {
  if (!tenant.value) return
  const t = tenant.value
  editDescription.value = t.description ?? ''
  editClusterclid.value = t.clusterclid != null && t.clusterclid !== '' ? String(t.clusterclid) : ''
  editAbstimeout.value = t.abstimeout != null && t.abstimeout !== '' ? String(t.abstimeout) : ''
  editChanmax.value = t.chanmax != null && t.chanmax !== '' ? String(t.chanmax) : ''
  editMasteroclo.value = (t.masteroclo != null && t.masteroclo !== '') ? t.masteroclo : 'AUTO'
  for (const k of ADVANCED_KEYS) {
    const v = t[k]
    if (v === true || v === false) {
      formAdvanced[k] = v ? 'YES' : 'NO'
    } else if (v != null && v !== '') {
      formAdvanced[k] = String(v)
    } else {
      formAdvanced[k] = ''
    }
  }
}

onMounted(async () => {
  await ensureFetched()
  await fetchTenant()
})
watch(pkey, fetchTenant)

function goBack() {
  router.push({ name: 'tenants' })
}

function cancelEdit() {
  goBack()
}

async function saveEdit(e) {
  e.preventDefault()
  saveError.value = ''
  saving.value = true
  try {
    await getApiClient().put(`tenants/${encodeURIComponent(pkey.value)}`, {
      description: editDescription.value.trim() || undefined,
      clusterclid: editClusterclid.value.trim() ? editClusterclid.value.trim() : null,
      abstimeout: editAbstimeout.value.trim() ? editAbstimeout.value.trim() : undefined,
      chanmax: editChanmax.value.trim() ? editChanmax.value.trim() : undefined,
      masteroclo: editMasteroclo.value.trim() || undefined,
      ...buildAdvancedPayload(formAdvanced)
    })
    await fetchTenant()
    toast.show(`Tenant ${pkey.value} saved`)
  } catch (err) {
    saveError.value = firstErrorMessage(err, 'Failed to update tenant')
  } finally {
    saving.value = false
  }
}

function askConfirmDelete() {
  if (isDefault.value) {
    deleteError.value = 'Cannot delete the default tenant.'
    return
  }
  deleteError.value = ''
  confirmDeleteOpen.value = true
}

function cancelConfirmDelete() {
  confirmDeleteOpen.value = false
}

async function confirmAndDelete() {
  if (isDefault.value) return
  deleteError.value = ''
  deleting.value = true
  try {
    await getApiClient().delete(`tenants/${encodeURIComponent(pkey.value)}`)
    toast.show(`Tenant ${pkey.value} deleted`)
    router.push({ name: 'tenants' })
  } catch (err) {
    deleteError.value = err.data?.message ?? err.data?.Error ?? err.message ?? 'Failed to delete tenant'
  } finally {
    deleting.value = false
    confirmDeleteOpen.value = false
  }
}

</script>

<template>
  <div class="detail-view">
    <h1>Edit Tenant {{ pkey }}</h1>

    <p v-if="loading" class="loading">Loading…</p>
    <p v-else-if="error" class="error">{{ error }}</p>
    <template v-else-if="tenant">
      <div class="detail-content">
        <p v-if="deleteError" class="error">{{ deleteError }}</p>

        <form class="edit-form" @submit="saveEdit">
          <p v-if="saveError" id="tenant-edit-error" class="error" role="alert">{{ saveError }}</p>

          <div class="edit-actions edit-actions-top">
            <button type="submit" :disabled="saving">{{ saving ? 'Saving…' : 'Save' }}</button>
            <button type="button" class="secondary" @click="cancelEdit">Cancel</button>
            <button
              v-if="!isDefault"
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
            <FormReadonly v-if="isReadOnly('pkey')" id="edit-identity-pkey" label="Name" :value="tenant.pkey ?? '—'" class="readonly-identity" />
            <FormField v-else id="edit-identity-pkey" :model-value="tenant.pkey ?? '—'" label="Name" disabled class="readonly-identity" />
            <FormReadonly v-if="isReadOnly('shortuid')" id="edit-identity-shortuid" label="Local UID" :value="tenant.shortuid ?? '—'" class="readonly-identity" />
            <FormField v-else id="edit-identity-shortuid" :model-value="tenant.shortuid ?? '—'" label="Local UID" disabled class="readonly-identity" />
            <FormReadonly v-if="isReadOnly('id')" id="edit-identity-id" label="KSUID" :value="tenant.id ?? '—'" class="readonly-identity" />
            <FormField v-else id="edit-identity-id" :model-value="tenant.id ?? '—'" label="KSUID" disabled class="readonly-identity" />
            <FormField
              id="edit-description"
              v-model="editDescription"
              label="Description"
              type="text"
              placeholder="Short description"
            />
          </div>

          <h2 class="detail-heading">Settings</h2>
          <div class="form-fields">
            <FormField
              id="edit-clusterclid"
              v-model="editClusterclid"
              label="CLID"
              type="text"
              placeholder="integer"
            />
            <FormField
              id="edit-abstimeout"
              v-model="editAbstimeout"
              label="Abstime"
              type="text"
              placeholder="integer"
            />
            <FormField
              id="edit-chanmax"
              v-model="editChanmax"
              label="ChanMax"
              type="text"
              placeholder="integer"
            />
            <FormSegmentedPill
              id="edit-masteroclo"
              v-model="editMasteroclo"
              label="Timer status"
              :options="['AUTO', 'CLOSED']"
            />
          </div>

          <h2 class="detail-heading">Advanced</h2>
          <div class="form-fields advanced-fields">
            <template v-for="f in ADVANCED_FIELDS" :key="f.key">
                <FormToggle
                  v-if="f.type === 'boolean'"
                  :id="`edit-adv-${f.key}`"
                  v-model="formAdvanced[f.key]"
                  :label="f.label"
                  yes-value="YES"
                  no-value="NO"
                />
                <FormToggle
                  v-else-if="f.type === 'pill' && f.options && f.options.length === 2"
                  :id="`edit-adv-${f.key}`"
                  v-model="formAdvanced[f.key]"
                  :label="f.label"
                  :yes-value="f.options[0]"
                  :no-value="f.options[1]"
                />
                <FormSelect
                  v-else-if="f.type === 'pill'"
                  :id="`edit-adv-${f.key}`"
                  v-model="formAdvanced[f.key]"
                  :label="f.label"
                  :options="f.options"
                  :required="false"
                />
                <FormField
                  v-else-if="f.type === 'number'"
                  :id="`edit-adv-${f.key}`"
                  v-model="formAdvanced[f.key]"
                  :label="f.label"
                  type="number"
                  :placeholder="f.placeholder || 'number'"
                />
                <FormField
                  v-else
                  :id="`edit-adv-${f.key}`"
                  v-model="formAdvanced[f.key]"
                  :label="f.label"
                  type="text"
                  :placeholder="f.placeholder || ''"
                />
            </template>
          </div>

          <div class="edit-actions">
            <button type="submit" :disabled="saving">{{ saving ? 'Saving…' : 'Save' }}</button>
            <button type="button" class="secondary" @click="cancelEdit">Cancel</button>
            <button
              v-if="!isDefault"
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
      title="Delete tenant?"
      :loading="deleting"
      @confirm="confirmAndDelete"
      @cancel="cancelConfirmDelete"
    >
      <template #body>
        <p>Tenant <strong>{{ pkey }}</strong> will be permanently deleted. This cannot be undone.</p>
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
.advanced-fields {
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
</style>
