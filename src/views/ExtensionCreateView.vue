<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useToastStore } from '@/stores/toast'
import { useFormValidation, validateAll, focusFirstError } from '@/composables/useFormValidation'
import { validateExtensionPkey, validateTenant } from '@/utils/validation'
import { normalizeList } from '@/utils/listResponse'
import { fieldErrors, firstErrorMessage } from '@/utils/formErrors'
import FormField from '@/components/forms/FormField.vue'
import FormSelect from '@/components/forms/FormSelect.vue'
import FormSegmentedPill from '@/components/forms/FormSegmentedPill.vue'
import FormToggle from '@/components/forms/FormToggle.vue'

const router = useRouter()
const toast = useToastStore()
const protocol = ref('')
const pkey = ref('')
const cluster = ref('default')
const desc = ref('')
const macaddr = ref('')
const active = ref('YES')
const transport = ref('udp')
const callbackto = ref('desk')
const callerid = ref('')
const cellphone = ref('')
const celltwin = ref('OFF')
const devicerec = ref('None')
const ipversion = ref('IPV4')
const vmailfwd = ref('')
const tenants = ref([])
const tenantsLoading = ref(true)
const error = ref('')
const loading = ref(false)
const pkeyInput = ref(null)

const pkeyValidation = useFormValidation(pkey, validateExtensionPkey)
const clusterValidation = useFormValidation(cluster, validateTenant)

const tenantOptions = computed(() => {
  const list = tenants.value.map((t) => t.pkey).filter(Boolean)
  return [...new Set(list)].sort((a, b) => String(a).localeCompare(String(b)))
})

const tenantOptionsForSelect = computed(() => {
  const list = tenantOptions.value
  const cur = cluster.value
  if (cur && !list.includes(cur)) return [cur, ...list].sort((a, b) => String(a).localeCompare(String(b)))
  return list
})

const protocolOptions = ['SIP', 'WebRTC', 'Mailbox']
const protocolChosen = computed(() => !!protocol.value)

watch(protocol, (val) => {
  if (val === 'WebRTC') transport.value = 'wss'
  else if (val === 'SIP') transport.value = 'udp'
})

function resetForm() {
  protocol.value = ''
  pkey.value = ''
  cluster.value = 'default'
  desc.value = ''
  macaddr.value = ''
  active.value = 'YES'
  transport.value = 'udp'
  callbackto.value = 'desk'
  callerid.value = ''
  cellphone.value = ''
  celltwin.value = 'OFF'
  devicerec.value = 'None'
  ipversion.value = 'IPV4'
  vmailfwd.value = ''
  pkeyValidation.reset()
  clusterValidation.reset()
  error.value = ''
}

async function loadTenants() {
  tenantsLoading.value = true
  try {
    const response = await getApiClient().get('tenants')
    tenants.value = normalizeList(response, 'tenants')
    if (tenants.value.length && !cluster.value) {
      const first = tenants.value.find((t) => t.pkey === 'default')?.pkey ?? tenants.value[0]?.pkey
      if (first) cluster.value = first
    }
  } catch {
    tenants.value = []
  } finally {
    tenantsLoading.value = false
  }
}

onMounted(() => {
  loadTenants()
  nextTick().then(() => pkeyInput.value?.focus())
})

async function onSubmit(e) {
  e.preventDefault()
  error.value = ''
  if (!protocolChosen.value) {
    error.value = 'Please choose a protocol'
    return
  }
  const validations = [
    { ...pkeyValidation, fieldId: 'pkey' },
    { ...clusterValidation, fieldId: 'cluster' }
  ]
  if (!validateAll(validations)) {
    await nextTick()
    focusFirstError(validations, (id) => {
      if (id === 'pkey' && pkeyInput.value) return pkeyInput.value
      return document.getElementById(id)
    })
    return
  }
  loading.value = true
  try {
    const body = {
      pkey: pkey.value.trim(),
      cluster: cluster.value.trim(),
      protocol: protocol.value,
      active: active.value,
      transport: transport.value,
      callbackto: callbackto.value,
      celltwin: celltwin.value,
      devicerec: devicerec.value,
      ipversion: ipversion.value
    }
    if (desc.value.trim()) body.desc = desc.value.trim()
    if (macaddr.value.trim()) body.macaddr = macaddr.value.trim().replace(/[^0-9a-fA-F]/g, '')
    if (callerid.value.trim()) body.callerid = callerid.value.trim()
    if (cellphone.value.trim()) body.cellphone = cellphone.value.trim()
    if (vmailfwd.value.trim()) body.vmailfwd = vmailfwd.value.trim()
    await getApiClient().post('extensions', body)
    toast.show(`Extension ${pkey.value.trim()} created`)
    resetForm()
    await nextTick()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch (err) {
    const errors = fieldErrors(err)
    if (errors) {
      if (errors.pkey) {
        pkeyValidation.touched.value = true
        pkeyValidation.error.value = Array.isArray(errors.pkey) ? errors.pkey[0] : errors.pkey
      }
      if (errors.cluster) {
        clusterValidation.touched.value = true
        clusterValidation.error.value = Array.isArray(errors.cluster) ? errors.cluster[0] : errors.cluster
      }
      await nextTick()
      focusFirstError(
        [{ ...pkeyValidation, fieldId: 'pkey' }, { ...clusterValidation, fieldId: 'cluster' }],
        (id) => (id === 'pkey' && pkeyInput.value ? pkeyInput.value : document.getElementById(id))
      )
    }
    error.value = firstErrorMessage(err, 'Failed to create extension')
  } finally {
    loading.value = false
  }
}

function goBack() {
  window.location.replace(router.resolve({ name: 'extensions' }).href)
}

function onKeydown(e) {
  if (e.key === 'Escape') {
    e.preventDefault()
    goBack()
  }
}
</script>

<template>
  <div class="create-view">
    <h1>Create extension</h1>

    <form class="form create-form" @submit="onSubmit" @keydown="onKeydown">
      <p v-if="error" id="extension-create-error" class="error" role="alert">{{ error }}</p>

      <div class="actions actions-top">
        <button type="submit" :disabled="loading || tenantsLoading || !protocolChosen">
          {{ loading ? 'Creating…' : 'Create' }}
        </button>
        <button type="button" class="secondary" @click="goBack">Cancel</button>
      </div>

      <h2 class="detail-heading">Identity</h2>
      <div class="form-fields">
        <FormField
          id="pkey"
          ref="pkeyInput"
          v-model="pkey"
          label="Extension number"
          type="text"
          placeholder="e.g. 1001"
          :error="pkeyValidation.error.value"
          :touched="pkeyValidation.touched.value"
          :required="true"
          @blur="pkeyValidation.onBlur"
        />
        <FormSelect
          id="cluster"
          v-model="cluster"
          label="Tenant"
          :options="tenantOptionsForSelect"
          :error="clusterValidation.error.value"
          :touched="clusterValidation.touched.value"
          :required="true"
          :loading="tenantsLoading"
          @blur="clusterValidation.onBlur"
        />
        <FormField
          id="desc"
          v-model="desc"
          label="Name (optional)"
          type="text"
          placeholder="Short description or display name"
        />
        <FormField
          id="macaddr"
          v-model="macaddr"
          label="MAC address (optional)"
          type="text"
          placeholder="e.g. 001122334455 (12 hex digits)"
          hint="SIP/WebRTC only. Leave blank for Mailbox."
        />
      </div>

      <h2 class="detail-heading">Settings</h2>
      <div class="form-fields">
        <FormSegmentedPill
          id="protocol"
          v-model="protocol"
          label="Protocol"
          :options="protocolOptions"
          hint="SIP, WebRTC, or Mailbox."
          aria-label="Choose protocol"
        />
        <FormToggle
          id="active"
          v-model="active"
          label="Active?"
          yes-value="YES"
          no-value="NO"
        />
        <FormSelect
          id="transport"
          v-model="transport"
          label="Transport"
          :options="['udp', 'tcp', 'tls', 'wss']"
          hint="SIP transport."
        />
      </div>

      <h2 class="detail-heading">Advanced</h2>
      <div class="form-fields">
        <FormSegmentedPill
          id="callbackto"
          v-model="callbackto"
          label="Callback to"
          :options="['desk', 'cell']"
        />
        <FormField
          id="callerid"
          v-model="callerid"
          label="Caller ID"
          type="text"
          inputmode="numeric"
        />
        <FormField
          id="cellphone"
          v-model="cellphone"
          label="Cell phone"
          type="text"
          inputmode="numeric"
        />
        <FormToggle
          id="celltwin"
          v-model="celltwin"
          label="Cell twin"
          yes-value="ON"
          no-value="OFF"
        />
        <FormSelect
          id="devicerec"
          v-model="devicerec"
          label="Devicerec"
          :options="['default', 'None', 'Inbound', 'Outbound', 'Both']"
        />
        <FormSegmentedPill
          id="ipversion"
          v-model="ipversion"
          label="Protocol (IP version)"
          :options="['IPV4', 'IPV6']"
        />
        <FormField
          id="vmailfwd"
          v-model="vmailfwd"
          label="Voicemail forward (email)"
          type="email"
        />
      </div>

      <div class="actions">
        <button type="submit" :disabled="loading || !protocolChosen || tenantsLoading">
          {{ loading ? 'Creating…' : 'Create' }}
        </button>
        <button type="button" class="secondary" @click="goBack">Cancel</button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.create-view {
  max-width: 52rem;
}
.form {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.create-form .detail-heading {
  font-size: 1rem;
  font-weight: 600;
  color: #334155;
  margin: 1.5rem 0 0.5rem 0;
}
.create-form .detail-heading:first-of-type {
  margin-top: 0;
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
  margin: 0;
}
.actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.25rem;
}
.actions button {
  padding: 0.5rem 1rem;
  font-size: 0.9375rem;
  font-weight: 500;
  border-radius: 0.375rem;
  cursor: pointer;
}
.actions button[type="submit"] {
  color: #fff;
  background: #2563eb;
  border: none;
}
.actions button[type="submit"]:hover:not(:disabled) {
  background: #1d4ed8;
}
.actions button[type="submit"]:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
.actions button.secondary {
  color: #64748b;
  background: transparent;
  border: 1px solid #e2e8f0;
}
.actions button.secondary:hover {
  background: #f1f5f9;
}
</style>
