<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useToastStore } from '@/stores/toast'
import { useFormValidation, validateAll, focusFirstError } from '@/composables/useFormValidation'
import { validateTrunkPkey, validateTenant } from '@/utils/validation'
import { normalizeList } from '@/utils/listResponse'
import { fieldErrors, firstErrorMessage } from '@/utils/formErrors'
import FormField from '@/components/forms/FormField.vue'
import FormSelect from '@/components/forms/FormSelect.vue'
import FormToggle from '@/components/forms/FormToggle.vue'

const router = useRouter()
const toast = useToastStore()
const trunkType = ref('')
const pkey = ref('')
const cluster = ref('default')
const host = ref('')
const password = ref('')
const regthistrunk = ref('NO')
const transport = ref('udp')
const error = ref('')
const loading = ref(false)
const tenants = ref([])
const tenantsLoading = ref(true)
const pkeyInput = ref(null)

const pkeyValidation = useFormValidation(pkey, validateTrunkPkey)
const clusterValidation = useFormValidation(cluster, validateTenant)

const carrier = computed(() => {
  if (trunkType.value.startsWith('SIP')) return 'GeneralSIP'
  if (trunkType.value === 'IAX2 trunk') return 'GeneralIAX2'
  return ''
})
const sipRegistration = computed(() => {
  if (trunkType.value === 'SIP (send registration)') return 'SND'
  if (trunkType.value === 'SIP (accept registration)') return 'RCV'
  if (trunkType.value === 'SIP (trusted peer)') return 'NONE'
  return ''
})
const typeChosen = computed(() => !!carrier.value)
const isSIPSendReg = computed(() => trunkType.value === 'SIP (send registration)')
const isSIPAcceptReg = computed(() => trunkType.value === 'SIP (accept registration)')
const isSIPTrustedPeer = computed(() => trunkType.value === 'SIP (trusted peer)')
const isSIP = computed(() => carrier.value === 'GeneralSIP')
const isIAX2 = computed(() => carrier.value === 'GeneralIAX2')
const showHost = computed(() => isSIPSendReg.value || isSIPTrustedPeer.value || isIAX2.value)
const passwordRequired = computed(() => isSIPSendReg.value || isSIPAcceptReg.value)

const trunkTypeOptions = [
  'SIP (send registration)',
  'SIP (accept registration)',
  'SIP (trusted peer)',
  'IAX2 trunk'
]
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

watch(trunkType, (newVal) => {
  if (newVal !== 'IAX2 trunk') regthistrunk.value = 'NO'
})

onMounted(loadTenants)

async function onSubmit(e) {
  e.preventDefault()
  error.value = ''
  if (!typeChosen.value) {
    error.value = 'Please choose a trunk type'
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
  if (showHost.value && !host.value.trim()) {
    error.value = 'Host is required for this trunk type'
    return
  }
  if (passwordRequired.value && !password.value) {
    error.value = 'Password is required for this trunk type'
    return
  }
  loading.value = true
  try {
    const body = {
      pkey: pkey.value.trim(),
      carrier: carrier.value,
      cluster: cluster.value.trim(),
      username: pkey.value.trim()
    }
    if (isSIP.value) {
      if (isSIPAcceptReg.value) {
        body.host = 'dynamic'
        body.password = password.value || ''
      } else {
        body.host = host.value.trim()
        if (password.value) body.password = password.value
      }
      if (sipRegistration.value) body.sipRegistration = sipRegistration.value
      body.transport = transport.value
    } else {
      body.host = host.value.trim()
      if (password.value) body.password = password.value
      if (regthistrunk.value === 'YES') body.register = 'yes'
    }
    const trunk = await getApiClient().post('trunks', body)
    const createdPkey = trunk?.pkey ?? trunk?.data?.pkey
    if (createdPkey) {
      toast.show(`Trunk ${createdPkey} created`)
      router.push({ name: 'trunk-detail', params: { pkey: createdPkey } })
    } else {
      toast.show('Trunk created')
      router.push({ name: 'trunks' })
    }
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
    error.value = firstErrorMessage(err, 'Failed to create trunk')
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.push({ name: 'trunks' })
}

function onKeydown(e) {
  if (e.key === 'Escape') {
    e.preventDefault()
    goBack()
  }
}
</script>

<template>
  <div class="create-view" @keydown="onKeydown">
    <h1>Create trunk</h1>

    <form class="form" @submit="onSubmit">
      <p v-if="error" id="trunk-create-error" class="error" role="alert">{{ error }}</p>

      <h2 class="detail-heading">Type</h2>
      <div class="form-fields">
        <FormSelect
          id="trunk-type"
          v-model="trunkType"
          label="Trunk type"
          :options="trunkTypeOptions"
          empty-text="Choose a trunk type"
          hint="SIP (send/accept/trusted) or IAX2."
          aria-label="Choose trunk type"
        />
      </div>

      <template v-if="typeChosen">
        <h2 class="detail-heading">Identity</h2>
        <div class="form-fields">
          <FormField
            id="pkey"
            ref="pkeyInput"
            v-model="pkey"
            label="Trunk name"
            type="text"
            placeholder="e.g. mytrunk"
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
        </div>

        <h2 class="detail-heading">Connection</h2>
        <div class="form-fields">
          <FormField
            v-if="showHost"
            id="host"
            v-model="host"
            label="Host"
            type="text"
            placeholder="e.g. sip.example.com or IP"
            :required="showHost"
          />
          <p v-if="isSIPAcceptReg" class="form-hint">This trunk accepts registration from the provider; host is set to &quot;dynamic&quot; by the system.</p>
          <p v-if="isSIPTrustedPeer" class="form-hint">Trusted peer: no registration; use when the peer has a static IP.</p>
          <FormSelect
            v-if="isSIP"
            id="transport"
            v-model="transport"
            label="Transport"
            :options="['udp', 'tcp', 'tls', 'wss']"
            hint="SIP transport (udp, tcp, tls, wss)."
          />
          <FormField
            v-if="isSIP"
            id="password-sip"
            v-model="password"
            label="Password"
            type="password"
            :placeholder="passwordRequired ? 'Required' : 'Optional'"
            :required="passwordRequired"
            autocomplete="new-password"
          />
          <template v-if="isIAX2">
            <FormField
              id="password-iax"
              v-model="password"
              label="Password"
              type="password"
              placeholder="Optional"
              autocomplete="new-password"
            />
            <FormToggle
              id="regthistrunk"
              v-model="regthistrunk"
              label="Register this trunk?"
              yes-value="YES"
              no-value="NO"
            />
          </template>
        </div>
      </template>

      <div class="actions">
        <button type="submit" :disabled="loading || !typeChosen || tenantsLoading">
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
.form-hint {
  font-size: 0.8125rem;
  color: #64748b;
  margin: 0 0 0.5rem 0;
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
