<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useSchema } from '@/composables/useSchema'
import { useToastStore } from '@/stores/toast'
import { loadTenantOptions } from '@/utils/loadTenantOptions'
import { firstErrorMessage } from '@/utils/formErrors'
import FormField from '@/components/forms/FormField.vue'
import FormSelect from '@/components/forms/FormSelect.vue'
import FormReadonly from '@/components/forms/FormReadonly.vue'
import FormToggle from '@/components/forms/FormToggle.vue'
import DeleteConfirmModal from '@/components/DeleteConfirmModal.vue'
import PanelBackLink from '@/components/PanelBackLink.vue'
import DetailActiveStatusBar from '@/components/DetailActiveStatusBar.vue'

const route = useRoute()
const router = useRouter()
const toast = useToastStore()
const { getSchema, ensureFetched } = useSchema()

function isReadOnly(field) {
  return getSchema('clidblocks')?.read_only?.includes(field) ?? false
}

const shortuid = computed(() => route.params.shortuid)
const row = ref(null)
const tenants = ref([])
const loading = ref(true)
const error = ref('')
const saveError = ref('')
const saving = ref(false)
const deleteError = ref('')
const deleting = ref(false)
const confirmDeleteOpen = ref(false)

const editCluster = ref('default')
const editCname = ref('')
const editDescription = ref('')
const editActive = ref('YES')

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
  if (cur && !list.includes(cur)) {
    return [cur, ...list].sort((a, b) => String(a).localeCompare(String(b)))
  }
  return list
})

async function fetchTenants() {
  try {
    tenants.value = await loadTenantOptions()
  } catch {
    tenants.value = []
  }
}

async function fetchRow() {
  if (!shortuid.value) return
  loading.value = true
  error.value = ''
  try {
    row.value = await getApiClient().get(`clidblocks/${encodeURIComponent(shortuid.value)}`)
    const clusterRaw = row.value?.cluster ?? 'default'
    editCluster.value = tenantShortuidToPkey.value[clusterRaw] ?? clusterRaw
    editCname.value = row.value?.cname ?? ''
    editDescription.value = row.value?.description ?? ''
    editActive.value = row.value?.active ?? 'YES'
  } catch (err) {
    error.value = firstErrorMessage(err, 'Failed to load blocked caller ID')
    row.value = null
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await ensureFetched()
  await fetchTenants()
  await fetchRow()
})
watch(shortuid, fetchRow)

function goBack() {
  router.push({ name: 'clidblocks' })
}

async function saveEdit(e) {
  e.preventDefault()
  saveError.value = ''
  saving.value = true
  try {
    const body = {
      cluster: editCluster.value.trim(),
      cname: editCname.value.trim() || null,
      description: editDescription.value.trim() || null,
      active: editActive.value,
      action: 'hangup'
    }
    await getApiClient().put(`clidblocks/${encodeURIComponent(shortuid.value)}`, body)
    toast.show('Blocked caller ID updated')
    await fetchRow()
  } catch (err) {
    saveError.value = firstErrorMessage(err, 'Failed to save')
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
    await getApiClient().delete(`clidblocks/${encodeURIComponent(shortuid.value)}`)
    toast.show('Blocked caller ID deleted')
    router.push({ name: 'clidblocks' })
  } catch (err) {
    deleteError.value = firstErrorMessage(err, 'Failed to delete')
  } finally {
    deleting.value = false
    confirmDeleteOpen.value = false
  }
}
</script>

<template>
  <div class="detail-view">
    <PanelBackLink :to="{ name: 'clidblocks' }" label="Blocked caller IDs">
      <h1>Blocked caller ID</h1>
    </PanelBackLink>

    <p v-if="loading" class="loading">Loading…</p>
    <p v-else-if="error" class="error">{{ error }}</p>

    <template v-else-if="row">
      <DetailActiveStatusBar :active="editActive" />

      <div class="detail-content">
        <p v-if="deleteError" class="error">{{ deleteError }}</p>

        <form class="edit-form" @submit="saveEdit">
          <p v-if="saveError" class="error" role="alert">{{ saveError }}</p>

          <div class="edit-actions edit-actions-top">
            <button type="submit" :disabled="saving">{{ saving ? 'Saving…' : 'Save' }}</button>
            <button type="button" class="secondary" @click="goBack">Cancel</button>
            <button
              type="button"
              class="action-delete"
              :disabled="deleting"
              @click="askConfirmDelete"
            >
              {{ deleting ? 'Deleting…' : 'Delete' }}
            </button>
          </div>

          <FormReadonly id="pkey" label="Caller ID" :model-value="row.pkey" />

          <FormSelect
            v-if="!isReadOnly('cluster')"
            id="cluster"
            v-model="editCluster"
            label="Tenant"
            :options="tenantOptionsForSelect"
            required
          />
          <FormReadonly v-else id="cluster-ro" label="Tenant" :model-value="editCluster" />

          <FormField id="cname" v-model="editCname" label="Name" :readonly="isReadOnly('cname')" />

          <FormField
            id="description"
            v-model="editDescription"
            label="Note"
            multiline
            :readonly="isReadOnly('description')"
          />

          <FormToggle
            id="active"
            v-model="editActive"
            label="Active"
            active-value="YES"
            inactive-value="NO"
            :disabled="isReadOnly('active')"
          />

          <FormReadonly id="action" label="Action" model-value="Hangup" />

          <section v-if="row.z_updated || row.z_updater" class="system-section">
            <h2>System</h2>
            <FormReadonly v-if="row.z_created" label="Created" :model-value="row.z_created" />
            <FormReadonly v-if="row.z_updated" label="Updated" :model-value="row.z_updated" />
            <FormReadonly v-if="row.z_updater" label="Updater" :model-value="row.z_updater" />
          </section>

          <div class="edit-actions">
            <button type="submit" :disabled="saving">{{ saving ? 'Saving…' : 'Save' }}</button>
            <button type="button" class="secondary" @click="goBack">Cancel</button>
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

      <DeleteConfirmModal
        :show="confirmDeleteOpen"
        title="Delete blocked caller ID?"
        :loading="deleting"
        @confirm="confirmAndDelete"
        @cancel="cancelConfirmDelete"
      >
        <template #body>
          <p>
            Remove this block? Inbound calls from caller ID
            <strong>{{ row.pkey ?? shortuid }}</strong> will be allowed again.
          </p>
        </template>
      </DeleteConfirmModal>
    </template>
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
.edit-actions-top {
  margin-top: 0;
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
.system-section {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--pbx-border, #e2e8f0);
}
.system-section h2 {
  font-size: 1rem;
  margin: 0 0 0.75rem;
}
</style>
