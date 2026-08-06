<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useSchema } from '@/composables/useSchema'
import { useToastStore } from '@/stores/toast'
import { firstErrorMessage } from '@/utils/formErrors'
import { validateDialPrefixPkey } from '@/utils/validation'
import {
  loadTargetTenantFqdnCatalog,
  callingTenantPkeys,
  callingTenantFqdn,
  targetFqdnSelectOptions
} from '@/utils/loadTargetTenantFqdnCatalog'
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

const isManaged = computed(() => String(row.value?.source || '').toLowerCase() === 'cohort')

function fieldLocked(field) {
  return isManaged.value || isReadOnly(field)
}

const shortuid = computed(() => route.params.shortuid)
const row = ref(null)
const localTenants = ref([])
const targetFqdns = ref([])
const targetLabels = ref(new Map())
const catalogAttempted = ref(false)
const catalogOk = ref(false)
const catalogLoading = ref(true)
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
const editTargetFqdn = ref('')
const editDescription = ref('')
const editActive = ref('YES')

const tenantOptions = computed(() => {
  const list = callingTenantPkeys(localTenants.value)
  const cur = editCluster.value
  let opts = [...list]
  if (cur && !opts.includes(cur)) opts = [cur, ...opts]
  return opts
})

const clusterToTenantPkey = computed(() => {
  const map = new Map()
  for (const t of localTenants.value) {
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

const targetOptions = computed(() => {
  const base = targetFqdnSelectOptions(targetFqdns.value, targetLabels.value, {
    excludeFqdn: callingTenantFqdn(localTenants.value, editCluster.value)
  })
  const cur = String(editTargetFqdn.value || '')
    .trim()
    .toLowerCase()
  if (cur && !base.some((o) => o.value === cur)) {
    // Stale row (catalog moved/removed) — keep current so edit isn't stuck; pick a known one to fix
    return [
      {
        value: cur,
        label: `${cur} (saved — not in known list)`
      },
      ...base
    ]
  }
  return base
})

const catalogHint = computed(() => {
  if (catalogLoading.value) return ''
  if (catalogAttempted.value && !catalogOk.value) {
    return 'Fleet catalog unavailable — showing local tenants only (plus current saved FQDN if missing).'
  }
  return 'Targets are limited to tenants we know (local + fleet catalog).'
})

async function loadCatalog() {
  catalogLoading.value = true
  try {
    const cat = await loadTargetTenantFqdnCatalog()
    localTenants.value = cat.localTenants
    targetFqdns.value = cat.fqdns
    targetLabels.value = cat.labels
    catalogAttempted.value = cat.catalogAttempted
    catalogOk.value = cat.catalogOk
  } catch {
    localTenants.value = []
    targetFqdns.value = []
    targetLabels.value = new Map()
    catalogAttempted.value = false
    catalogOk.value = false
  } finally {
    catalogLoading.value = false
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
    editTargetFqdn.value = String(row.value?.target_fqdn ?? '')
      .trim()
      .toLowerCase()
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
  await loadCatalog()
  await fetchRow()
})
watch(shortuid, () => {
  if (isFleetNode()) fetchRow()
})
watch(editCluster, () => {
  const self = callingTenantFqdn(localTenants.value, editCluster.value)
  if (self && String(editTargetFqdn.value).toLowerCase() === self) {
    editTargetFqdn.value = ''
  }
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
  if (!shortuid.value || isManaged.value) return
  saveError.value = ''
  if (validateDialPrefixPkey(editPkey.value)) {
    saveError.value = validateDialPrefixPkey(editPkey.value)
    return
  }
  const fqdn = String(editTargetFqdn.value || '')
    .trim()
    .toLowerCase()
  if (!fqdn) {
    saveError.value = 'Select a target tenant'
    return
  }
  const known = new Set(targetFqdns.value)
  const wasSaved = String(row.value?.target_fqdn ?? '')
    .trim()
    .toLowerCase()
  // May keep existing saved if not in list; may not switch to other unknowns
  if (!known.has(fqdn) && fqdn !== wasSaved) {
    saveError.value = 'Target must be chosen from the known tenant list'
    return
  }
  saving.value = true
  try {
    const body = {
      ...(fieldLocked('pkey') ? {} : { pkey: editPkey.value.trim() }),
      ...(fieldLocked('cluster') ? {} : { cluster: editCluster.value }),
      ...(fieldLocked('target_fqdn') ? {} : { target_fqdn: fqdn }),
      ...(fieldLocked('description') ? {} : { description: editDescription.value }),
      ...(fieldLocked('active') ? {} : { active: editActive.value })
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
  if (isManaged.value) return
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
            {{ isManaged ? 'View' : 'Edit' }} dial prefix
            {{ row?.pkey ?? shortuid }}{{ panelTitleTenantSuffix }}
          </h1>
          <DetailActiveStatusBar
            v-if="row && !fleetBlocked"
            v-model="editActive"
            :readonly="fieldLocked('active')"
            toggle-id="edit-dialalias-active"
          />
        </div>
        <p v-if="row && isManaged" class="detail-active-inactive-hint" role="status">
          Managed by a Site Group — edit membership or routing prefixes in Fleet → Site Groups.
        </p>
        <p v-else-if="row && editActive === 'NO'" class="detail-active-inactive-hint" role="status">
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
        <button v-if="!isManaged" type="submit" :disabled="saving || catalogLoading">
          {{ saving ? 'Saving…' : 'Save' }}
        </button>
        <button type="button" class="secondary" @click="goBack">
          {{ isManaged ? 'Back' : 'Cancel' }}
        </button>
        <button
          v-if="!isManaged"
          type="button"
          class="action-delete"
          :disabled="deleting"
          @click="askDelete"
        >
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

        <FormReadonly
          v-if="isManaged"
          id="edit-source"
          label="Source"
          :value="row?.cohort_id ? `Site group (${row.cohort_id})` : 'Site group'"
        />

        <FormField
          id="edit-pkey"
          v-model="editPkey"
          label="Prefix"
          help-pkey="dialprefix"
          inputmode="numeric"
          :disabled="fieldLocked('pkey')"
        />

        <FormSelect
          id="edit-cluster"
          v-model="editCluster"
          label="Calling tenant"
          :options="tenantOptions"
          :disabled="fieldLocked('cluster')"
        />

        <FormSelect
          id="edit-target-fqdn"
          v-model="editTargetFqdn"
          label="Target tenant"
          help-pkey="dialprefix_target"
          :options="targetOptions"
          :loading="catalogLoading"
          :hint="catalogHint"
          :disabled="fieldLocked('target_fqdn')"
        />

        <FormField
          id="edit-description"
          v-model="editDescription"
          label="Description"
          help-pkey="description"
          :disabled="fieldLocked('description')"
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
