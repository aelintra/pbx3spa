<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useSchema } from '@/composables/useSchema'
import { useToastStore } from '@/stores/toast'
import { useFormValidation, validateAll, focusFirstError } from '@/composables/useFormValidation'
import { validateTrunkPkey } from '@/utils/validation'
import { fieldErrors, firstErrorMessage } from '@/utils/formErrors'
import FormField from '@/components/forms/FormField.vue'
import FormSelect from '@/components/forms/FormSelect.vue'
import PanelBackLink from '@/components/PanelBackLink.vue'

const router = useRouter()
const toast = useToastStore()
const { ensureFetched, applySchemaDefaults } = useSchema()
const technology = ref('SIP')
/** SIP only: matches PBX pjsipreg (SND / RCV) or trusted peer (null in API). */
const sipRegMode = ref('TRUSTED')
const pkey = ref('')
const cluster = ref('default')
const cname = ref('')
const description = ref('')
const host = ref('')
const password = ref('')
const transport = ref('udp')
const error = ref('')
const loading = ref(false)
const pkeyInput = ref(null)

const pkeyValidation = useFormValidation(pkey, validateTrunkPkey)

const technologyOptions = ['SIP', 'IAX2']
const sipRegModeOptions = [
  { value: 'SND', label: 'Send registration to provider' },
  { value: 'RCV', label: 'Accept registration from provider' },
  { value: 'TRUSTED', label: 'Trusted peer (no outbound registration)' },
]
const isSIP = computed(() => technology.value === 'SIP')
const typeChosen = computed(() => !!technology.value)
const isSipSendReg = computed(() => isSIP.value && sipRegMode.value === 'SND')
const isSipAcceptReg = computed(() => isSIP.value && sipRegMode.value === 'RCV')
const isSipTrusted = computed(() => isSIP.value && sipRegMode.value === 'TRUSTED')

function resetForm() {
  technology.value = 'SIP'
  sipRegMode.value = 'TRUSTED'
  pkey.value = ''
  cluster.value = 'default'
  cname.value = ''
  description.value = ''
  host.value = ''
  password.value = ''
  transport.value = 'udp'
  pkeyValidation.reset()
  error.value = ''
}

watch(technology, (t) => {
  if (t !== 'SIP') {
    sipRegMode.value = 'TRUSTED'
  }
})

onMounted(async () => {
  await ensureFetched()
  applySchemaDefaults('trunks', { cluster, transport, cname, description })
})

async function onSubmit(e) {
  e.preventDefault()
  error.value = ''
  if (!typeChosen.value) {
    error.value = 'Please choose a technology'
    return
  }
  const validations = [{ ...pkeyValidation, fieldId: 'pkey' }]
  if (!validateAll(validations)) {
    await nextTick()
    focusFirstError(validations, (id) => {
      if (id === 'pkey' && pkeyInput.value) return pkeyInput.value
      return document.getElementById(id)
    })
    return
  }
  if (isSIP.value) {
    if (isSipSendReg.value || isSipTrusted.value) {
      if (!host.value.trim()) {
        error.value = 'Host is required (IP, hostname, or FQDN — not “dynamic” for this mode).'
        return
      }
      if (isSipSendReg.value && host.value.trim().toLowerCase() === 'dynamic') {
        error.value = 'Send-registration cannot use host “dynamic”. Choose “Accept registration” or “Trusted peer”.'
        return
      }
      if (isSipTrusted.value && host.value.trim().toLowerCase() === 'dynamic') {
        error.value = 'For host “dynamic”, choose “Accept registration from provider”.'
        return
      }
    }
    if ((isSipSendReg.value || isSipAcceptReg.value) && !password.value) {
      error.value = 'Password is required for SIP registration (send or accept).'
      return
    }
  } else if (!host.value.trim()) {
    error.value = 'Host is required.'
    return
  }
  loading.value = true
  try {
    const body = {
      pkey: pkey.value.trim(),
      technology: technology.value,
      cluster: cluster.value.trim(),
      username: pkey.value.trim(),
      host: isSipAcceptReg.value ? 'dynamic' : host.value.trim(),
    }
    if (cname.value.trim()) body.cname = cname.value.trim()
    if (description.value.trim()) body.description = description.value.trim()
    if (isSIP.value) {
      body.password = password.value || ''
      body.transport = transport.value
      if (sipRegMode.value === 'SND') body.pjsipreg = 'SND'
      else if (sipRegMode.value === 'RCV') body.pjsipreg = 'RCV'
    }
    await getApiClient().post('trunks', body)
    toast.show(`Trunk ${pkey.value.trim()} created`)
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
      await nextTick()
      focusFirstError(
        [{ ...pkeyValidation, fieldId: 'pkey' }],
        (id) => (id === 'pkey' && pkeyInput.value ? pkeyInput.value : document.getElementById(id))
      )
    }
    error.value = firstErrorMessage(err, 'Failed to create trunk')
  } finally {
    loading.value = false
  }
}

function goBack() {
  window.location.replace(router.resolve({ name: 'trunks' }).href)
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
    <PanelBackLink :to="{ name: 'trunks' }" label="Trunks">
      <h1>Create trunk</h1>
    </PanelBackLink>

    <form class="form" @submit="onSubmit">
      <p v-if="error" id="trunk-create-error" class="error" role="alert">{{ error }}</p>

      <div class="actions actions-top">
        <button type="submit" :disabled="loading || !typeChosen">
          {{ loading ? 'Creating…' : 'Create' }}
        </button>
        <button type="button" class="secondary" @click="goBack">Cancel</button>
      </div>

      <h2 class="detail-heading">Technology</h2>
      <div class="form-fields">
        <FormSelect
          id="trunk-technology"
          v-model="technology"
          label="Technology"
          :options="technologyOptions"
          hint="SIP or IAX2."
          aria-label="Choose technology"
        />
      </div>

      <template v-if="typeChosen">
        <template v-if="isSIP">
          <h2 class="detail-heading">SIP registration</h2>
          <div class="form-fields">
            <FormSelect
              id="trunk-sip-reg-mode"
              v-model="sipRegMode"
              label="How this trunk registers"
              :options="sipRegModeOptions"
              required
              hint="Send registration: your PBX registers to the ITSP. Accept registration: the provider registers to you (host is “dynamic”). Trusted: IP-based / no outbound registration."
              aria-label="SIP registration mode"
            />
          </div>
        </template>

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
          <FormField
            id="cname"
            v-model="cname"
            label="Common name"
            type="text"
            placeholder="Display name"
          />
          <FormField
            id="description"
            v-model="description"
            label="Description"
            type="text"
            placeholder="Optional description"
          />
        </div>

        <h2 class="detail-heading">Connection</h2>
        <div class="form-fields">
          <template v-if="isSipAcceptReg">
            <p class="form-hint form-hint-block">Host is set to <strong>dynamic</strong> for trunks that accept registration from the provider.</p>
          </template>
          <FormField
            v-else
            id="host"
            v-model="host"
            label="Host"
            type="text"
            placeholder="e.g. sip.example.com, IP, or FQDN"
            :required="true"
          />
          <p v-if="isSIP && !isSipAcceptReg" class="form-hint">Not “dynamic” unless you selected “Accept registration from provider”.</p>
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
            :placeholder="isSipTrusted ? 'Optional for trusted peer' : 'Required for send/accept registration'"
            autocomplete="new-password"
          />
        </div>
      </template>

      <div class="actions">
        <button type="submit" :disabled="loading || !typeChosen">
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
.form-hint-block {
  margin: 0 0 0.75rem 0;
  line-height: 1.4;
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
