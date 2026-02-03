<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useToastStore } from '@/stores/toast'
import FormField from '@/components/forms/FormField.vue'
import FormSelect from '@/components/forms/FormSelect.vue'
import FormToggle from '@/components/forms/FormToggle.vue'
import FormReadonly from '@/components/forms/FormReadonly.vue'
import DeleteConfirmModal from '@/components/DeleteConfirmModal.vue'

const route = useRoute()
const router = useRouter()
const toast = useToastStore()
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

// Advanced fields: same config as TenantCreateView (editable on Edit)
const ADVANCED_KEYS = [
  'allow_hash_xfer', 'callrecord1', 'cfwdextern_rule', 'cfwd_progress', 'cfwd_answer',
  'countrycode', 'dynamicfeatures', 'emergency', 'int_ring_delay', 'ivr_key_wait', 'ivr_digit_wait',
  'language', 'ldapbase', 'ldaphost', 'ldapou', 'ldapuser', 'ldappass', 'ldaptls',
  'localarea', 'localdplan', 'lterm', 'leasedhdtime', 'max_in', 'monitor_out', 'operator',
  'pickupgroup', 'play_beep', 'play_busy', 'play_congested', 'play_transfer',
  'rec_age', 'rec_final_dest', 'rec_file_dlim', 'rec_grace', 'rec_limit', 'rec_mount',
  'recmaxage', 'recmaxsize', 'recused', 'ringdelay', 'routeoverride', 'spy_pass', 'sysop', 'syspass',
  'usemohcustom', 'vmail_age', 'voice_instr', 'voip_max'
]
const ADVANCED_FIELDS = [
  { key: 'allow_hash_xfer', label: 'Allow hash xfer', type: 'pill', options: ['enabled', 'disabled'] },
  { key: 'callrecord1', label: 'Call record 1', type: 'pill', options: ['None', 'In', 'Out', 'Both'] },
  { key: 'cfwdextern_rule', label: 'CFWD extern rule', type: 'pill', options: ['YES', 'NO'] },
  { key: 'cfwd_progress', label: 'CFWD progress', type: 'pill', options: ['enabled', 'disabled'] },
  { key: 'cfwd_answer', label: 'CFWD answer', type: 'pill', options: ['enabled', 'disabled'] },
  { key: 'countrycode', label: 'Country code', type: 'number' },
  { key: 'dynamicfeatures', label: 'Dynamic features', type: 'text' },
  { key: 'emergency', label: 'Emergency', type: 'number' },
  { key: 'int_ring_delay', label: 'Int ring delay', type: 'number' },
  { key: 'ivr_key_wait', label: 'IVR key wait', type: 'number' },
  { key: 'ivr_digit_wait', label: 'IVR digit wait', type: 'number' },
  { key: 'language', label: 'Language', type: 'text' },
  { key: 'ldapbase', label: 'LDAP base', type: 'text' },
  { key: 'ldaphost', label: 'LDAP host', type: 'text' },
  { key: 'ldapou', label: 'LDAP OU', type: 'text' },
  { key: 'ldapuser', label: 'LDAP user', type: 'text' },
  { key: 'ldappass', label: 'LDAP pass', type: 'text' },
  { key: 'ldaptls', label: 'LDAP TLS', type: 'pill', options: ['on', 'off'] },
  { key: 'localarea', label: 'Local area', type: 'number' },
  { key: 'localdplan', label: 'Local dplan', type: 'text', placeholder: 'e.g. _X.' },
  { key: 'lterm', label: 'Lterm', type: 'boolean' },
  { key: 'leasedhdtime', label: 'Leased HD time', type: 'number' },
  { key: 'max_in', label: 'Max in', type: 'number' },
  { key: 'monitor_out', label: 'Monitor out', type: 'text' },
  { key: 'operator', label: 'Operator', type: 'number' },
  { key: 'pickupgroup', label: 'Pickup group', type: 'text' },
  { key: 'play_beep', label: 'Play beep', type: 'boolean' },
  { key: 'play_busy', label: 'Play busy', type: 'boolean' },
  { key: 'play_congested', label: 'Play congested', type: 'boolean' },
  { key: 'play_transfer', label: 'Play transfer', type: 'boolean' },
  { key: 'rec_age', label: 'Rec age', type: 'number' },
  { key: 'rec_final_dest', label: 'Rec final dest', type: 'text' },
  { key: 'rec_file_dlim', label: 'Rec file dlim', type: 'text' },
  { key: 'rec_grace', label: 'Rec grace', type: 'number' },
  { key: 'rec_limit', label: 'Rec limit', type: 'number' },
  { key: 'rec_mount', label: 'Rec mount', type: 'number' },
  { key: 'recmaxage', label: 'Rec max age', type: 'number' },
  { key: 'recmaxsize', label: 'Rec max size', type: 'number' },
  { key: 'recused', label: 'Rec used', type: 'number' },
  { key: 'ringdelay', label: 'Ring delay', type: 'number' },
  { key: 'routeoverride', label: 'Route override', type: 'number' },
  { key: 'spy_pass', label: 'Spy pass', type: 'number' },
  { key: 'sysop', label: 'Sysop', type: 'number' },
  { key: 'syspass', label: 'Sys pass', type: 'number' },
  { key: 'usemohcustom', label: 'Use MOH custom', type: 'number' },
  { key: 'vmail_age', label: 'Vmail age', type: 'number' },
  { key: 'voice_instr', label: 'Voice instr', type: 'boolean' },
  { key: 'voip_max', label: 'VoIP max', type: 'number' }
]
const formAdvanced = reactive(
  Object.fromEntries(ADVANCED_KEYS.map((k) => [k, '']))
)

function parseNum(v) {
  if (v === '' || v == null) return undefined
  const n = Number(v)
  return isNaN(n) ? undefined : n
}

function buildAdvancedPayload() {
  const out = {}
  for (const f of ADVANCED_FIELDS) {
    const v = formAdvanced[f.key]
    if (f.type === 'boolean') {
      if (v === 'YES') out[f.key] = true
      if (v === 'NO') out[f.key] = false
    } else if (f.type === 'number') {
      const n = parseNum(v)
      if (n !== undefined) out[f.key] = n
    } else {
      const s = typeof v === 'string' ? v.trim() : ''
      if (s !== '') out[f.key] = s
    }
  }
  return out
}

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

onMounted(fetchTenant)
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
      clusterclid: editClusterclid.value.trim() ? editClusterclid.value.trim() : undefined,
      abstimeout: editAbstimeout.value.trim() ? editAbstimeout.value.trim() : undefined,
      chanmax: editChanmax.value.trim() ? editChanmax.value.trim() : undefined,
      masteroclo: editMasteroclo.value.trim() || undefined,
      ...buildAdvancedPayload()
    })
    await fetchTenant()
    toast.show(`Tenant ${pkey.value} saved`)
  } catch (err) {
    const msg =
      err.data?.description?.[0] ??
      err.data?.clusterclid?.[0] ??
      err.data?.abstimeout?.[0] ??
      err.data?.chanmax?.[0] ??
      err.data?.masteroclo?.[0] ??
      err.data?.message ??
      err.data?.Error ??
      err.message
    saveError.value = msg || 'Failed to update tenant'
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

          <h2 class="detail-heading">Identity</h2>
          <div class="form-fields">
            <FormReadonly
              id="edit-identity-pkey"
              label="Name"
              :value="tenant.pkey ?? '—'"
            />
            <FormReadonly
              id="edit-identity-shortuid"
              label="Local UID"
              :value="tenant.shortuid ?? '—'"
            />
            <FormReadonly
              id="edit-identity-id"
              label="KSUID"
              :value="tenant.id ?? '—'"
            />
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
            <FormSelect
              id="edit-masteroclo"
              v-model="editMasteroclo"
              label="Timer status"
              :options="['AUTO', 'CLOSED']"
              empty-text=""
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
                <FormSelect
                  v-else-if="f.type === 'pill'"
                  :id="`edit-adv-${f.key}`"
                  v-model="formAdvanced[f.key]"
                  :label="f.label"
                  :options="f.options"
                  :required="false"
                  empty-text=""
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
