<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useSchema } from '@/composables/useSchema'
import { useToastStore } from '@/stores/toast'
import { loadTenantOptions } from '@/utils/loadTenantOptions'
import { firstErrorMessage } from '@/utils/formErrors'
import { maskSipPassword, sipPasswordFieldValue } from '@/utils/maskSipPassword'
import FormField from '@/components/forms/FormField.vue'
import FormSelect from '@/components/forms/FormSelect.vue'
import FormSegmentedPill from '@/components/forms/FormSegmentedPill.vue'
import FormToggle from '@/components/forms/FormToggle.vue'
import FormReadonly from '@/components/forms/FormReadonly.vue'
import InlineCopyInput from '@/components/forms/InlineCopyInput.vue'
import FieldHelpIcon from '@/components/FieldHelpIcon.vue'
import DeleteConfirmModal from '@/components/DeleteConfirmModal.vue'
import PanelBackLink from '@/components/PanelBackLink.vue'
import DetailActiveStatusBar from '@/components/DetailActiveStatusBar.vue'
import { useAuthStore } from '@/stores/auth'
const route = useRoute()
const auth = useAuthStore()
const { getSchema, ensureFetched } = useSchema()

/** True if field is read-only per schema (extensions). */
function isReadOnly(field) {
  return getSchema('extensions')?.read_only?.includes(field) ?? false
}
const router = useRouter()
const toast = useToastStore()
const extension = ref(null)
const tenants = ref([])
const runtime = ref(null)
const runtimeError = ref('')
const loading = ref(true)
const error = ref('')
const editCluster = ref('')
const editDesc = ref('')
const editDescription = ref('')
const editCallmax = ref('')
const editActive = ref('YES')
const editTransport = ref('udp')
const editCallbackto = ref('desk')
const editCallerid = ref('')
const editCellphone = ref('')
const editCelltwin = ref('OFF')
const editDevicerec = ref('None')
const editDvrvmail = ref('')
const editExtalert = ref('')
const editNamedCallGroup = ref('ALL')
const editNamedPickupGroup = ref('ALL')
const editMacaddr = ref('')
const editProtocol = ref('IPV4')
const editTechnology = ref('SIP')
const editVmailfwd = ref('')
const editPjsipOverlay = ref('')
const saveError = ref('')
const saving = ref(false)
const deleteError = ref('')
const deleting = ref(false)
const confirmDeleteOpen = ref(false)
const editCfim = ref('')
const editCfbs = ref('')
const editRingdelay = ref('')
const confirmRegenerateSipOpen = ref(false)
const regeneratingSip = ref(false)
const regenerateSipError = ref('')
/** Cleared on every (re)load; set after regenerate or when operator clicks Show. */
const sipPasswordRevealed = ref(false)
/** Which SIP credential just copied (`user` | `passwd` | `registrar`) — drives in-field checkmark. */
const copiedSipKey = ref('')
let copiedSipTimer = null
const cosRules = ref([])
const openCos = ref({})
const closedCos = ref({})
const cosLoaded = ref(false)
const cosError = ref('')

onUnmounted(() => {
  if (copiedSipTimer) window.clearTimeout(copiedSipTimer)
})

const shortuid = computed(() => route.params.shortuid)

/** WebRTC device label — used for MAC / provision fields, not line-test entry. */
const isWebRtcExtension = computed(() => {
  const d = extension.value?.device
  return d != null && String(d).trim().toLowerCase() === 'webrtc'
})

const hasCellphone = computed(() => String(editCellphone.value ?? '').trim() !== '')

watch(editCellphone, (val) => {
  if (!String(val ?? '').trim()) editCelltwin.value = 'OFF'
})

/** Bullet-masked by default; cleartext after Show/Copy/regen (never type=password). */
const sipPasswordField = computed(() =>
  maskSipPassword(extension.value?.passwd, sipPasswordRevealed.value)
)

const hasSipPassword = computed(() => Boolean(sipPasswordField.value.value))

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
  return clusterToTenantPkey.value.get(s) ?? extension.value?.tenant_pkey ?? s
}

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

/** Tenant FQDN for SIP phone registrar (matches selected Tenant on this form). */
const sipRegistrar = computed(() => {
  const keys = [
    editCluster.value,
    extension.value?.tenant_pkey,
    extension.value?.cluster
  ]
    .filter((v) => v != null && String(v).trim() !== '')
    .map((v) => String(v).trim())
  if (!keys.length) return '—'
  for (const t of tenants.value) {
    const ids = [t.pkey, t.shortuid, t.id]
      .filter((v) => v != null && String(v).trim() !== '')
      .map((v) => String(v).trim())
    if (!keys.some((k) => ids.includes(k))) continue
    const fqdn = t.fqdn != null ? String(t.fqdn).trim() : ''
    return fqdn || '—'
  }
  return '—'
})

const sipUserValue = computed(() => {
  const v = extension.value?.shortuid
  return v != null && String(v).trim() !== '' ? String(v).trim() : ''
})

const hasSipUser = computed(() => !!sipUserValue.value)
const hasSipRegistrar = computed(() => {
  const v = sipRegistrar.value
  return !!v && v !== '—'
})

async function fetchTenants() {
  try {
    tenants.value = await loadTenantOptions()
  } catch {
    tenants.value = []
  }
}

async function fetchExtension() {
  if (!shortuid.value) return
  loading.value = true
  error.value = ''
  runtime.value = null
  runtimeError.value = ''
  sipPasswordRevealed.value = false
  try {
    extension.value = await getApiClient().get(`extensions/${encodeURIComponent(shortuid.value)}`)
    const ext = extension.value
    const tenantPkey = ext?.tenant_pkey ?? tenantPkeyDisplay(ext?.cluster)
    editCluster.value = tenantPkey ?? 'default'
    editDesc.value = ext?.desc ?? ext?.description ?? ''
    editDescription.value = ext?.description ?? ''
    editCallmax.value = ext?.callmax != null && ext?.callmax !== '' ? String(ext.callmax) : ''
    editActive.value = ext?.active ?? 'YES'
    editTransport.value = ext?.transport ?? 'udp'
    editCallbackto.value = ext?.callbackto ?? 'desk'
    editCallerid.value = ext?.callerid != null ? String(ext.callerid) : ''
    editCellphone.value = ext?.cellphone != null ? String(ext.cellphone) : ''
    editCelltwin.value = ext?.celltwin ?? 'OFF'
    const rawDevicerec = ext?.devicerec
    editDevicerec.value =
      rawDevicerec === 'OTR' || rawDevicerec === 'OTRR' ? 'Both' : (rawDevicerec ?? 'None')
    editDvrvmail.value = ext?.dvrvmail ?? ''
    editExtalert.value = ext?.extalert ?? ''
    const legacyNamed =
      ext?.named_groups != null && String(ext.named_groups).trim() !== ''
        ? String(ext.named_groups).trim()
        : null
    editNamedCallGroup.value =
      ext?.named_call_group != null && String(ext.named_call_group).trim() !== ''
        ? String(ext.named_call_group).trim()
        : legacyNamed ?? 'ALL'
    editNamedPickupGroup.value =
      ext?.named_pickup_group != null && String(ext.named_pickup_group).trim() !== ''
        ? String(ext.named_pickup_group).trim()
        : legacyNamed ?? 'ALL'
    editMacaddr.value = ext?.macaddr != null ? String(ext.macaddr).trim() : ''
    editProtocol.value = ext?.protocol ?? 'IPV4'
    editTechnology.value = ext?.technology ?? 'SIP'
    editVmailfwd.value = ext?.vmailfwd ?? ''
    editPjsipOverlay.value = ext?.pjsip_overlay ?? ''
  } catch (err) {
    error.value = firstErrorMessage(err, 'Failed to load extension')
    extension.value = null
  } finally {
    loading.value = false
  }
}

async function fetchRuntime() {
  if (!shortuid.value) return
  runtimeError.value = ''
  try {
    runtime.value = await getApiClient().get(
      `extensions/${encodeURIComponent(shortuid.value)}/runtime`
    )
    editCfim.value = runtime.value?.cfim ?? ''
    editCfbs.value = runtime.value?.cfbs ?? ''
    editRingdelay.value = runtime.value?.ringdelay != null ? String(runtime.value.ringdelay) : ''
  } catch (err) {
    runtimeError.value = firstErrorMessage(err, 'Runtime unavailable')
    runtime.value = null
  }
}

async function fetchCos() {
  if (!shortuid.value) return
  cosError.value = ''
  cosLoaded.value = false
  try {
    const data = await getApiClient().get(`extensions/${encodeURIComponent(shortuid.value)}/cos`)
    const rules = Array.isArray(data?.rules) ? data.rules : []
    const openSet = new Set((Array.isArray(data?.open) ? data.open : []).map(String))
    const closedSet = new Set((Array.isArray(data?.closed) ? data.closed : []).map(String))
    const openMap = {}
    const closedMap = {}
    for (const r of rules) {
      const key = r?.pkey != null && String(r.pkey).trim() !== '' ? String(r.pkey) : ''
      if (!key) continue
      openMap[key] = openSet.has(key) ? 'YES' : 'NO'
      closedMap[key] = closedSet.has(key) ? 'YES' : 'NO'
    }
    cosRules.value = rules
    openCos.value = openMap
    closedCos.value = closedMap
    cosLoaded.value = true
  } catch (err) {
    cosError.value = firstErrorMessage(err, 'Failed to load Class of Service')
    cosRules.value = []
    openCos.value = {}
    closedCos.value = {}
    cosLoaded.value = false
  }
}

function ruleKey(rule) {
  // Junction / API still key by pkey; UI label prefers human name.
  const name = rule?.cname != null && String(rule.cname).trim() !== '' ? String(rule.cname).trim() : ''
  if (name) return name
  return rule?.pkey != null ? String(rule.pkey) : ''
}

function ruleDescription(rule) {
  const desc = rule?.description
  return desc && String(desc).trim() ? String(desc).trim() : ''
}

onMounted(async () => {
  await ensureFetched()
  await fetchTenants()
  await fetchExtension()
  if (extension.value) {
    await Promise.all([fetchRuntime(), fetchCos()])
  }
})
watch(shortuid, () => {
  fetchExtension().then(() => {
    if (extension.value) {
      fetchRuntime()
      fetchCos()
    }
  })
})

function goBack() {
  router.push({ name: 'extensions' })
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
      pkey: extension.value?.pkey,
      cluster: editCluster.value.trim(),
      device: extension.value?.device ?? 'General SIP',
      desc: editDesc.value.trim() || undefined,
      description: editDescription.value.trim() || undefined,
      callmax: editCallmax.value.trim() ? parseInt(editCallmax.value, 10) : undefined,
      active: editActive.value,
      transport: editTransport.value,
      callbackto: editCallbackto.value,
      callerid: editCallerid.value.trim() || undefined,
      cellphone: editCellphone.value.trim() || undefined,
      celltwin: hasCellphone.value ? editCelltwin.value : 'OFF',
      devicerec: editDevicerec.value,
      dvrvmail: editDvrvmail.value.trim() || undefined,
      extalert: editExtalert.value.trim() || undefined,
      named_call_group: editNamedCallGroup.value.trim() || 'ALL',
      named_pickup_group: editNamedPickupGroup.value.trim() || 'ALL',
      macaddr: isWebRtcExtension.value
        ? null
        : editMacaddr.value.trim()
          ? editMacaddr.value.trim().replace(/[^0-9a-fA-F]/g, '')
          : null,
      protocol: editProtocol.value,
      technology: editTechnology.value || undefined,
      vmailfwd: editVmailfwd.value.trim() || undefined
    }
    if (auth.isAdmin) {
      // Always send so clearing the textarea removes the DB overlay
      body.pjsip_overlay = editPjsipOverlay.value.trim() || null
    }
    if (body.callmax !== undefined && Number.isNaN(body.callmax)) delete body.callmax
    await getApiClient().put(`extensions/${encodeURIComponent(shortuid.value)}`, body)
    if (cosLoaded.value) {
      const open = Object.entries(openCos.value)
        .filter(([, v]) => v === 'YES')
        .map(([k]) => k)
      const closed = Object.entries(closedCos.value)
        .filter(([, v]) => v === 'YES')
        .map(([k]) => k)
      await getApiClient().put(`extensions/${encodeURIComponent(shortuid.value)}/cos`, {
        open,
        closed
      })
    }
    await getApiClient().put(`extensions/${encodeURIComponent(shortuid.value)}/runtime`, {
      cfim: editCfim.value.trim() || null,
      cfbs: editCfbs.value.trim() || null,
      ringdelay: editRingdelay.value === '' ? null : parseInt(editRingdelay.value, 10)
    })
    await fetchExtension()
    if (cosLoaded.value) await fetchCos()
    await fetchRuntime()
    toast.show(`Extension saved`)
  } catch (err) {
    saveError.value = firstErrorMessage(err, 'Failed to update extension')
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
    await getApiClient().delete(`extensions/${encodeURIComponent(shortuid.value)}`)
    toast.show(`Extension deleted`)
    router.push({ name: 'extensions' })
  } catch (err) {
    deleteError.value = firstErrorMessage(err, 'Failed to delete extension')
  } finally {
    deleting.value = false
    confirmDeleteOpen.value = false
  }
}

function goLineQualityTest() {
  const target =
    extension.value?.pkey != null && String(extension.value.pkey).trim() !== ''
      ? String(extension.value.pkey).trim()
      : String(shortuid.value || '')
  const q = { target }
  const tenant = extension.value?.tenant_pkey ?? editCluster.value
  if (tenant) q.cluster = String(tenant)
  router.push({ name: 'support-line-test', query: q })
}

function openRegenerateSipModal() {
  regenerateSipError.value = ''
  confirmRegenerateSipOpen.value = true
}

function cancelRegenerateSip() {
  if (regeneratingSip.value) return
  confirmRegenerateSipOpen.value = false
}

function toggleSipPasswordReveal() {
  if (!hasSipPassword.value) return
  sipPasswordRevealed.value = !sipPasswordRevealed.value
}

async function copyText(text, { empty, revealPassword = false, key } = {}) {
  if (!text) {
    toast.show(empty || 'Nothing to copy')
    return
  }
  try {
    await navigator.clipboard.writeText(text)
    if (revealPassword) sipPasswordRevealed.value = true
    if (key) {
      copiedSipKey.value = key
      if (copiedSipTimer) window.clearTimeout(copiedSipTimer)
      copiedSipTimer = window.setTimeout(() => {
        if (copiedSipKey.value === key) copiedSipKey.value = ''
      }, 1500)
    }
  } catch {
    if (revealPassword) sipPasswordRevealed.value = true
    toast.show('Could not copy — select and copy the field')
  }
}

async function copySipPassword() {
  await copyText(sipPasswordFieldValue(extension.value?.passwd), {
    empty: 'No SIP password to copy',
    revealPassword: true,
    key: 'passwd'
  })
}

async function copySipUser() {
  await copyText(sipUserValue.value, {
    empty: 'No SIP User to copy',
    key: 'user'
  })
}

async function copySipRegistrar() {
  await copyText(hasSipRegistrar.value ? sipRegistrar.value : '', {
    empty: 'No SIP Registrar to copy',
    key: 'registrar'
  })
}

async function confirmRegenerateSip() {
  regenerateSipError.value = ''
  regeneratingSip.value = true
  try {
    const data = await getApiClient().post(
      `extensions/${encodeURIComponent(shortuid.value)}/regenerate-sip-password`,
      {}
    )
    if (extension.value && data && typeof data === 'object') {
      Object.assign(extension.value, data)
    }
    sipPasswordRevealed.value = true
    confirmRegenerateSipOpen.value = false
    toast.show(
      'SIP password regenerated. Copy the new value into the phone before it can register again.'
    )
  } catch (err) {
    regenerateSipError.value = firstErrorMessage(err, 'Failed to regenerate SIP password')
  } finally {
    regeneratingSip.value = false
  }
}

const panelTitleTenantSuffix = computed(() => {
  if (!extension.value) return ''
  const t = String(editCluster.value ?? '').trim()
  if (!t) return ''
  return ` (${t})`
})
</script>

<template>
  <div class="detail-view" @keydown="onKeydown">
    <PanelBackLink :to="{ name: 'extensions' }" label="Extensions">
      <div class="detail-panel-head">
        <div class="detail-title-status-row">
          <h1 class="detail-panel-title">
            Edit Extension {{ extension?.pkey ?? '…' }}{{ panelTitleTenantSuffix }}
          </h1>
          <DetailActiveStatusBar
            v-if="extension"
            v-model="editActive"
            toggle-id="edit-extension-active"
          />
        </div>
        <p
          v-if="extension && editActive === 'NO'"
          class="detail-active-inactive-hint"
          role="status"
        >
          <template v-if="extension.z_updater === 'velocity'">
            Disabled by toll-fraud velocity (IRSF surge). Activate and commit to restore this
            phone; investigate compromise before re-enabling.
          </template>
          <template v-else>
            Inactive extensions do not take calls until you activate this record and commit the
            change.
          </template>
        </p>
      </div>
    </PanelBackLink>

    <p v-if="loading" class="loading">Loading…</p>
    <div v-else-if="error" class="error-state">
      <p class="error">{{ error }}</p>
      <div class="error-actions">
        <button type="button" class="btn secondary" @click="goBack">Back to extensions</button>
        <button
          type="button"
          class="btn btn-primary"
          @click="() => fetchExtension().then(() => extension.value && fetchRuntime())"
        >
          Retry
        </button>
      </div>
    </div>
    <template v-else-if="extension">
      <div class="detail-content">
        <p v-if="deleteError" class="error">{{ deleteError }}</p>

        <form class="edit-form" autocomplete="off" @submit="saveEdit">
          <p v-if="saveError" id="extension-edit-error" class="error" role="alert">
            {{ saveError }}
          </p>

          <div class="edit-actions edit-actions-top">
            <div class="edit-actions-main">
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
            <button
              type="button"
              class="line-test-open-btn"
              @click="goLineQualityTest"
            >
              Line quality test
            </button>
          </div>

          <h2 class="detail-heading">Identity</h2>
          <div class="form-fields">
            <FormReadonly
              v-if="isReadOnly('shortuid')"
              id="edit-identity-shortuid"
              label="UID"
              :value="extension.shortuid ?? '—'"
              class="readonly-identity"
            />
            <FormField
              v-else
              id="edit-identity-shortuid"
              :model-value="extension.shortuid ?? '—'"
              label="UID"
              disabled
              class="readonly-identity"
            />
            <FormReadonly
              v-if="isReadOnly('id')"
              id="edit-identity-id"
              label="KSUID"
              :value="extension.id ?? '—'"
              class="readonly-identity"
            />
            <FormField
              v-else
              id="edit-identity-id"
              :model-value="extension.id ?? '—'"
              label="KSUID"
              disabled
              class="readonly-identity"
            />
            <FormReadonly
              v-if="isReadOnly('pkey')"
              id="edit-identity-pkey"
              label="Ext Dial"
              help-pkey="blkstart"
              :value="extension.pkey ?? '—'"
              class="readonly-identity"
            />
            <FormField
              v-else
              id="edit-identity-pkey"
              :model-value="extension.pkey ?? '—'"
              label="Ext Dial"
              help-pkey="blkstart"
              disabled
              class="readonly-identity"
            />
            <div class="form-field sip-passwd-field readonly-identity">
              <label for="edit-identity-sip-user" class="form-field-label">
                SIP User
                <FieldHelpIcon pkey="shortuid" />
              </label>
              <div class="form-field-input-wrapper">
                <InlineCopyInput
                  id="edit-identity-sip-user"
                  :value="sipUserValue || '—'"
                  :disabled="!hasSipUser || saving"
                  :copied="copiedSipKey === 'user'"
                  copy-label="Copy SIP User"
                  @copy="copySipUser"
                />
              </div>
            </div>
            <div class="form-field sip-passwd-field readonly-identity">
              <label for="edit-identity-passwd" class="form-field-label">SIP Password</label>
              <div class="form-field-input-wrapper">
                <div class="sip-passwd-inline">
                  <InlineCopyInput
                    id="edit-identity-passwd"
                    :type="sipPasswordField.type"
                    :value="sipPasswordField.value"
                    :placeholder="sipPasswordField.placeholder"
                    :disabled="!hasSipPassword || saving || regeneratingSip"
                    :copied="copiedSipKey === 'passwd'"
                    copy-label="Copy SIP Password"
                    @copy="copySipPassword"
                  />
                  <button
                    type="button"
                    class="sip-action-btn"
                    :disabled="!hasSipPassword || saving || regeneratingSip"
                    @click="toggleSipPasswordReveal"
                  >
                    {{ sipPasswordRevealed ? 'Hide' : 'Show' }}
                  </button>
                  <button
                    type="button"
                    class="sip-regenerate-btn"
                    :disabled="saving || regeneratingSip"
                    @click="openRegenerateSipModal"
                  >
                    Regen
                  </button>
                </div>
              </div>
            </div>
            <div class="form-field sip-passwd-field readonly-identity">
              <label for="edit-identity-sip-registrar" class="form-field-label">SIP Registrar</label>
              <div class="form-field-input-wrapper">
                <InlineCopyInput
                  id="edit-identity-sip-registrar"
                  :value="sipRegistrar"
                  :disabled="!hasSipRegistrar || saving"
                  :copied="copiedSipKey === 'registrar'"
                  copy-label="Copy SIP Registrar"
                  @copy="copySipRegistrar"
                />
              </div>
            </div>
            <FormReadonly
              v-if="isReadOnly('device')"
              id="edit-identity-device"
              label="Device"
              :value="extension.device ?? '—'"
              class="readonly-identity"
            />
            <FormField
              v-else
              id="edit-identity-device"
              :model-value="extension.device ?? '—'"
              label="Device"
              disabled
              class="readonly-identity"
            />
            <FormReadonly
              v-if="!isWebRtcExtension"
              id="edit-identity-handset"
              label="Handset"
              :value="extension.handset_label || '—'"
              class="readonly-identity"
            />
            <FormReadonly
              v-if="!isWebRtcExtension && extension.lastseen"
              id="edit-identity-lastseen"
              label="Last seen"
              :value="extension.lastseen"
              class="readonly-identity"
            />
            <template v-if="!isWebRtcExtension">
              <FormReadonly
                v-if="isReadOnly('macaddr')"
                id="edit-identity-macaddr"
                label="MAC address"
                :value="extension.macaddr?.trim() || '—'"
                class="readonly-identity"
              />
              <FormField
                v-else
                id="edit-identity-macaddr"
                v-model="editMacaddr"
                label="MAC address"
                type="text"
                placeholder="12 hex digits or 00:11:22:33:44:55"
              />
            </template>
            <FormSelect
              id="edit-cluster"
              v-model="editCluster"
              label="Tenant"
              :options="tenantOptionsForSelect"
              :required="true"
            />
            <FormField
              id="edit-desc"
              v-model="editDesc"
              label="User (extension name)"
              type="text"
              placeholder="e.g. John Doe"
            />
            <FormField
              id="edit-description"
              v-model="editDescription"
              label="Description"
              type="text"
              placeholder="Freeform description"
            />
          </div>

          <h2 class="detail-heading">Transport</h2>
          <div class="form-fields">
            <FormSelect
              id="edit-transport"
              v-model="editTransport"
              label="Transport"
              :options="['udp', 'tcp', 'tls', 'wss']"
            />
          </div>

          <h2 class="detail-heading">Behaviour</h2>
          <p v-if="runtimeError" class="muted behaviour-hint">
            Live Asterisk values unavailable ({{ runtimeError }}). You can still set CFIM / CFBS /
            ring delay; Save writes them to the PBX.
          </p>
          <div class="form-fields">
            <FormField
              id="edit-cfim"
              v-model="editCfim"
              label="CFIM (call forward no answer)"
              type="text"
              placeholder="e.g. +1234567890"
            />
            <FormField
              id="edit-cfbs"
              v-model="editCfbs"
              label="CFBS (call forward busy)"
              type="text"
              placeholder="e.g. +1234567890"
            />
            <FormField
              id="edit-ringdelay"
              v-model="editRingdelay"
              label="Ring delay (seconds)"
              type="number"
              placeholder="0"
            />
          </div>

          <h2 class="detail-heading">Advanced</h2>
          <div class="form-fields">
            <FormSegmentedPill
              id="edit-callbackto"
              v-model="editCallbackto"
              label="Callback to"
              :options="['desk', 'cell']"
            />
            <FormField
              id="edit-callerid"
              v-model="editCallerid"
              label="Caller ID"
              type="text"
              inputmode="numeric"
              hide-help
            />
            <FormField
              id="edit-cellphone"
              v-model="editCellphone"
              label="Cell phone"
              type="text"
              inputmode="numeric"
            />
            <FormToggle
              v-if="hasCellphone"
              id="edit-celltwin"
              v-model="editCelltwin"
              label="Cell twin"
              yes-value="ON"
              no-value="OFF"
            />
            <FormSelect
              id="edit-devicerec"
              v-model="editDevicerec"
              label="Devicerec"
              :options="['default', 'None', 'Inbound', 'Outbound', 'Both']"
            />
            <FormField
              id="edit-callmax"
              v-model="editCallmax"
              label="Call max"
              type="text"
              inputmode="numeric"
              placeholder="e.g. 3"
            />
            <FormField
              id="edit-named_call_group"
              v-model="editNamedCallGroup"
              label="Named call groups"
              type="text"
              placeholder="ALL"
            />
            <FormField
              id="edit-named_pickup_group"
              v-model="editNamedPickupGroup"
              label="Named pickup groups"
              type="text"
              placeholder="ALL"
            />
            <FormField id="edit-extalert" v-model="editExtalert" label="Ext alert" type="text" />
            <FormSegmentedPill
              id="edit-protocol"
              v-model="editProtocol"
              label="Protocol (IP version)"
              :options="['IPV4', 'IPV6']"
            />
            <FormField
              id="edit-dvrvmail"
              v-model="editDvrvmail"
              label="Voicemail box"
              type="text"
            />
            <FormField
              id="edit-vmailfwd"
              v-model="editVmailfwd"
              label="Voicemail forward (email)"
              type="email"
            />
            <FormField
              v-if="auth.isAdmin"
              id="edit-pjsip_overlay"
              v-model="editPjsipOverlay"
              label="PJSIP overlay"
              type="text"
              placeholder="Thin overlay fragment (type= + keys)"
              :multiline="true"
              :rows="8"
            />
          </div>

          <h2 class="detail-heading detail-heading-with-help">
            <span>Standard Class of Service</span>
            <FieldHelpIcon pkey="cosday" />
          </h2>
          <p v-if="cosError" class="error">{{ cosError }}</p>
          <p v-else-if="!cosLoaded" class="muted">Loading Class of Service…</p>
          <p v-else-if="cosRules.length === 0" class="muted">
            No Class of Service rules for this tenant.
          </p>
          <div v-else class="form-fields cos-rules">
            <FormToggle
              v-for="rule in cosRules"
              :id="`cos-open-${rule.pkey}`"
              :key="`open-${rule.pkey}`"
              v-model="openCos[rule.pkey]"
              :label="ruleKey(rule)"
              :hint="ruleDescription(rule)"
              yes-value="YES"
              no-value="NO"
              hide-help
            />
          </div>

          <h2 class="detail-heading detail-heading-with-help">
            <span>After-hours Class of Service</span>
            <FieldHelpIcon pkey="cosnight" />
          </h2>
          <p v-if="cosError" class="error">{{ cosError }}</p>
          <p v-else-if="!cosLoaded" class="muted">Loading Class of Service…</p>
          <p v-else-if="cosRules.length === 0" class="muted">
            No Class of Service rules for this tenant.
          </p>
          <div v-else class="form-fields cos-rules">
            <FormToggle
              v-for="rule in cosRules"
              :id="`cos-closed-${rule.pkey}`"
              :key="`closed-${rule.pkey}`"
              v-model="closedCos[rule.pkey]"
              :label="ruleKey(rule)"
              :hint="ruleDescription(rule)"
              yes-value="YES"
              no-value="NO"
              hide-help
            />
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

    <Teleport to="body">
      <div
        v-if="confirmRegenerateSipOpen"
        class="sip-modal-backdrop"
        @click.self="cancelRegenerateSip"
      >
        <div
          class="sip-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="regenerate-sip-title"
        >
          <h2 id="regenerate-sip-title" class="sip-modal-title">Regenerate SIP password?</h2>
          <div class="sip-modal-body">
            <p>
              The current password will <strong>stop working immediately</strong>. This phone must
              be updated to the new secret before it can register again.
            </p>
            <p class="sip-modal-hint">
              Use <strong>Commit</strong> when you are ready so Asterisk config matches the
              database.
            </p>
            <p v-if="regenerateSipError" class="error">{{ regenerateSipError }}</p>
          </div>
          <div class="sip-modal-actions">
            <button
              type="button"
              class="sip-modal-btn sip-modal-btn-cancel"
              @click="cancelRegenerateSip"
            >
              Cancel
            </button>
            <button
              type="button"
              class="sip-modal-btn sip-modal-btn-confirm"
              :disabled="regeneratingSip"
              @click="confirmRegenerateSip"
            >
              {{ regeneratingSip ? 'Regenerating…' : 'Regenerate' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <DeleteConfirmModal
      :show="confirmDeleteOpen"
      title="Delete extension?"
      :loading="deleting"
      @confirm="confirmAndDelete"
      @cancel="cancelConfirmDelete"
    >
      <template #body>
        <p>
          Extension <strong>{{ extension?.pkey ?? '—' }}</strong> will be permanently deleted. This
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
.error-state {
  margin-top: 1rem;
}
.error-state .error {
  margin-bottom: 1rem;
}
.error-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.75rem;
}
.error-actions button {
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-weight: 500;
  cursor: pointer;
}
.error-actions button.secondary {
  color: #64748b;
  background: transparent;
  border: 1px solid #e2e8f0;
}
.error-actions button.secondary:hover {
  background: #f1f5f9;
}
.error-actions button.btn-primary {
  color: #fff;
  background: #2563eb;
  border: none;
}
.error-actions button.btn-primary:hover {
  background: #1d4ed8;
}
.muted {
  color: #64748b;
  font-size: 0.875rem;
  margin: 0;
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
.detail-heading-with-help {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}
.cos-rules {
  margin-bottom: 0.25rem;
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
.edit-form {
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-width: 52rem;
}
.behaviour-hint {
  margin: 0 0 0.75rem;
  font-size: 0.875rem;
}
.edit-actions {
  display: flex;
  gap: 0.5rem;
}
.edit-actions-top {
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem 1rem;
}
.edit-actions-main {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
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
/* Diagnostic tool — violet (pops vs blue Save / red Delete; RG-colorblind friendly). */
.line-test-open-btn {
  margin-left: auto;
  padding: 0.45rem 1rem;
  font-size: 0.9rem;
  font-weight: 650;
  letter-spacing: 0.01em;
  color: #fff;
  background: #6d28d9;
  border: 1px solid #5b21b6;
  border-radius: 0.4rem;
  box-shadow: 0 1px 2px rgba(91, 33, 182, 0.35);
  cursor: pointer;
}
.line-test-open-btn:hover {
  background: #7c3aed;
  border-color: #6d28d9;
  box-shadow: 0 2px 8px rgba(109, 40, 217, 0.4);
}
.line-test-open-btn:focus-visible {
  outline: 2px solid #a78bfa;
  outline-offset: 2px;
}

/* SIP credential rows: label | InlineCopyInput (+ Show/Regen for password) */
.sip-passwd-field.form-field {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 2fr;
  gap: 0.375rem 1rem;
  align-items: start;
  margin-bottom: 0.75rem;
  width: 100%;
  min-width: 0;
}
.sip-passwd-field .form-field-label {
  font-weight: 500;
  color: #475569;
  padding-top: 0.375rem;
  white-space: nowrap;
}
.sip-passwd-field .form-field-input-wrapper {
  min-width: 0;
}
.sip-passwd-inline {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  gap: 0.5rem;
  width: 100%;
  min-width: 0;
}
.readonly-identity.sip-passwd-field .form-field-label {
  color: #94a3b8;
}
.sip-regenerate-btn {
  flex-shrink: 0;
  align-self: stretch;
  padding: 0 0.65rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: #fff;
  background: #dc2626;
  border: 1px solid #b91c1c;
  border-radius: 0.375rem;
  cursor: pointer;
  white-space: nowrap;
}
.sip-regenerate-btn:hover:not(:disabled) {
  background: #b91c1c;
  border-color: #991b1b;
}
.sip-regenerate-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}
.sip-action-btn {
  flex-shrink: 0;
  align-self: stretch;
  padding: 0 0.65rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: #0f172a;
  background: #fff;
  border: 1px solid #cbd5e1;
  border-radius: 0.375rem;
  cursor: pointer;
  white-space: nowrap;
}
.sip-action-btn:hover:not(:disabled) {
  background: #f8fafc;
  border-color: #94a3b8;
}
.sip-action-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.sip-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}
.sip-modal {
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  padding: 1.5rem;
  max-width: 26rem;
  width: 100%;
}
.sip-modal-title {
  margin: 0 0 0.75rem 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #0f172a;
}
.sip-modal-body {
  margin: 0 0 1.25rem 0;
  font-size: 0.9375rem;
  color: #475569;
  line-height: 1.5;
}
.sip-modal-body :deep(strong),
.sip-modal-body strong {
  color: #0f172a;
}
.sip-modal-hint {
  margin: 0.75rem 0 0 0;
  font-size: 0.875rem;
  color: #64748b;
}
.sip-modal-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}
.sip-modal-btn {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 0.375rem;
  cursor: pointer;
  border: none;
}
.sip-modal-btn-cancel {
  background: #f1f5f9;
  color: #475569;
}
.sip-modal-btn-cancel:hover {
  background: #e2e8f0;
}
.sip-modal-btn-confirm {
  background: #2563eb;
  color: #fff;
}
.sip-modal-btn-confirm:hover:not(:disabled) {
  background: #1d4ed8;
}
.sip-modal-btn-confirm:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
</style>
