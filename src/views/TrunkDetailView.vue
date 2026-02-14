<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useToastStore } from '@/stores/toast'
import { normalizeList } from '@/utils/listResponse'
import { firstErrorMessage } from '@/utils/formErrors'
import FormField from '@/components/forms/FormField.vue'
import FormSelect from '@/components/forms/FormSelect.vue'
import FormSegmentedPill from '@/components/forms/FormSegmentedPill.vue'
import FormToggle from '@/components/forms/FormToggle.vue'
import FormReadonly from '@/components/forms/FormReadonly.vue'
import DeleteConfirmModal from '@/components/DeleteConfirmModal.vue'

const route = useRoute()
const router = useRouter()
const toast = useToastStore()
const trunk = ref(null)
const tenants = ref([])
const loading = ref(true)
const error = ref('')
const editDescription = ref('')
const editActive = ref('YES')
const editCluster = ref('default')
const editHost = ref('')
const editUsername = ref('')
const editPeername = ref('')
const editTrunkname = ref('')
const editPassword = ref('')
const editMoh = ref('OFF')
const editCallprogress = ref('OFF')
const editSwoclip = ref('YES')
const editAlertinfo = ref('')
const editCallerid = ref('')
const editInprefix = ref('')
const editMatch = ref('')
const editRegister = ref('')
const editTag = ref('')
const devicerecOptions = ['None', 'OTR', 'OTRR', 'Inbound', 'Outbound', 'Both']

function normalizeDevicerec(s) {
  if (s == null || s === '') return 'None'
  const v = String(s).trim()
  return devicerecOptions.includes(v) ? v : 'None'
}

const editDevicerec = ref('None')
const editDisa = ref('')
const editDisapass = ref('')
const editTransform = ref('')
const saveError = ref('')
const saving = ref(false)
const deleteError = ref('')
const deleting = ref(false)
const confirmDeleteOpen = ref(false)

const shortuid = computed(() => route.params.shortuid)

/** Map cluster id, shortuid, or pkey → tenant pkey for display (always show pkey, not shortuid). */
const clusterToTenantPkey = computed(() => {
  const map = new Map()
  for (const t of tenants.value) {
    if (t.id != null) map.set(String(t.id), t.pkey ?? t.id)
    if (t.shortuid != null) map.set(String(t.shortuid), t.pkey ?? t.shortuid)
    if (t.pkey != null) map.set(String(t.pkey), t.pkey)
  }
  return map
})

function tenantPkeyDisplay(clusterValue) {
  if (clusterValue == null || clusterValue === '') return '—'
  const s = String(clusterValue)
  return clusterToTenantPkey.value.get(s) ?? trunk.value?.tenant_pkey ?? s
}

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

async function fetchTrunk() {
  if (!shortuid.value) return
  loading.value = true
  error.value = ''
  try {
    trunk.value = await getApiClient().get(`trunks/${encodeURIComponent(shortuid.value)}`)
    editDescription.value = trunk.value?.description ?? ''
    editActive.value = trunk.value?.active ?? 'YES'
    const tenantPkey = trunk.value?.tenant_pkey ?? tenantPkeyDisplay(trunk.value?.cluster)
    editCluster.value = tenantPkey ?? 'default'
    editHost.value = trunk.value?.host ?? ''
    editUsername.value = trunk.value?.username ?? ''
    editPeername.value = trunk.value?.peername ?? ''
    editTrunkname.value = trunk.value?.trunkname ?? ''
    editPassword.value = '' // never re-fill password
    editMoh.value = trunk.value?.moh ?? 'OFF'
    editCallprogress.value = trunk.value?.callprogress ?? 'OFF'
    editSwoclip.value = trunk.value?.swoclip ?? 'YES'
    editAlertinfo.value = trunk.value?.alertinfo ?? ''
    editCallerid.value = trunk.value?.callerid ?? ''
    editInprefix.value = trunk.value?.inprefix ?? ''
    editMatch.value = trunk.value?.match ?? ''
    editRegister.value = trunk.value?.register ?? ''
    editTag.value = trunk.value?.tag ?? ''
    editDevicerec.value = normalizeDevicerec(trunk.value?.devicerec)
    editDisa.value = trunk.value?.disa ?? ''
    editDisapass.value = trunk.value?.disapass ?? ''
    editTransform.value = trunk.value?.transform ?? ''
  } catch (err) {
    error.value = firstErrorMessage(err, 'Failed to load trunk')
    trunk.value = null
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchTenants().then(() => fetchTrunk())
})
watch(shortuid, fetchTrunk)

function goBack() {
  router.push({ name: 'trunks' })
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
      description: editDescription.value.trim() || undefined,
      active: editActive.value,
      cluster: editCluster.value.trim(),
      host: editHost.value.trim(),
      username: editUsername.value.trim() || undefined,
      peername: editPeername.value.trim() || undefined,
      trunkname: editTrunkname.value.trim() || undefined,
      moh: editMoh.value,
      callprogress: editCallprogress.value,
      swoclip: editSwoclip.value,
      alertinfo: editAlertinfo.value.trim() || undefined,
      callerid: editCallerid.value.trim() || undefined,
      inprefix: editInprefix.value.trim() || undefined,
      match: editMatch.value.trim() || undefined,
      register: editRegister.value.trim() || undefined,
      tag: editTag.value.trim() || undefined,
      devicerec: editDevicerec.value || 'None',
      disa: editDisa.value.trim() || undefined,
      disapass: editDisapass.value.trim() || undefined,
      transform: editTransform.value.trim() || undefined
    }
    if (editPassword.value.trim()) body.password = editPassword.value.trim()
    await getApiClient().put(`trunks/${encodeURIComponent(shortuid.value)}`, body)
    await fetchTrunk()
    toast.show(`Trunk saved`)
  } catch (err) {
    saveError.value = firstErrorMessage(err, 'Failed to update trunk')
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
    await getApiClient().delete(`trunks/${encodeURIComponent(shortuid.value)}`)
    toast.show(`Trunk deleted`)
    router.push({ name: 'trunks' })
  } catch (err) {
    deleteError.value = firstErrorMessage(err, 'Failed to delete trunk')
  } finally {
    deleting.value = false
    confirmDeleteOpen.value = false
  }
}

</script>

<template>
  <div class="detail-view" @keydown="onKeydown">
    <h1>Edit Trunk {{ trunk?.pkey ?? '…' }}</h1>

    <p v-if="loading" class="loading">Loading…</p>
    <p v-else-if="error" class="error">{{ error }}</p>
    <template v-else-if="trunk">
      <div class="detail-content">
        <p v-if="deleteError" class="error">{{ deleteError }}</p>

        <form class="edit-form" @submit="saveEdit">
          <p v-if="saveError" id="trunk-edit-error" class="error" role="alert">{{ saveError }}</p>

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
            <FormReadonly id="edit-identity-pkey" label="Name" :value="trunk.pkey ?? '—'" class="readonly-identity" />
            <FormReadonly id="edit-identity-shortuid" label="Local UID" :value="trunk.shortuid ?? '—'" class="readonly-identity" />
            <FormReadonly id="edit-identity-id" label="KSUID" :value="trunk.id ?? '—'" class="readonly-identity" />
            <FormReadonly id="edit-identity-transport" label="Transport" :value="trunk.transport ?? 'udp'" class="readonly-identity" />
            <FormField
              id="edit-description"
              v-model="editDescription"
              label="Description (optional)"
              type="text"
            />
          </div>

          <h2 class="detail-heading">Settings</h2>
          <div class="form-fields">
            <FormSelect
              id="edit-cluster"
              v-model="editCluster"
              label="Tenant"
              :options="tenantOptionsForSelect"
              :required="true"
            />
            <FormToggle
              id="edit-active"
              v-model="editActive"
              label="Active?"
              yes-value="YES"
              no-value="NO"
            />
            <FormField
              id="edit-host"
              v-model="editHost"
              label="Host"
              type="text"
              :required="true"
              placeholder="e.g. sip.example.com or IP"
            />
            <FormField id="edit-username" v-model="editUsername" label="Username" type="text" autocomplete="off" />
            <FormField id="edit-peername" v-model="editPeername" label="Peername" type="text" autocomplete="off" />
            <FormField id="edit-trunkname" v-model="editTrunkname" label="Trunkname" type="text" autocomplete="off" />
            <FormField
              id="edit-password"
              v-model="editPassword"
              label="Password"
              type="password"
              placeholder="Leave blank to keep current"
              autocomplete="new-password"
            />
            <FormToggle id="edit-moh" v-model="editMoh" label="MOH" yes-value="ON" no-value="OFF" />
            <FormToggle id="edit-callprogress" v-model="editCallprogress" label="Call progress" yes-value="ON" no-value="OFF" />
            <FormToggle id="edit-swoclip" v-model="editSwoclip" label="SWOCLIP" yes-value="YES" no-value="NO" />
          </div>

          <h2 class="detail-heading">Advanced</h2>
          <div class="form-fields">
            <FormField id="edit-alertinfo" v-model="editAlertinfo" label="Alert info" type="text" />
            <FormField id="edit-callerid" v-model="editCallerid" label="Caller ID" type="text" />
            <FormField id="edit-inprefix" v-model="editInprefix" label="In prefix" type="text" />
            <FormField id="edit-match" v-model="editMatch" label="Match" type="text" />
            <FormField id="edit-register" v-model="editRegister" label="Register" type="text" />
            <FormField id="edit-tag" v-model="editTag" label="Tag" type="text" />
            <FormSelect
              id="edit-devicerec"
              v-model="editDevicerec"
              label="Device recording"
              :options="devicerecOptions"
            />
            <FormSegmentedPill
              id="edit-disa"
              v-model="editDisa"
              label="DISA"
              :options="['', 'DISA', 'CALLBACK']"
              empty-display="—"
            />
            <FormField id="edit-disapass" v-model="editDisapass" label="DISA pass" type="text" autocomplete="off" />
            <FormField id="edit-transform" v-model="editTransform" label="Transform" type="text" />
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
      title="Delete trunk?"
      :loading="deleting"
      @confirm="confirmAndDelete"
      @cancel="cancelConfirmDelete"
    >
      <template #body>
        <p>Trunk <strong>{{ trunk?.pkey ?? '—' }}</strong> will be permanently deleted. This cannot be undone.</p>
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
/* Non-updateable identity fields (Name, Local UID, KSUID, Transport) – low-light */
.readonly-identity :deep(.form-field-label),
.readonly-identity :deep(.form-readonly) {
  color: #94a3b8;
}
.readonly-identity :deep(.form-readonly) {
  background-color: #f1f5f9;
  border-color: #e2e8f0;
}
.edit-form {
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
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
