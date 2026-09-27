<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useSchema } from '@/composables/useSchema'
import { useToastStore } from '@/stores/toast'
import { loadTenantOptions } from '@/utils/loadTenantOptions'
import { normalizeList } from '@/utils/listResponse'
import { firstErrorMessage } from '@/utils/formErrors'
import FormField from '@/components/forms/FormField.vue'
import FormSelect from '@/components/forms/FormSelect.vue'
import FormToggle from '@/components/forms/FormToggle.vue'
import FormReadonly from '@/components/forms/FormReadonly.vue'
import DeleteConfirmModal from '@/components/DeleteConfirmModal.vue'
import PanelBackLink from '@/components/PanelBackLink.vue'
import DetailActiveStatusBar from '@/components/DetailActiveStatusBar.vue'
import { useUnsavedForm } from '@/composables/useUnsavedForm'
import { refreshCommitStatusUi } from '@/utils/commitStatus'

const route = useRoute()
const router = useRouter()
const toast = useToastStore()
const { ensureFetched } = useSchema()
const { markDirty, beginHydrate, markClean } = useUnsavedForm()

const profile = ref(null)
const tenants = ref([])
const availableRules = ref([])
const loading = ref(true)
const rulesLoading = ref(false)
const error = ref('')
const editActive = ref('YES')
const editCluster = ref('default')
const editCname = ref('')
const editDescription = ref('')
const editIsDefault = ref('NO')
const openRules = ref({})
const closedRules = ref({})
const saveError = ref('')
const saving = ref(false)
const deleteError = ref('')
const deleting = ref(false)
const confirmDeleteOpen = ref(false)

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
  if (cur && !list.includes(cur))
    return [cur, ...list].sort((a, b) => String(a).localeCompare(String(b)))
  return list
})

function tenantAliases(tenantPkey) {
  const t = tenants.value.find(
    (row) =>
      String(row.pkey) === String(tenantPkey) ||
      String(row.shortuid) === String(tenantPkey) ||
      String(row.id) === String(tenantPkey)
  )
  if (!t) return [String(tenantPkey)]
  return [t.pkey, t.shortuid, t.id].filter((v) => v != null && String(v).trim() !== '').map(String)
}

function ruleLabel(rule) {
  const name = rule?.cname != null && String(rule.cname).trim() !== '' ? String(rule.cname).trim() : ''
  return name || String(rule?.pkey ?? '')
}

function selectedKeys(mapRef) {
  return Object.entries(mapRef.value)
    .filter(([, v]) => v === 'YES')
    .map(([k]) => k)
}

async function fetchTenants() {
  try {
    tenants.value = await loadTenantOptions()
  } catch {
    tenants.value = []
  }
}

async function loadRulesForTenant(preserveSelection = true) {
  rulesLoading.value = true
  try {
    const res = await getApiClient().get('cosrules')
    const all = normalizeList(res, 'cosrules') || normalizeList(res)
    const aliases = new Set(tenantAliases(editCluster.value))
    const filtered = all.filter((r) => aliases.has(String(r.cluster ?? '')))
    availableRules.value = filtered
    const openSet = preserveSelection
      ? new Set(selectedKeys(openRules))
      : new Set((profile.value?.open_rules || []).map(String))
    const closedSet = preserveSelection
      ? new Set(selectedKeys(closedRules))
      : new Set((profile.value?.closed_rules || []).map(String))
    const openMap = {}
    const closedMap = {}
    for (const r of filtered) {
      const key = String(r.pkey ?? '')
      if (!key) continue
      openMap[key] = openSet.has(key) ? 'YES' : 'NO'
      closedMap[key] = closedSet.has(key) ? 'YES' : 'NO'
    }
    openRules.value = openMap
    closedRules.value = closedMap
  } catch {
    availableRules.value = []
  } finally {
    rulesLoading.value = false
  }
}

async function fetchProfile() {
  if (!shortuid.value) return
  beginHydrate()
  loading.value = true
  error.value = ''
  try {
    profile.value = await getApiClient().get(`cosprofiles/${encodeURIComponent(shortuid.value)}`)
    const p = profile.value
    const clusterRaw = p?.cluster ?? 'default'
    editCluster.value = tenantShortuidToPkey.value[clusterRaw] ?? clusterRaw
    editActive.value = p?.active === 'NO' ? 'NO' : 'YES'
    editCname.value = p?.cname ?? ''
    editDescription.value = p?.description ?? ''
    editIsDefault.value = p?.is_default === 'YES' ? 'YES' : 'NO'
    await loadRulesForTenant(false)
  } catch (err) {
    error.value = firstErrorMessage(err, 'Failed to load CoS profile')
    profile.value = null
  } finally {
    loading.value = false
    await markClean()
  }
}

onMounted(async () => {
  await ensureFetched()
  await fetchTenants()
  await fetchProfile()
})
watch(shortuid, fetchProfile)

function goBack() {
  router.push({ name: 'cosprofiles' })
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
  if (!editCname.value || !String(editCname.value).trim()) {
    saveError.value = 'Name is required'
    return
  }
  saving.value = true
  try {
    const body = {
      active: editActive.value,
      cluster: editCluster.value.trim(),
      cname: editCname.value.trim(),
      description: editDescription.value.trim() || null,
      open_rules: selectedKeys(openRules),
      closed_rules: selectedKeys(closedRules)
    }
    await getApiClient().put(`cosprofiles/${encodeURIComponent(shortuid.value)}`, body)
    await fetchProfile()
    toast.show(`CoS profile ${profile.value?.cname || ''} saved`)
    refreshCommitStatusUi()
  } catch (err) {
    saveError.value = firstErrorMessage(err, 'Failed to update CoS profile')
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
    await getApiClient().delete(`cosprofiles/${encodeURIComponent(shortuid.value)}`)
    toast.show('CoS profile deleted')
    refreshCommitStatusUi()
    router.push({ name: 'cosprofiles' })
  } catch (err) {
    deleteError.value = firstErrorMessage(err, 'Failed to delete CoS profile')
  } finally {
    deleting.value = false
    confirmDeleteOpen.value = false
  }
}

const displayName = computed(
  () => profile.value?.cname || profile.value?.pkey || profile.value?.shortuid || ''
)

const panelTitleTenantSuffix = computed(() => {
  const t = String(editCluster.value ?? '').trim()
  return t ? ` (${t})` : ''
})
</script>

<template>
  <div class="detail-view" @keydown="onKeydown" @input="markDirty" @change="markDirty">
    <PanelBackLink :to="{ name: 'cosprofiles' }" label="CoS profiles">
      <div class="detail-panel-head detail-panel-head--compact">
        <div class="detail-title-status-row">
          <h1 class="detail-panel-title">
            Edit profile {{ displayName }}{{ panelTitleTenantSuffix }}
          </h1>
          <DetailActiveStatusBar
            v-if="profile"
            v-model="editActive"
            toggle-id="edit-cosprofile-active"
          />
        </div>
      </div>
    </PanelBackLink>

    <p v-if="loading" class="loading">Loading…</p>
    <p v-else-if="error" class="error">{{ error }}</p>
    <template v-else-if="profile">
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

          <h2 class="detail-heading">Identity</h2>
          <div class="form-fields">
            <FormReadonly
              v-if="profile.shortuid"
              id="edit-identity-shortuid"
              label="UID"
              :value="profile.shortuid"
              class="readonly-identity"
            />
            <FormField id="edit-cname" v-model="editCname" label="Name" type="text" :required="true" />
            <FormSelect
              id="edit-cluster"
              v-model="editCluster"
              label="Tenant"
              :options="tenantOptionsForSelect"
              :required="true"
            />
            <FormField
              id="edit-description"
              v-model="editDescription"
              label="Description"
              multiline
              :rows="2"
            />
            <FormReadonly
              v-if="editIsDefault === 'YES'"
              id="edit-is-default"
              label="Default profile"
              value="Yes — fixed. Edit Standard / After-hours lists below to change default dial policy. New extensions get this profile."
            />
            <p v-else class="hint">
              Not the tenant Default. Default policy is edited on the profile marked Default in the
              list (not by switching the flag here).
            </p>
          </div>

          <h2 class="detail-heading">Standard (business hours)</h2>
          <p class="hint">
            Deny rules when the site is open. Rules with Tenant-wide ON still apply to every
            profile.
          </p>
          <p v-if="rulesLoading" class="muted">Loading rules…</p>
          <p v-else-if="availableRules.length === 0" class="muted">No CoS rules for this tenant.</p>
          <div v-else class="form-fields rule-list">
            <FormToggle
              v-for="rule in availableRules"
              :id="`edit-open-${rule.pkey}`"
              :key="`open-${rule.pkey}`"
              v-model="openRules[rule.pkey]"
              :label="ruleLabel(rule)"
              :hint="rule.description || ''"
              yes-value="YES"
              no-value="NO"
              hide-help
            />
          </div>

          <h2 class="detail-heading">After-hours</h2>
          <p class="hint">Stricter outbound when the site is closed (STATE CLOSED).</p>
          <div v-if="!rulesLoading && availableRules.length" class="form-fields rule-list">
            <FormToggle
              v-for="rule in availableRules"
              :id="`edit-closed-${rule.pkey}`"
              :key="`closed-${rule.pkey}`"
              v-model="closedRules[rule.pkey]"
              :label="ruleLabel(rule)"
              :hint="rule.description || ''"
              yes-value="YES"
              no-value="NO"
              hide-help
            />
          </div>
        </form>
      </div>
    </template>

    <DeleteConfirmModal
      :show="confirmDeleteOpen"
      title="Delete CoS profile?"
      :loading="deleting"
      @confirm="confirmAndDelete"
      @cancel="cancelConfirmDelete"
    >
      <template #body>
        <p>
          Profile <strong>{{ displayName }}</strong> will be permanently deleted. Reassign phones
          first if any still use it. The default profile cannot be deleted until another is marked
          default.
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
  margin-top: 0.5rem;
}
.error {
  color: #dc2626;
}
.hint,
.muted {
  margin: 0 0 0.5rem;
  font-size: 0.875rem;
  color: #64748b;
}
.detail-heading {
  font-size: 1rem;
  font-weight: 600;
  color: #334155;
  margin: 0.75rem 0 0.25rem 0;
}
.form-fields {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin-top: 0.25rem;
}
.readonly-identity :deep(.form-field-label),
.readonly-identity :deep(.form-readonly) {
  color: #94a3b8;
}
.edit-form {
  margin-bottom: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.edit-actions {
  display: flex;
  flex-wrap: wrap;
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
.edit-actions button.action-delete {
  color: #fff;
  background: #dc2626;
  border: none;
}
</style>
