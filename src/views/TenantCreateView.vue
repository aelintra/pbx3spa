<script setup>
import { ref, reactive, toRef, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import { useSchema } from '@/composables/useSchema'
import { useToastStore } from '@/stores/toast'
import { useFormValidation, validateAll, focusFirstError } from '@/composables/useFormValidation'
import { validateTenantPkey } from '@/utils/validation'
import {
  ADVANCED_FIELDS,
  LDAP_FIELDS,
  CALL_CONTROL_FIELDS,
  CALL_RECORDING_FIELDS,
  MONITORING_FIELDS,
  TIMERS_FIELDS,
  CLUSTER_CREATE_DEFAULTS,
  buildAdvancedPayload,
  buildCallControlPayload,
  buildCallRecordingPayload,
  buildMonitoringPayload,
  buildTimersPayload,
  buildLdapPayload,
  buildInitialFormAdvanced,
  buildInitialFormCallControl,
  buildInitialFormCallRecording,
  buildInitialFormMonitoring,
  buildInitialFormTimers,
  buildInitialFormLdap,
  parseNum
} from '@/constants/tenantAdvanced'
import { fieldErrors } from '@/utils/formErrors'
import { OBJECT_PKEY_HELP } from '@/constants/helpPkeys'
import FormField from '@/components/forms/FormField.vue'
import FormSelect from '@/components/forms/FormSelect.vue'
import FormSegmentedPill from '@/components/forms/FormSegmentedPill.vue'
import FormToggle from '@/components/forms/FormToggle.vue'
import FormReadonly from '@/components/forms/FormReadonly.vue'
import PanelBackLink from '@/components/PanelBackLink.vue'

const router = useRouter()
const toast = useToastStore()
const auth = useAuthStore()
const { ensureFetched, applySchemaDefaults } = useSchema()
const pkey = ref('')
const description = ref('')
const clusterclid = ref('')
const localarea = ref(CLUSTER_CREATE_DEFAULTS.localarea ?? '')
const localdplan = ref(CLUSTER_CREATE_DEFAULTS.localdplan ?? '')
const chanmax = ref('3')
const maxin = ref(String(CLUSTER_CREATE_DEFAULTS.maxin ?? '30'))
const voipMax = ref(String(CLUSTER_CREATE_DEFAULTS.voip_max ?? '30'))
const error = ref('')
const loading = ref(false)
const pkeyInput = ref(null)
/** Instance `globals.domain`; used with server-assigned tenant shortuid for domain/fqdn on create. */
const globalsDomain = ref('')
const globalsFetchDone = ref(false)

const autoDomainFqdnPattern = computed(() => {
  const d = globalsDomain.value
  if (!d) return ''
  return `<tenant UID>.${d}`
})

// Field-level validation (refs declared before composable)
const pkeyValidation = useFormValidation(pkey, validateTenantPkey)

const formAdvanced = reactive(buildInitialFormAdvanced())
const formTimers = reactive(buildInitialFormTimers())
const formCallRecording = reactive(buildInitialFormCallRecording())
const formCallControl = reactive(buildInitialFormCallControl())
const formLdap = reactive(buildInitialFormLdap())
const formMonitoring = reactive(buildInitialFormMonitoring())

function resetForm() {
  pkey.value = ''
  description.value = ''
  clusterclid.value = ''
  localarea.value = CLUSTER_CREATE_DEFAULTS.localarea ?? ''
  localdplan.value = CLUSTER_CREATE_DEFAULTS.localdplan ?? ''
  chanmax.value = '3'
  maxin.value = String(CLUSTER_CREATE_DEFAULTS.maxin ?? '30')
  voipMax.value = String(CLUSTER_CREATE_DEFAULTS.voip_max ?? '30')
  Object.assign(formAdvanced, buildInitialFormAdvanced())
  Object.assign(formTimers, buildInitialFormTimers())
  Object.assign(formCallRecording, buildInitialFormCallRecording())
  Object.assign(formCallControl, buildInitialFormCallControl())
  Object.assign(formLdap, buildInitialFormLdap())
  Object.assign(formMonitoring, buildInitialFormMonitoring())
  pkeyValidation.reset()
  error.value = ''
}

async function onSubmit(e) {
  e.preventDefault()
  error.value = ''

  const validations = [{ ...pkeyValidation, fieldId: 'pkey' }]
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
      description: description.value.trim(),
      ...(parseNum(clusterclid.value) !== undefined && {
        clusterclid: parseNum(clusterclid.value)
      }),
      ...(parseNum(localarea.value) !== undefined && { localarea: parseNum(localarea.value) }),
      ...(localdplan.value.trim() !== '' && { localdplan: localdplan.value.trim() }),
      ...(parseNum(chanmax.value) !== undefined && { chanmax: parseNum(chanmax.value) }),
      ...(parseNum(maxin.value) !== undefined && { maxin: parseNum(maxin.value) }),
      ...(parseNum(voipMax.value) !== undefined && { voip_max: parseNum(voipMax.value) }),
      ...buildTimersPayload(formTimers),
      ...buildAdvancedPayload(formAdvanced),
      ...buildCallRecordingPayload(formCallRecording),
      ...buildMonitoringPayload(formMonitoring),
      ...buildCallControlPayload(formCallControl),
      ...buildLdapPayload(formLdap)
    }
    const cleaned = Object.fromEntries(
      Object.entries(body).filter(([, v]) => v !== undefined && v !== '')
    )
    const createdPkey = pkey.value.trim()
    await getApiClient().post('tenants', cleaned)
    toast.show(`Tenant ${createdPkey} created`)
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
      const first = Object.values(errors).flat()[0]
      error.value = first || err.message
      await nextTick()
      focusFirstError(validations, (id) => {
        if (id === 'pkey' && pkeyInput.value) return pkeyInput.value
        return document.getElementById(id)
      })
    } else {
      error.value = err.data?.Error || err.data?.message || err.message || 'Failed to create tenant'
    }
  } finally {
    loading.value = false
  }
}

function goBack() {
  window.location.replace(router.resolve({ name: 'tenants' }).href)
}

function onKeydown(e) {
  if (e.key === 'Escape') {
    e.preventDefault()
    goBack()
  }
}

onMounted(async () => {
  await ensureFetched()
  try {
    const g = await getApiClient().get('sysglobals')
    auth.setGlobalsFqdnFromSysglobal(g)
    const raw = g?.domain
    globalsDomain.value = raw != null && String(raw).trim() !== '' ? String(raw).trim() : ''
  } catch {
    globalsDomain.value = ''
  } finally {
    globalsFetchDone.value = true
  }
  applySchemaDefaults('tenants', {
    description,
    clusterclid,
    localarea,
    localdplan,
    chanmax,
    maxin,
    voip_max: voipMax,
    abstimeout: toRef(formTimers, 'abstimeout'),
    masteroclo: toRef(formTimers, 'masteroclo')
  })
  nextTick().then(() => pkeyInput.value?.focus())
})
</script>

<template>
  <div class="create-view">
    <PanelBackLink :to="{ name: 'tenants' }" label="Tenants">
      <h1>Create tenant</h1>
    </PanelBackLink>

    <form class="form create-form" @submit="onSubmit" @keydown="onKeydown">
      <p v-if="error" id="tenant-create-error" class="error" role="alert">{{ error }}</p>

      <div class="actions actions-top">
        <button type="submit" :disabled="loading">
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
          label="Name"
          :help-pkey="OBJECT_PKEY_HELP.tenant"
          type="text"
          placeholder="e.g. mycluster"
          :error="pkeyValidation.error.value"
          :touched="pkeyValidation.touched.value"
          :required="true"
          hint="Unique tenant identifier."
          @blur="pkeyValidation.onBlur"
        />
        <FormField
          id="description"
          v-model="description"
          label="Description"
          type="text"
          placeholder="Short description"
          :required="true"
        />
        <FormField
          id="clusterclid"
          v-model="clusterclid"
          label="CLID"
          type="number"
          placeholder="integer"
        />
        <FormField
          id="localarea"
          v-model="localarea"
          label="Local area"
          type="number"
          placeholder="number"
        />
        <FormField
          id="localdplan"
          v-model="localdplan"
          label="Local dialplan"
          type="text"
          placeholder="e.g. _X."
        />
        <FormReadonly
          v-if="globalsFetchDone && globalsDomain"
          id="create-auto-domain-fqdn"
          label="Domain / FQDN (auto)"
          :value="autoDomainFqdnPattern"
          hide-help
        />
        <p v-if="globalsFetchDone && globalsDomain" class="auto-host-note">
          <code>&lt;tenant UID&gt;</code> is the short UID assigned when you click Create; both
          fields use that hostname.
        </p>
        <p
          v-else-if="globalsFetchDone && !globalsDomain"
          class="auto-host-note auto-host-note-warn"
        >
          Set <strong>Domain</strong> on
          <router-link :to="{ name: 'sysglobals' }">Instance Globals</router-link>
          to auto-assign each new tenant’s domain and FQDN.
        </p>
      </div>

      <h2 class="detail-heading">Settings</h2>
      <div class="form-fields">
        <FormField
          id="chanmax"
          v-model="chanmax"
          label="ChanMax"
          type="number"
          placeholder="integer"
        />
        <FormField id="maxin" v-model="maxin" label="Max in" type="number" placeholder="integer" />
        <FormField
          id="voip-max"
          v-model="voipMax"
          label="VoIP max"
          type="number"
          placeholder="integer"
        />
      </div>

      <h2 class="detail-heading">Timers</h2>
      <div class="form-fields">
        <template v-for="f in TIMERS_FIELDS" :key="f.key">
          <FormToggle
            v-if="f.type === 'boolean'"
            :id="`timers-${f.key}`"
            v-model="formTimers[f.key]"
            :label="f.label"
            :help-pkey="f.helpPkey ?? f.key"
            yes-value="YES"
            no-value="NO"
          />
          <FormSegmentedPill
            v-else-if="f.type === 'segmented'"
            :id="`timers-${f.key}`"
            v-model="formTimers[f.key]"
            :label="f.label"
            :help-pkey="f.helpPkey ?? f.key"
            :options="f.options"
          />
          <FormToggle
            v-else-if="f.type === 'pill' && f.options && f.options.length === 2"
            :id="`timers-${f.key}`"
            v-model="formTimers[f.key]"
            :label="f.label"
            :help-pkey="f.helpPkey ?? f.key"
            :yes-value="f.options[0]"
            :no-value="f.options[1]"
          />
          <FormSelect
            v-else-if="f.type === 'pill'"
            :id="`timers-${f.key}`"
            v-model="formTimers[f.key]"
            :label="f.label"
            :help-pkey="f.helpPkey ?? f.key"
            :options="f.options"
            :required="false"
          />
          <FormField
            v-else-if="f.type === 'number'"
            :id="`timers-${f.key}`"
            v-model="formTimers[f.key]"
            :label="f.label"
            :help-pkey="f.helpPkey ?? f.key"
            type="number"
            :placeholder="f.placeholder || 'number'"
          />
          <FormField
            v-else
            :id="`timers-${f.key}`"
            v-model="formTimers[f.key]"
            :label="f.label"
            :help-pkey="f.helpPkey ?? f.key"
            type="text"
            :placeholder="f.placeholder || ''"
          />
        </template>
      </div>

      <h2 class="detail-heading">Advanced</h2>
      <div class="form-fields">
        <template v-for="f in ADVANCED_FIELDS" :key="f.key">
          <FormToggle
            v-if="f.type === 'boolean'"
            :id="`adv-${f.key}`"
            v-model="formAdvanced[f.key]"
            :label="f.label"
            :help-pkey="f.helpPkey ?? f.key"
            yes-value="YES"
            no-value="NO"
          />
          <FormToggle
            v-else-if="f.type === 'pill' && f.options && f.options.length === 2"
            :id="`adv-${f.key}`"
            v-model="formAdvanced[f.key]"
            :label="f.label"
            :help-pkey="f.helpPkey ?? f.key"
            :yes-value="f.options[0]"
            :no-value="f.options[1]"
          />
          <FormSelect
            v-else-if="f.type === 'pill'"
            :id="`adv-${f.key}`"
            v-model="formAdvanced[f.key]"
            :label="f.label"
            :help-pkey="f.helpPkey ?? f.key"
            :options="f.options"
            :required="false"
          />
          <FormField
            v-else-if="f.type === 'number'"
            :id="`adv-${f.key}`"
            v-model="formAdvanced[f.key]"
            :label="f.label"
            :help-pkey="f.helpPkey ?? f.key"
            type="number"
            :placeholder="f.placeholder || 'number'"
          />
          <FormField
            v-else
            :id="`adv-${f.key}`"
            v-model="formAdvanced[f.key]"
            :label="f.label"
            :help-pkey="f.helpPkey ?? f.key"
            type="text"
            :placeholder="f.placeholder || ''"
          />
        </template>
      </div>

      <h2 class="detail-heading">Call recording</h2>
      <div class="form-fields">
        <template v-for="f in CALL_RECORDING_FIELDS" :key="f.key">
          <FormToggle
            v-if="f.type === 'boolean'"
            :id="`rec-${f.key}`"
            v-model="formCallRecording[f.key]"
            :label="f.label"
            :help-pkey="f.helpPkey ?? f.key"
            yes-value="YES"
            no-value="NO"
          />
          <FormReadonly
            v-else-if="f.type === 'readonly'"
            :id="`rec-${f.key}`"
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
            :id="`rec-${f.key}`"
            v-model="formCallRecording[f.key]"
            :label="f.label"
            :help-pkey="f.helpPkey ?? f.key"
            :yes-value="f.options[0]"
            :no-value="f.options[1]"
          />
          <FormSelect
            v-else-if="f.type === 'pill'"
            :id="`rec-${f.key}`"
            v-model="formCallRecording[f.key]"
            :label="f.label"
            :help-pkey="f.helpPkey ?? f.key"
            :options="f.options"
            :required="false"
          />
          <FormField
            v-else-if="f.type === 'number'"
            :id="`rec-${f.key}`"
            v-model="formCallRecording[f.key]"
            :label="f.label"
            :help-pkey="f.helpPkey ?? f.key"
            type="number"
            :placeholder="f.placeholder || 'number'"
          />
          <FormField
            v-else
            :id="`rec-${f.key}`"
            v-model="formCallRecording[f.key]"
            :label="f.label"
            :help-pkey="f.helpPkey ?? f.key"
            type="text"
            :placeholder="f.placeholder || ''"
          />
        </template>
      </div>

      <h2 class="detail-heading">Monitoring &amp; hot desk</h2>
      <div class="form-fields">
        <template v-for="f in MONITORING_FIELDS" :key="f.key">
          <FormField
            v-if="f.type === 'number'"
            :id="`mon-${f.key}`"
            v-model="formMonitoring[f.key]"
            :label="f.label"
            :help-pkey="f.helpPkey ?? f.key"
            type="number"
            :placeholder="f.placeholder || 'number'"
          />
          <FormField
            v-else
            :id="`mon-${f.key}`"
            v-model="formMonitoring[f.key]"
            :label="f.label"
            :help-pkey="f.helpPkey ?? f.key"
            type="text"
            :placeholder="f.placeholder || ''"
          />
        </template>
      </div>

      <h2 class="detail-heading">Call control</h2>
      <div class="form-fields">
        <template v-for="f in CALL_CONTROL_FIELDS" :key="f.key">
          <FormToggle
            v-if="f.type === 'boolean'"
            :id="`cc-${f.key}`"
            v-model="formCallControl[f.key]"
            :label="f.label"
            :help-pkey="f.helpPkey ?? f.key"
            yes-value="YES"
            no-value="NO"
          />
          <FormToggle
            v-else-if="f.type === 'pill' && f.options && f.options.length === 2"
            :id="`cc-${f.key}`"
            v-model="formCallControl[f.key]"
            :label="f.label"
            :help-pkey="f.helpPkey ?? f.key"
            :yes-value="f.options[0]"
            :no-value="f.options[1]"
          />
          <FormSelect
            v-else-if="f.type === 'pill'"
            :id="`cc-${f.key}`"
            v-model="formCallControl[f.key]"
            :label="f.label"
            :help-pkey="f.helpPkey ?? f.key"
            :options="f.options"
            :required="false"
          />
          <FormField
            v-else-if="f.type === 'number'"
            :id="`cc-${f.key}`"
            v-model="formCallControl[f.key]"
            :label="f.label"
            :help-pkey="f.helpPkey ?? f.key"
            type="number"
            :placeholder="f.placeholder || 'number'"
          />
          <FormField
            v-else
            :id="`cc-${f.key}`"
            v-model="formCallControl[f.key]"
            :label="f.label"
            :help-pkey="f.helpPkey ?? f.key"
            type="text"
            :placeholder="f.placeholder || ''"
          />
        </template>
      </div>

      <h2 class="detail-heading">LDAP</h2>
      <div class="form-fields">
        <template v-for="f in LDAP_FIELDS" :key="f.key">
          <FormToggle
            v-if="f.type === 'boolean'"
            :id="`ldap-${f.key}`"
            v-model="formLdap[f.key]"
            :label="f.label"
            :help-pkey="f.helpPkey ?? f.key"
            yes-value="YES"
            no-value="NO"
          />
          <FormToggle
            v-else-if="f.type === 'pill' && f.options && f.options.length === 2"
            :id="`ldap-${f.key}`"
            v-model="formLdap[f.key]"
            :label="f.label"
            :help-pkey="f.helpPkey ?? f.key"
            :yes-value="f.options[0]"
            :no-value="f.options[1]"
          />
          <FormSelect
            v-else-if="f.type === 'pill'"
            :id="`ldap-${f.key}`"
            v-model="formLdap[f.key]"
            :label="f.label"
            :help-pkey="f.helpPkey ?? f.key"
            :options="f.options"
            :required="false"
          />
          <FormField
            v-else-if="f.type === 'number'"
            :id="`ldap-${f.key}`"
            v-model="formLdap[f.key]"
            :label="f.label"
            :help-pkey="f.helpPkey ?? f.key"
            type="number"
            :placeholder="f.placeholder || 'number'"
          />
          <FormField
            v-else
            :id="`ldap-${f.key}`"
            v-model="formLdap[f.key]"
            :label="f.label"
            :help-pkey="f.helpPkey ?? f.key"
            type="text"
            :placeholder="f.placeholder || ''"
          />
        </template>
      </div>

      <div class="actions">
        <button type="submit" :disabled="loading">
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
.actions button[type='submit'] {
  color: #fff;
  background: #2563eb;
  border: none;
}
.actions button[type='submit']:hover:not(:disabled) {
  background: #1d4ed8;
}
.actions button[type='submit']:disabled {
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

.auto-host-note {
  margin: 0.25rem 0 0 0;
  font-size: 0.8125rem;
  line-height: 1.45;
  color: #64748b;
}

.auto-host-note code {
  font-size: 0.8125rem;
  background: #f1f5f9;
  padding: 0.1rem 0.35rem;
  border-radius: 0.25rem;
}

.auto-host-note-warn {
  color: #b45309;
}

.auto-host-note-warn a {
  color: #2563eb;
  font-weight: 500;
}
</style>
