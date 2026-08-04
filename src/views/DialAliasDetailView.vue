<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useSchema } from '@/composables/useSchema'
import { useToastStore } from '@/stores/toast'
import { firstErrorMessage } from '@/utils/formErrors'
import { loadTenantOptions } from '@/utils/loadTenantOptions'
import { useFleetPosture } from '@/composables/useFleetPosture'
import FormField from '@/components/forms/FormField.vue'
import FormSelect from '@/components/forms/FormSelect.vue'
import FormReadonly from '@/components/forms/FormReadonly.vue'
import DeleteConfirmModal from '@/components/DeleteConfirmModal.vue'
import PanelBackLink from '@/components/PanelBackLink.vue'
import DetailActiveStatusBar from '@/components/DetailActiveStatusBar.vue'

const route = useRoute()
const router = useRouter()
const toast = useToastStore()
const { getSchema, ensureFetched } = useSchema()
const { loadFleetPosture, isFleetNode } = useFleetPosture()

function isReadOnly(field) {
  return getSchema('dialaliases')?.read_only?.includes(field) ?? false
}

const shortuid = computed(() => route.params.shortuid)
const row = ref(null)
const tenants = ref([])
const tenantsLoading = ref(true)
const fleetBlocked = ref(false)

const loading = ref(true)
const error = ref('')
const saving = ref(false)
const saveError = ref('')
const deleting = ref(false)
const deleteError = ref('')
const confirmDeleteOpen = ref(false)

const editPkey = ref('')
const editCluster = ref('')
const editTarget = ref('')
const editDescription = ref('')
const editActive = ref('YES')

const tenantOptions = computed(() => {
  const list = tenants.value.map((t) => t.pkey).filter(Boolean)
  const cur = editCluster.value
  const curT = editTarget.value
  let opts = [...new Set(list)]
  if (cur && !opts.includes(cur)) opts = [cur, ...opts]
  if (curT && !opts.includes(curT)) opts = [curT, ...opts]
  return opts.sort((a, b) => String(a).localeCompare(String(b)))
})

const clusterToTenantPkey = computed(() => {
  const map = new Map()
  for (const t of tenants.value) {
    if (t.id != null) map.set(String(t.id), t.pkey ?? t.id)
    if (t.shortuid != null) map.set(String(t.shortuid), t.pkey ?? t.shortuid)
    if (t.pkey != null) map.set(String(t.pkey), t.pkey)
  }
  return map
})

function resolveTenantPkey(v) {
  if (v == null || v === '') return ''
  return clusterToTenantPkey.value.get(String(v)) ?? String(v)
}

async function loadTenants() {
  tenantsLoading.value = true
  try {
    tenants.value = await loadTenantOptions()
  } catch {
    tenants.value = []
  } finally {
    tenantsLoading.value = false
  }
}

async function fetchRow() {
  if (!shortuid.value) return
  loading.value = true
  error.value = ''
  saveError.value = ''
  deleteError.value = ''
  try {
    row.value = await getApiClient().get(`dialaliases/${encodeURIComponent(shortuid.value)}`)
    editPkey.value = row.value?.pkey ?? ''
    editCluster.value = resolveTenantPkey(row.value?.cluster ?? '')
    editTarget.value =
      row.value?.target_tenant_pkey != null && row.value.target_tenant_pkey !== ''
        ? String(row.value.target_tenant_pkey)
        : resolveTenantPkey(row.value?.target_cluster ?? '')
    editDescription.value = row.value?.description ?? ''
    editActive.value = row.value?.active ?? 'YES'
  } catch (err) {
    error.value = firstErrorMessage(err, 'Failed to load dial prefix')
    row.value = null
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadFleetPosture()
  if (!isFleetNode()) {
    fleetBlocked.value = true
    loading.value = false
    return
  }
  await ensureFetched()
  await loadTenants()
  await fetchRow()
})
watch(shortuid, () => {
  if (isFleetNode()) fetchRow()
})

function goBack() {
  router.push({ name: 'dialaliases' })
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
  if (editCluster.value && editTarget.value && editCluster.value === editTarget.value) {
    saveError.value = 'Target tenant must differ from calling tenant'
    return
  }
  if (!/^\d{2,4}$/.test(String(editPkey.value || '').trim())) {
    saveError.value = 'Prefix must be 2–4 numeric digits'
    return
  }
  saving.value = true
  try {
    const body = {
      ...(isReadOnly('pkey') ? {} : { pkey: editPkey.value.trim() }),
      ...(isReadOnly('cluster') ? {} : { cluster: editCluster.value }),
      ...(isReadOnly('target_cluster') ? {} : { target_cluster: editTarget.value }),
      ...(isReadOnly('description') ? {} : { description: editDescription.value }),
      ...(isReadOnly('active') ? {} : { active: editActive.value })
    }
    await getApiClient().put(`dialaliases/${encodeURIComponent(shortuid.value)}`, body)
    toast.show('Dial prefix saved')
    await fetchRow()
  } catch (err) {
    saveError.value = firstErrorMessage(err, 'Failed to save dial prefix')
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
    await getApiClient().delete(`dialaliases/${encodeURIComponent(shortuid.value)}`)
    toast.show('Dial prefix deleted')
    confirmDeleteOpen.value = false
    goBack()
  } catch (err) {
    deleteError.value = firstErrorMessage(err, 'Failed to delete dial prefix')
  } finally {
    deleting.value = false
  }
}

const panelTitleTenantSuffix = computed(() => {
  if (!row.value) return ''
  const t = String(editCluster.value ?? '').trim()
  if (!t) return ''
  return ` (${t})`
})
</script>

<template>
  <div class="detail-view" @keydown="onKeydown">
    <PanelBackLink :to="{ name: 'dialaliases' }" label="Dial prefixes">
      <div class="detail-panel-head">
        <div class="detail-title-status-row">
          <h1 class="detail-panel-title">
            Edit dial prefix {{ row?.pkey ?? shortuid }}{{ panelTitleTenantSuffix }}
          </h1>
          <DetailActiveStatusBar
            v-if="row && !fleetBlocked"
            v-model="editActive"
            :readonly="isReadOnly('active')"
            toggle-id="edit-dialalias-active"
          />
        </div>
        <p v-if="row && editActive === 'NO'" class="detail-active-inactive-hint" role="status">
          Inactive prefixes are ignored once GenAst emits dialplan (slice C).
        </p>
      </div>
    </PanelBackLink>

    <section v-if="fleetBlocked" class="detail-states">
      <p class="error">Dial prefixes are fleet-only in v1.</p>
    </section>

    <section v-else-if="loading || error" class="detail-states">
      <p v-if="loading" class="loading">Loading dial prefix…</p>
      <p v-else-if="error" class="error">{{ error }}</p>
    </section>

    <form v-else class="form edit-form" @submit="saveEdit">
      <p v-if="saveError" class="error" role="alert">{{ saveError }}</p>
      <p v-if="deleteError" class="error" role="alert">{{ deleteError }}</p>

      <div class="edit-actions edit-actions-top">
        <button type="submit" :disabled="saving || tenantsLoading">
          {{ saving ? 'Saving…' : 'Save' }}
        </button>
        <button type="button" class="secondary" @click="goBack">Cancel</button>
        <button type="button" class="action-delete" :disabled="deleting" @click="askDelete">
          {{ deleting ? 'Deleting…' : 'Delete' }}
        </button>
      </div>

      <h2 class="detail-heading">Dial prefix</h2>
      <div class="form-fields">
        <template v-if="row?.shortuid != null && row?.shortuid !== ''">
          <FormReadonly
            id="edit-identity-shortuid"
            label="UID"
            :value="row.shortuid ?? '—'"
            class="readonly-identity"
          />
        </template>

        <FormField
          id="edit-pkey"
          v-model="editPkey"
          label="Prefix"
          help-pkey="dialprefix"
          inputmode="numeric"
          :disabled="isReadOnly('pkey')"
        />

        <FormSelect
          id="edit-cluster"
          v-model="editCluster"
          label="Calling tenant"
          :options="tenantOptions"
          :disabled="isReadOnly('cluster')"
        />

        <FormSelect
          id="edit-target"
          v-model="editTarget"
          label="Target tenant"
          help-pkey="dialprefix_target"
          :options="tenantOptions"
          :disabled="isReadOnly('target_cluster')"
        />

        <FormField
          id="edit-description"
          v-model="editDescription"
          label="Description"
          help-pkey="description"
          :disabled="isReadOnly('description')"
        />
      </div>
    </form>

    <DeleteConfirmModal
      :show="confirmDeleteOpen"
      title="Delete dial prefix?"
      body-text="Remove this dial prefix permanently?"
      :loading="deleting"
      @cancel="confirmDeleteOpen = false"
      @confirm="confirmDelete"
    />
  </div>
</template>

<style scoped>
.detail-view {
  max-width: 52rem;
}
.detail-heading {
  font-size: 1rem;
  font-weight: 600;
  color: #334155;
  margin: 1.5rem 0 0.5rem 0;
}
.form-fields {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin-top: 0.5rem;
}
.error {
  color: #dc2626;
  font-size: 0.875rem;
}
.loading {
  color: #64748b;
}
.edit-actions {
  display: flex;
  gap: 0.75rem;
  margin: 0.5rem 0 1rem;
  flex-wrap: wrap;
}
.edit-actions button {
  padding: 0.5rem 1rem;
  font-size: 0.9375rem;
  font-weight: 500;
  border-radius: 0.375rem;
  cursor: pointer;
}
.edit-actions button[type='submit'] {
  color: #fff;
  background: #2563eb;
  border: none;
}
.edit-actions button.secondary {
  color: #64748b;
  background: transparent;
  border: 1px solid #e2e8f0;
}
.edit-actions button.action-delete {
  color: #b91c1c;
  background: transparent;
  border: 1px solid #fecaca;
  margin-left: auto;
}
</style>
