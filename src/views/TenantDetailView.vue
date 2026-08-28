<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
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
import PanelBackLink from '@/components/PanelBackLink.vue'
import FieldHelpIcon from '@/components/FieldHelpIcon.vue'
import {
  ADVANCED_KEYS,
  ADVANCED_FIELDS,
  CALL_CONTROL_KEYS,
  CALL_CONTROL_FIELDS,
  CALL_RECORDING_KEYS,
  CALL_RECORDING_FIELDS,
  TIMERS_KEYS,
  TIMERS_FIELDS,
  buildAdvancedPayload,
  buildCallControlPayload,
  buildCallRecordingPayload,
  buildTimersPayload,
  parseNum,
  apiIntegerToYesNo,
  API_INTEGER_FLAG_KEYS
} from '@/constants/tenantAdvanced'
import { firstErrorMessage } from '@/utils/formErrors'
import { useSessionContext } from '@/composables/useSessionContext'
import { useAuthStore } from '@/stores/auth'
import { useFleetPosture } from '@/composables/useFleetPosture'

const route = useRoute()
const router = useRouter()
const toast = useToastStore()
const auth = useAuthStore()
const { clearTenantContext } = useSessionContext()
const { loadFleetPosture, isFleetNode } = useFleetPosture()
const { getSchema, ensureFetched } = useSchema()
function isReadOnly(field) {
  return getSchema('tenants')?.read_only?.includes(field) ?? false
}
const tenant = ref(null)
const loading = ref(true)
const error = ref('')
const editDescription = ref('')
const editClusterclid = ref('')
const editLocalarea = ref('')
const editLocaldplan = ref('')
const editExtLen = ref('3')
const editParkOverlay = ref('')
const editChanmax = ref('')
const editMaxin = ref('')
const editVoipMax = ref('')
const saveError = ref('')
const saving = ref(false)
const deleteError = ref('')
const deleting = ref(false)
const confirmDeleteOpen = ref(false)
const fleetLocked = ref(false)

/** Custom MOH files under /usr/share/asterisk/moh-{shortuid}/ */
const mohFiles = ref([])
const mohLoading = ref(false)
const mohError = ref('')
const mohUploading = ref(false)
const mohFileInput = ref(null)
const mohDeleting = ref(null)
const mohPlaybackName = ref(null)
const mohPlaybackUrl = ref(null)
const mohAudioEl = ref(null)

const pkey = computed(() => route.params.pkey)
const isDefault = computed(() => tenant.value?.pkey === 'default')

const tenantHeading = computed(() => {
  const pk = pkey.value ?? ''
  const base = `Edit Tenant ${pk}`
  const f = (tenant.value?.fqdn && String(tenant.value.fqdn).trim()) || ''
  return f ? `${base} (${f})` : base
})

const formAdvanced = reactive(Object.fromEntries(ADVANCED_KEYS.map((k) => [k, ''])))
const formCallControl = reactive(Object.fromEntries(CALL_CONTROL_KEYS.map((k) => [k, ''])))
const formCallRecording = reactive(Object.fromEntries(CALL_RECORDING_KEYS.map((k) => [k, ''])))
const formTimers = reactive(Object.fromEntries(TIMERS_KEYS.map((k) => [k, ''])))

async function fetchTenant() {
  if (!pkey.value) return
  clearTenantContext()
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
  editParkOverlay.value = t.park_overlay ?? ''
  editClusterclid.value = t.clusterclid != null && t.clusterclid !== '' ? String(t.clusterclid) : ''
  editLocalarea.value = t.localarea != null && t.localarea !== '' ? String(t.localarea) : ''
  editLocaldplan.value = t.localdplan != null && t.localdplan !== '' ? String(t.localdplan) : ''
  editExtLen.value = t.ext_len != null && t.ext_len !== '' ? String(t.ext_len) : '3'
  editChanmax.value = t.chanmax != null && t.chanmax !== '' ? String(t.chanmax) : ''
  editMaxin.value = t.maxin != null && t.maxin !== '' ? String(t.maxin) : ''
  editVoipMax.value = t.voip_max != null && t.voip_max !== '' ? String(t.voip_max) : ''
  function syncKeysToForm(keys, form) {
    for (const k of keys) {
      const v = t[k]
      if (API_INTEGER_FLAG_KEYS.has(k)) {
        form[k] = apiIntegerToYesNo(v) || 'NO'
        continue
      }
      if (v === true || v === false) {
        form[k] = v ? 'YES' : 'NO'
      } else if (v != null && v !== '') {
        form[k] = String(v)
      } else {
        form[k] = ''
      }
    }
  }
  syncKeysToForm(TIMERS_KEYS, formTimers)
  if (!formTimers.masteroclo) formTimers.masteroclo = 'AUTO'
  syncKeysToForm(ADVANCED_KEYS, formAdvanced)
  if (formAdvanced.usemohcustom !== 'YES' && formAdvanced.usemohcustom !== 'NO') {
    formAdvanced.usemohcustom = 'NO'
  }
  syncKeysToForm(CALL_RECORDING_KEYS, formCallRecording)
  syncKeysToForm(CALL_CONTROL_KEYS, formCallControl)
  fetchMoh()
}

async function fetchMoh() {
  if (!pkey.value) return
  mohLoading.value = true
  mohError.value = ''
  try {
    const data = await getApiClient().get(`tenants/${encodeURIComponent(pkey.value)}/moh`)
    mohFiles.value = Array.isArray(data?.files) ? data.files : []
    if (data?.usemohcustom === 'YES' || data?.usemohcustom === 'NO') {
      formAdvanced.usemohcustom = data.usemohcustom
    }
  } catch (err) {
    mohError.value = firstErrorMessage(err, 'Failed to load Music-on-Hold files')
    mohFiles.value = []
  } finally {
    mohLoading.value = false
  }
}

function pickMohFile() {
  mohFileInput.value?.click()
}

async function onMohFileSelected(e) {
  const file = e.target?.files?.[0]
  e.target.value = ''
  if (!file || !pkey.value) return
  mohUploading.value = true
  mohError.value = ''
  try {
    const fd = new FormData()
    fd.append('file', file)
    await getApiClient().postFile(`tenants/${encodeURIComponent(pkey.value)}/moh`, fd)
    toast.show(`MOH file ${file.name} uploaded`)
    await fetchMoh()
  } catch (err) {
    mohError.value = firstErrorMessage(err, 'Failed to upload MOH file')
  } finally {
    mohUploading.value = false
  }
}

function stopMohPlayback() {
  const a = mohAudioEl.value
  if (a) {
    a.pause()
    a.removeAttribute('src')
    a.load()
  }
  if (mohPlaybackUrl.value) {
    URL.revokeObjectURL(mohPlaybackUrl.value)
    mohPlaybackUrl.value = null
  }
  mohPlaybackName.value = null
}

async function playMoh(name) {
  if (!pkey.value || !name) return
  if (mohPlaybackName.value === name) {
    const a = mohAudioEl.value
    if (a && !a.paused) {
      a.pause()
      return
    }
    if (a) {
      a.play().catch(() => {})
      return
    }
  }
  stopMohPlayback()
  try {
    const blob = await getApiClient().getBlob(
      `tenants/${encodeURIComponent(pkey.value)}/moh/${encodeURIComponent(name)}`
    )
    const url = URL.createObjectURL(blob)
    mohPlaybackUrl.value = url
    mohPlaybackName.value = name
    await nextTick()
    const a = mohAudioEl.value
    if (a) {
      a.src = url
      await a.play()
    }
  } catch (err) {
    toast.show(firstErrorMessage(err, 'Failed to play MOH file'), 'error')
    stopMohPlayback()
  }
}

async function deleteMoh(name) {
  if (!pkey.value || !name) return
  if (!window.confirm(`Delete MOH file ${name}?`)) return
  mohDeleting.value = name
  mohError.value = ''
  try {
    if (mohPlaybackName.value === name) stopMohPlayback()
    await getApiClient().delete(
      `tenants/${encodeURIComponent(pkey.value)}/moh/${encodeURIComponent(name)}`
    )
    toast.show(`Deleted ${name}`)
    await fetchMoh()
  } catch (err) {
    mohError.value = firstErrorMessage(err, 'Failed to delete MOH file')
  } finally {
    mohDeleting.value = null
  }
}

onMounted(async () => {
  await loadFleetPosture()
  fleetLocked.value = isFleetNode()
  await ensureFetched()
  await fetchTenant()
})
onUnmounted(() => {
  stopMohPlayback()
  clearTenantContext()
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
      ...(auth.isAdmin
        ? { park_overlay: editParkOverlay.value.trim() || null }
        : {}),
      ...(editLocalarea.value.trim() !== ''
        ? { localarea: editLocalarea.value.trim() }
        : { localarea: null }),
      ...(editLocaldplan.value.trim() !== '' && { localdplan: editLocaldplan.value.trim() }),
      ...(parseNum(editExtLen.value) !== undefined && { ext_len: parseNum(editExtLen.value) }),
      chanmax: editChanmax.value.trim() ? editChanmax.value.trim() : undefined,
      ...(parseNum(editMaxin.value) !== undefined && { maxin: parseNum(editMaxin.value) }),
      ...(parseNum(editVoipMax.value) !== undefined && { voip_max: parseNum(editVoipMax.value) }),
      ...buildTimersPayload(formTimers),
      ...buildAdvancedPayload(formAdvanced),
      ...buildCallRecordingPayload(formCallRecording),
      ...buildCallControlPayload(formCallControl)
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
    deleteError.value =
      err.data?.message ?? err.data?.Error ?? err.message ?? 'Failed to delete tenant'
  } finally {
    deleting.value = false
    confirmDeleteOpen.value = false
  }
}
</script>

<template>
  <div class="detail-view">
    <PanelBackLink :to="{ name: 'tenants' }" label="Tenants">
      <h1>{{ tenantHeading }}</h1>
    </PanelBackLink>

    <p v-if="loading" class="loading">Loading…</p>
    <p v-else-if="error" class="error">{{ error }}</p>
    <template v-else-if="tenant">
      <div class="detail-content">
        <p v-if="deleteError" class="error">{{ deleteError }}</p>

        <form class="edit-form" autocomplete="off" @submit="saveEdit">
          <p v-if="saveError" id="tenant-edit-error" class="error" role="alert">{{ saveError }}</p>

          <div class="edit-actions edit-actions-top">
            <button type="submit" :disabled="saving">{{ saving ? 'Saving…' : 'Save' }}</button>
            <button type="button" class="secondary" @click="cancelEdit">Cancel</button>
            <button
              v-if="!isDefault && !fleetLocked"
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
              v-if="isReadOnly('shortuid')"
              id="edit-identity-shortuid"
              label="UID"
              :value="tenant.shortuid ?? '—'"
              class="readonly-identity"
            />
            <FormField
              v-else
              id="edit-identity-shortuid"
              :model-value="tenant.shortuid ?? '—'"
              label="UID"
              disabled
              class="readonly-identity"
            />
            <FormReadonly
              v-if="isReadOnly('id')"
              id="edit-identity-id"
              label="KSUID"
              :value="tenant.id ?? '—'"
              class="readonly-identity"
            />
            <FormField
              v-else
              id="edit-identity-id"
              :model-value="tenant.id ?? '—'"
              label="KSUID"
              disabled
              class="readonly-identity"
            />
            <FormReadonly
              id="edit-identity-fqdn"
              label="FQDN"
              :value="
                tenant.fqdn != null && String(tenant.fqdn).trim() !== ''
                  ? String(tenant.fqdn).trim()
                  : '—'
              "
              class="readonly-identity"
              hide-help
            />
            <FormReadonly
              v-if="isReadOnly('pkey')"
              id="edit-identity-pkey"
              label="Name"
              help-pkey="tenantname"
              :value="tenant.pkey ?? '—'"
              class="readonly-identity"
            />
            <FormField
              v-else
              id="edit-identity-pkey"
              :model-value="tenant.pkey ?? '—'"
              label="Name"
              help-pkey="tenantname"
              disabled
              class="readonly-identity"
            />
            <FormField
              id="edit-description"
              v-model="editDescription"
              label="Description"
              type="text"
              placeholder="Short description"
            />
            <FormField
              id="edit-identity-clusterclid"
              v-model="editClusterclid"
              label="CLID"
              type="text"
              inputmode="numeric"
              pattern="[0-9]*"
              placeholder="digits (leading zeros OK)"
            />
            <FormField
              id="edit-identity-localarea"
              v-model="editLocalarea"
              label="Local area"
              type="text"
              inputmode="numeric"
              pattern="[0-9]*"
              placeholder="area code (leading zeros OK)"
            />
            <FormField
              id="edit-identity-localdplan"
              v-model="editLocaldplan"
              label="Local dialplan"
              type="text"
              placeholder="e.g. _X."
            />
            <FormField
              id="edit-identity-ext-len"
              v-model="editExtLen"
              label="Extension length"
              type="number"
              min="2"
              max="5"
              help-pkey="ext_len"
              placeholder="3"
              hint="All extension numbers in this tenant must be exactly this many digits (2–5)."
            />
          </div>

          <h2 class="detail-heading">Parking</h2>
          <div class="form-fields">
            <FormField
              v-if="auth.isAdmin"
              id="edit-park-overlay"
              v-model="editParkOverlay"
              label="Parking overlay"
              help-pkey="park_overlay"
              type="text"
              placeholder="Thin overlay fragment ([park-$clstshortuid] + keys)"
              :multiline="true"
              :rows="8"
            />
          </div>

          <h2 class="detail-heading">Settings</h2>
          <div class="form-fields">
            <FormField
              id="edit-chanmax"
              v-model="editChanmax"
              label="ChanMax"
              type="text"
              placeholder="integer"
            />
            <FormField
              id="edit-maxin"
              v-model="editMaxin"
              label="Max in"
              type="number"
              placeholder="integer"
            />
            <FormField
              id="edit-voip-max"
              v-model="editVoipMax"
              label="VoIP max"
              type="number"
              placeholder="integer"
            />
          </div>

          <h2 class="detail-heading">Timers</h2>
          <div class="form-fields timers-fields">
            <template v-for="f in TIMERS_FIELDS" :key="f.key">
              <FormToggle
                v-if="f.type === 'boolean'"
                :id="`edit-timers-${f.key}`"
                v-model="formTimers[f.key]"
                :label="f.label"
                :help-pkey="f.helpPkey ?? f.key"
                yes-value="YES"
                no-value="NO"
              />
              <FormSegmentedPill
                v-else-if="f.type === 'segmented'"
                :id="`edit-timers-${f.key}`"
                v-model="formTimers[f.key]"
                :label="f.label"
                :help-pkey="f.helpPkey ?? f.key"
                :options="f.options"
              />
              <FormToggle
                v-else-if="f.type === 'pill' && f.options && f.options.length === 2"
                :id="`edit-timers-${f.key}`"
                v-model="formTimers[f.key]"
                :label="f.label"
                :help-pkey="f.helpPkey ?? f.key"
                :yes-value="f.options[0]"
                :no-value="f.options[1]"
              />
              <FormSelect
                v-else-if="f.type === 'pill'"
                :id="`edit-timers-${f.key}`"
                v-model="formTimers[f.key]"
                :label="f.label"
                :help-pkey="f.helpPkey ?? f.key"
                :options="f.options"
                :required="false"
              />
              <FormField
                v-else-if="f.type === 'number'"
                :id="`edit-timers-${f.key}`"
                v-model="formTimers[f.key]"
                :label="f.label"
                :help-pkey="f.helpPkey ?? f.key"
                type="number"
                :placeholder="f.placeholder || 'number'"
              />
              <FormField
                v-else
                :id="`edit-timers-${f.key}`"
                v-model="formTimers[f.key]"
                :label="f.label"
                :help-pkey="f.helpPkey ?? f.key"
                type="text"
                :placeholder="f.placeholder || ''"
              />
            </template>
            <FormReadonly
              id="edit-timers-sched-mode"
              label="Schedule mode (timer)"
              help-pkey="sched_mode"
              :value="tenant?.sched_mode || tenant?.oclo || '—'"
            />
          </div>

          <h2 class="detail-heading">
            Music-on-Hold
            <FieldHelpIcon pkey="mohhead" />
          </h2>
          <div class="form-fields moh-fields">
            <p class="moh-hint">
              Custom MOH files for this tenant (8 kHz mono WAV preferred). With no files, Asterisk
              uses the system default. Upload/delete reloads MOH immediately. Enable Custom MOH
              Active and Save so calls use this class (Commit only if the tenant MOH class was
              never generated yet).
            </p>
            <p v-if="mohError" class="error" role="alert">{{ mohError }}</p>
            <div class="moh-toolbar">
              <button
                type="button"
                class="moh-upload-btn"
                :disabled="mohUploading"
                @click="pickMohFile"
              >
                {{ mohUploading ? 'Uploading…' : 'Upload MOH' }}
              </button>
              <input
                ref="mohFileInput"
                type="file"
                class="moh-file-input"
                accept=".wav,.mp3,.gsm,audio/wav,audio/mpeg"
                @change="onMohFileSelected"
              />
            </div>
            <p v-if="mohLoading" class="moh-hint">Loading MOH files…</p>
            <table v-else-if="mohFiles.length" class="moh-table">
              <thead>
                <tr>
                  <th>File</th>
                  <th>Play</th>
                  <th>Delete</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="f in mohFiles" :key="f.name">
                  <td>{{ f.name }}</td>
                  <td>
                    <button type="button" class="secondary moh-row-btn" @click="playMoh(f.name)">
                      {{ mohPlaybackName === f.name ? 'Pause' : 'Play' }}
                    </button>
                  </td>
                  <td>
                    <button
                      type="button"
                      class="action-delete moh-row-btn"
                      :disabled="mohDeleting === f.name"
                      @click="deleteMoh(f.name)"
                    >
                      {{ mohDeleting === f.name ? 'Deleting…' : 'Delete' }}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
            <p v-else class="moh-hint">No sound files loaded for this tenant. Defaults will be used.</p>
            <audio ref="mohAudioEl" class="moh-audio" preload="none" @ended="stopMohPlayback" />
            <FormToggle
              id="edit-usemohcustom"
              v-model="formAdvanced.usemohcustom"
              label="Custom MOH Active"
              help-pkey="usemohcustom"
              yes-value="YES"
              no-value="NO"
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
                :help-pkey="f.helpPkey ?? f.key"
                yes-value="YES"
                no-value="NO"
              />
              <FormToggle
                v-else-if="f.type === 'pill' && f.options && f.options.length === 2"
                :id="`edit-adv-${f.key}`"
                v-model="formAdvanced[f.key]"
                :label="f.label"
                :help-pkey="f.helpPkey ?? f.key"
                :yes-value="f.options[0]"
                :no-value="f.options[1]"
              />
              <FormSelect
                v-else-if="f.type === 'pill'"
                :id="`edit-adv-${f.key}`"
                v-model="formAdvanced[f.key]"
                :label="f.label"
                :help-pkey="f.helpPkey ?? f.key"
                :options="f.options"
                :required="false"
              />
              <FormField
                v-else-if="f.type === 'number'"
                :id="`edit-adv-${f.key}`"
                v-model="formAdvanced[f.key]"
                :label="f.label"
                :help-pkey="f.helpPkey ?? f.key"
                type="number"
                :placeholder="f.placeholder || 'number'"
              />
              <FormField
                v-else
                :id="`edit-adv-${f.key}`"
                v-model="formAdvanced[f.key]"
                :label="f.label"
                :help-pkey="f.helpPkey ?? f.key"
                type="text"
                :obscure="f.type === 'password'"
                autocomplete="off"
                :placeholder="f.placeholder || ''"
              />
            </template>
          </div>

          <h2 class="detail-heading">Call recording</h2>
          <div class="form-fields call-recording-fields">
            <template v-for="f in CALL_RECORDING_FIELDS" :key="f.key">
              <FormToggle
                v-if="f.type === 'boolean'"
                :id="`edit-rec-${f.key}`"
                v-model="formCallRecording[f.key]"
                :label="f.label"
                :help-pkey="f.helpPkey ?? f.key"
                yes-value="YES"
                no-value="NO"
              />
              <FormReadonly
                v-else-if="f.type === 'readonly'"
                :id="`edit-rec-${f.key}`"
                :label="f.label"
                :help-pkey="f.helpPkey ?? f.key"
                :value="
                  formCallRecording[f.key] !== '' && formCallRecording[f.key] != null
                    ? String(formCallRecording[f.key])
                    : '—'
                "
              />
              <FormToggle
                v-else-if="f.type === 'pill' && f.options && f.options.length === 2"
                :id="`edit-rec-${f.key}`"
                v-model="formCallRecording[f.key]"
                :label="f.label"
                :help-pkey="f.helpPkey ?? f.key"
                :yes-value="f.options[0]"
                :no-value="f.options[1]"
              />
              <FormSelect
                v-else-if="f.type === 'pill'"
                :id="`edit-rec-${f.key}`"
                v-model="formCallRecording[f.key]"
                :label="f.label"
                :help-pkey="f.helpPkey ?? f.key"
                :options="f.options"
                :required="false"
              />
              <FormField
                v-else-if="f.type === 'number'"
                :id="`edit-rec-${f.key}`"
                v-model="formCallRecording[f.key]"
                :label="f.label"
                :help-pkey="f.helpPkey ?? f.key"
                type="number"
                :placeholder="f.placeholder || 'number'"
              />
              <FormField
                v-else
                :id="`edit-rec-${f.key}`"
                v-model="formCallRecording[f.key]"
                :label="f.label"
                :help-pkey="f.helpPkey ?? f.key"
                type="text"
                :placeholder="f.placeholder || ''"
              />
            </template>
          </div>

          <h2 class="detail-heading">Call control</h2>
          <div class="form-fields call-control-fields">
            <template v-for="f in CALL_CONTROL_FIELDS" :key="f.key">
              <FormToggle
                v-if="f.type === 'boolean'"
                :id="`edit-cc-${f.key}`"
                v-model="formCallControl[f.key]"
                :label="f.label"
                :help-pkey="f.helpPkey ?? f.key"
                yes-value="YES"
                no-value="NO"
              />
              <FormToggle
                v-else-if="f.type === 'pill' && f.options && f.options.length === 2"
                :id="`edit-cc-${f.key}`"
                v-model="formCallControl[f.key]"
                :label="f.label"
                :help-pkey="f.helpPkey ?? f.key"
                :yes-value="f.options[0]"
                :no-value="f.options[1]"
              />
              <FormSelect
                v-else-if="f.type === 'pill'"
                :id="`edit-cc-${f.key}`"
                v-model="formCallControl[f.key]"
                :label="f.label"
                :help-pkey="f.helpPkey ?? f.key"
                :options="f.options"
                :required="false"
              />
              <FormField
                v-else-if="f.type === 'number'"
                :id="`edit-cc-${f.key}`"
                v-model="formCallControl[f.key]"
                :label="f.label"
                :help-pkey="f.helpPkey ?? f.key"
                type="number"
                :placeholder="f.placeholder || 'number'"
              />
              <FormField
                v-else
                :id="`edit-cc-${f.key}`"
                v-model="formCallControl[f.key]"
                :label="f.label"
                :help-pkey="f.helpPkey ?? f.key"
                type="text"
                :placeholder="f.placeholder || ''"
              />
            </template>
          </div>

          <div class="edit-actions">
            <button type="submit" :disabled="saving">{{ saving ? 'Saving…' : 'Save' }}</button>
            <button type="button" class="secondary" @click="cancelEdit">Cancel</button>
            <button
              v-if="!isDefault && !fleetLocked"
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
        <p>
          Tenant <strong>{{ pkey }}</strong> will be permanently deleted. This cannot be undone.
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
.advanced-fields,
.timers-fields,
.call-recording-fields,
.call-control-fields,
.ldap-fields,
.moh-fields {
  margin-top: 0.5rem;
}
.moh-hint {
  margin: 0 0 0.5rem 0;
  font-size: 0.8125rem;
  color: #64748b;
  line-height: 1.4;
}
.moh-toolbar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}
.moh-toolbar button {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 0.375rem;
  cursor: pointer;
}
.moh-toolbar button.moh-upload-btn {
  color: #fff;
  background: #2563eb;
  border: none;
}
.moh-toolbar button.moh-upload-btn:hover:not(:disabled) {
  background: #1d4ed8;
}
.moh-toolbar button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
.moh-file-input {
  display: none;
}
.moh-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 0.75rem;
  font-size: 0.875rem;
}
.moh-table th,
.moh-table td {
  text-align: left;
  padding: 0.35rem 0.5rem;
  border-bottom: 1px solid #e2e8f0;
}
.moh-row-btn {
  padding: 0.25rem 0.5rem;
  font-size: 0.8125rem;
  border-radius: 0.375rem;
  cursor: pointer;
}
.moh-row-btn.secondary {
  color: #64748b;
  background: transparent;
  border: 1px solid #e2e8f0;
}
.moh-row-btn.action-delete {
  color: #fff;
  background: #dc2626;
  border: none;
}
.moh-row-btn.action-delete:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
.moh-audio {
  display: none;
}
.detail-heading :deep(.help-icon),
.detail-heading :deep(button) {
  vertical-align: middle;
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
</style>
