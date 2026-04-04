<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useSchema } from '@/composables/useSchema'
import { useToastStore } from '@/stores/toast'
import { firstErrorMessage } from '@/utils/formErrors'
import { normalizeList } from '@/utils/listResponse'
import FormField from '@/components/forms/FormField.vue'
import FormSelect from '@/components/forms/FormSelect.vue'
import FormToggle from '@/components/forms/FormToggle.vue'
import FormReadonly from '@/components/forms/FormReadonly.vue'
import DeleteConfirmModal from '@/components/DeleteConfirmModal.vue'
import PanelBackLink from '@/components/PanelBackLink.vue'
import DetailActiveStatusBar from '@/components/DetailActiveStatusBar.vue'

const route = useRoute()
const router = useRouter()
const toast = useToastStore()
const { getSchema, ensureFetched } = useSchema()

function isReadOnly(field) {
  return getSchema('customapps')?.read_only?.includes(field) ?? false
}

const shortuid = computed(() => route.params.shortuid)
const app = ref(null)
const tenants = ref([])
const tenantsLoading = ref(true)

const loading = ref(true)
const error = ref('')
const saving = ref(false)
const saveError = ref('')
const deleting = ref(false)
const deleteError = ref('')
const confirmDeleteOpen = ref(false)

// Editable fields
const editPkey = ref('')
const editCluster = ref('')
const editCname = ref('')
const editDescription = ref('')
const editSpan = ref('Neither')
const editActive = ref('YES')
const editStriptags = ref('NO')
const editDirectdial = ref('')
const editExtcode = ref('')

const spanOptions = ['Internal', 'External', 'Both', 'Neither']

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

// --- Tenant resolution (cluster may be pkey or shortuid) ---
const clusterToTenantPkey = computed(() => {
  const map = new Map()
  for (const t of tenants.value) {
    if (t.id != null) map.set(String(t.id), t.pkey ?? t.id)
    if (t.shortuid != null) map.set(String(t.shortuid), t.pkey ?? t.shortuid)
    if (t.pkey != null) map.set(String(t.pkey), t.pkey)
  }
  return map
})

function resolveClusterToTenantPkey(clusterValue) {
  if (clusterValue == null || clusterValue === '') return ''
  const s = String(clusterValue)
  return clusterToTenantPkey.value.get(s) ?? s
}

function parseIntOrNull(v) {
  if (v == null) return null
  const s = String(v).trim()
  if (s === '') return null
  const n = parseInt(s, 10)
  return isNaN(n) ? null : n
}

async function loadTenants() {
  tenantsLoading.value = true
  try {
    const res = await getApiClient().get('tenants')
    tenants.value = normalizeList(res, 'tenants')
  } catch {
    tenants.value = []
  } finally {
    tenantsLoading.value = false
  }
}

async function fetchApp() {
  if (!shortuid.value) return
  loading.value = true
  error.value = ''
  saveError.value = ''
  deleteError.value = ''
  try {
    app.value = await getApiClient().get(`customapps/${encodeURIComponent(shortuid.value)}`)
    editPkey.value = app.value?.pkey ?? ''
    editCluster.value = resolveClusterToTenantPkey(app.value?.cluster ?? '')
    editCname.value = app.value?.cname ?? ''
    editDescription.value = app.value?.description ?? ''
    editSpan.value = app.value?.span ?? 'Neither'
    editActive.value = app.value?.active ?? 'YES'
    editStriptags.value = app.value?.striptags ?? 'NO'
    editDirectdial.value = app.value?.directdial != null ? String(app.value.directdial) : ''
    editExtcode.value = app.value?.extcode ?? ''
  } catch (err) {
    error.value = firstErrorMessage(err, 'Failed to load custom app')
    app.value = null
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await ensureFetched()
  await loadTenants()
  await fetchApp()
})
watch(shortuid, fetchApp)

function goBack() {
  router.push({ name: 'customapps' })
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
  if (!shortuid.value) return
  saveError.value = ''
  saving.value = true
  try {
    const body = {
      ...(isReadOnly('pkey') ? {} : { pkey: editPkey.value.trim() }),
      ...(isReadOnly('cluster') ? {} : { cluster: editCluster.value }),
      ...(isReadOnly('cname') ? {} : { cname: editCname.value }),
      ...(isReadOnly('description') ? {} : { description: editDescription.value }),
      ...(isReadOnly('span') ? {} : { span: editSpan.value }),
      ...(isReadOnly('active') ? {} : { active: editActive.value }),
      ...(isReadOnly('striptags') ? {} : { striptags: editStriptags.value }),
      ...(isReadOnly('directdial') ? {} : { directdial: parseIntOrNull(editDirectdial.value) }),
      ...(isReadOnly('extcode') ? {} : { extcode: editExtcode.value })
    }
    await getApiClient().put(`customapps/${encodeURIComponent(shortuid.value)}`, body)
    toast.show('Custom app saved')
    await fetchApp()
  } catch (err) {
    saveError.value = firstErrorMessage(err, 'Failed to save custom app')
  } finally {
    saving.value = false
  }
}

function askDelete() {
  confirmDeleteOpen.value = true
}

async function confirmDelete() {
  if (!shortuid.value) return
  deleting.value = true
  deleteError.value = ''
  try {
    await getApiClient().delete(`customapps/${encodeURIComponent(shortuid.value)}`)
    toast.show('Custom app deleted')
    confirmDeleteOpen.value = false
    goBack()
  } catch (err) {
    deleteError.value = firstErrorMessage(err, 'Failed to delete custom app')
  } finally {
    deleting.value = false
  }
}

const panelTitleTenantSuffix = computed(() => {
  if (!app.value) return ''
  const t = String(editCluster.value ?? '').trim()
  if (!t) return ''
  return ` (${t})`
})
</script>

<template>
  <div class="detail-view" @keydown="onKeydown">
    <PanelBackLink :to="{ name: 'customapps' }" label="Custom Apps">
      <div class="detail-panel-head">
        <div class="detail-title-status-row">
          <h1 class="detail-panel-title">
            Edit Custom App {{ app?.pkey ?? shortuid }}{{ panelTitleTenantSuffix }}
          </h1>
          <DetailActiveStatusBar
            v-if="app"
            v-model="editActive"
            :readonly="isReadOnly('active')"
            toggle-id="edit-customapp-active"
          />
        </div>
        <p v-if="app && editActive === 'NO'" class="detail-active-inactive-hint" role="status">
          Inactive custom apps are not invoked by the dialplan until you activate this record and
          commit the change.
        </p>
      </div>
    </PanelBackLink>

    <section v-if="loading || error" class="detail-states">
      <p v-if="loading" class="loading">Loading custom app…</p>
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
        <template v-if="app?.shortuid != null && app?.shortuid !== ''">
          <FormReadonly
            id="edit-identity-shortuid"
            label="UID"
            :value="app.shortuid ?? '—'"
            class="readonly-identity"
          />
        </template>
        <template v-if="app?.id != null && app?.id !== ''">
          <FormReadonly
            id="edit-identity-id"
            label="KSUID"
            :value="app.id ?? '—'"
            class="readonly-identity"
          />
        </template>
        <FormField
          v-if="!isReadOnly('pkey')"
          id="edit-pkey"
          v-model="editPkey"
          label="App name"
          type="text"
          placeholder="e.g. MyApp_1"
          help-pkey="context"
        />
        <FormReadonly
          v-else
          id="edit-identity-pkey"
          label="App name"
          :value="app?.pkey ?? '—'"
          class="readonly-identity"
        />
        <FormField
          v-if="!isReadOnly('cname')"
          id="cname"
          v-model="editCname"
          label="Display name"
        />
        <FormReadonly v-else id="cname" label="Display name" :value="app?.cname ?? '—'" />

        <FormField
          v-if="!isReadOnly('description')"
          id="description"
          v-model="editDescription"
          label="Description"
        />
        <FormReadonly
          v-else
          id="description"
          label="Description"
          :value="app?.description ?? '—'"
        />
      </div>

      <h2 class="detail-heading">Settings</h2>
      <div class="form-fields">
        <FormSelect
          v-if="!isReadOnly('cluster')"
          id="cluster"
          v-model="editCluster"
          label="Tenant"
          :options="tenantOptionsForSelect"
          :disabled="tenantsLoading"
        />
        <FormReadonly
          v-else
          id="cluster"
          label="Tenant"
          :value="resolveClusterToTenantPkey(app?.cluster) || '—'"
        />

        <FormSelect
          v-if="!isReadOnly('span')"
          id="span"
          v-model="editSpan"
          label="Span"
          :options="spanOptions"
        />
        <FormReadonly v-else id="span" label="Span" :value="app?.span ?? '—'" />

        <FormToggle
          v-if="!isReadOnly('striptags')"
          id="striptags"
          v-model="editStriptags"
          label="Strip tags?"
        />
        <FormReadonly v-else id="striptags" label="Strip tags?" :value="app?.striptags ?? '—'" />

        <FormField
          v-if="!isReadOnly('directdial')"
          id="directdial"
          v-model="editDirectdial"
          label="Direct dial"
          type="number"
        />
        <FormReadonly v-else id="directdial" label="Direct dial" :value="app?.directdial ?? '—'" />
      </div>

      <h2 class="detail-heading">Code</h2>
      <div class="form-fields">
        <FormField
          v-if="!isReadOnly('extcode')"
          id="extcode"
          v-model="editExtcode"
          label="Extension code"
          multiline
          :rows="20"
          placeholder="Asterisk extensions.conf code"
          hint="Asterisk extensions.conf dialplan code (long text)."
        />
        <FormReadonly v-else id="extcode" label="Extension code" :value="app?.extcode ?? ''" />
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
      title="Delete custom app?"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="() => (confirmDeleteOpen.value = false)"
    >
      <template #body>
        <p>
          Custom app <strong>{{ app?.pkey ?? shortuid }}</strong> will be permanently deleted. This
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
.readonly-identity :deep(.form-field-label),
.readonly-identity :deep(.form-readonly) {
  color: #94a3b8;
}
.readonly-identity :deep(.form-readonly) {
  background-color: #f1f5f9;
  border-color: #e2e8f0;
}
</style>
