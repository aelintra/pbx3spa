<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useToastStore } from '@/stores/toast'
import { useFormValidation, validateAll, focusFirstError } from '@/composables/useFormValidation'
import { validateTenantPkey } from '@/utils/validation'
import FormField from '@/components/forms/FormField.vue'
import FormSelect from '@/components/forms/FormSelect.vue'
import FormToggle from '@/components/forms/FormToggle.vue'

const router = useRouter()
const toast = useToastStore()
const pkey = ref('')
const description = ref('')
const clusterclid = ref('')
const abstimeout = ref('14400')
const chanmax = ref('30')
const masteroclo = ref('AUTO')
const error = ref('')
const loading = ref(false)
const pkeyInput = ref(null)

// Field-level validation (refs declared before composable)
const pkeyValidation = useFormValidation(pkey, validateTenantPkey)

// Defaults from database create SQL: pbx3/pbx3-1/opt/pbx3/db/db_sql/sqlite_create_tenant.sql (cluster table)
// and pbx3api app/Models/Tenant.php $attributes. Preset create form so users see DB defaults.
const CLUSTER_CREATE_DEFAULTS = {
  allow_hash_xfer: 'enabled',
  callrecord1: 'None',
  cfwdextern_rule: 'YES',
  cfwd_progress: 'enabled',
  cfwd_answer: 'enabled',
  countrycode: '44',
  dynamicfeatures: '',
  emergency: '',
  int_ring_delay: '20',
  ivr_key_wait: '6',
  ivr_digit_wait: '6000',
  language: 'en-gb',
  ldapbase: 'dc=sark,dc=local',
  ldaphost: '127.0.0.1',
  ldapou: 'contacts',
  ldapuser: 'admin',
  ldappass: 'sarkadmin',
  ldaptls: 'off',
  localarea: '',
  localdplan: '',
  lterm: false,
  leasedhdtime: '43200',
  max_in: '30',
  monitor_out: '/var/spool/asterisk/monout/',
  operator: '100',
  pickupgroup: '',
  play_beep: true,
  play_busy: true,
  play_congested: true,
  play_transfer: true,
  rec_age: '60',
  rec_final_dest: '',
  rec_file_dlim: '_-_',
  rec_grace: '5',
  rec_limit: '',
  rec_mount: '',
  recmaxage: '60',
  recmaxsize: '0',
  recused: '0',
  ringdelay: '20',
  routeoverride: '',
  spy_pass: '3333',
  sysop: '',
  syspass: '4444',
  usemohcustom: '',
  vmail_age: '60',
  voice_instr: true,
  voip_max: '30'
}

// Advanced fields: same keys as API updateableColumns (excluding Identity + Settings)
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
// Store boolean as 'YES'/'NO' so we can use FormSelect (one row per field)
const formAdvanced = reactive(
  Object.fromEntries(ADVANCED_KEYS.map((k) => {
    const def = CLUSTER_CREATE_DEFAULTS[k]
    if (def === true || def === false) return [k, def ? 'YES' : 'NO']
    return [k, def != null ? def : '']
  }))
)

// Field config for Advanced: label and type (text, number, select, pill, boolean).
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

function fieldErrors(err) {
  if (!err?.data || typeof err.data !== 'object') return null
  const entries = Object.entries(err.data).filter(([, v]) => Array.isArray(v) && v.length)
  return entries.length ? Object.fromEntries(entries) : null
}

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
      if (v === true || v === false) out[f.key] = v
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

async function onSubmit(e) {
  e.preventDefault()
  error.value = ''

  const validations = [
    { ...pkeyValidation, fieldId: 'pkey' }
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
      description: description.value.trim(),
      ...(parseNum(clusterclid.value) !== undefined && { clusterclid: parseNum(clusterclid.value) }),
      ...(parseNum(abstimeout.value) !== undefined && { abstimeout: parseNum(abstimeout.value) }),
      ...(parseNum(chanmax.value) !== undefined && { chanmax: parseNum(chanmax.value) }),
      ...(masteroclo.value.trim() && { masteroclo: masteroclo.value.trim() }),
      ...buildAdvancedPayload()
    }
    const cleaned = Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined && v !== ''))
    const tenant = await getApiClient().post('tenants', cleaned)
    toast.show(`Tenant ${tenant.pkey} created`)
    router.push({ name: 'tenant-detail', params: { pkey: tenant.pkey } })
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
  router.push({ name: 'tenants' })
}

function onKeydown(e) {
  if (e.key === 'Escape') {
    e.preventDefault()
    goBack()
  }
}

onMounted(() => {
  nextTick().then(() => pkeyInput.value?.focus())
})
</script>

<template>
  <div class="create-view">
    <h1>Create tenant</h1>

    <form class="form create-form" @submit="onSubmit" @keydown="onKeydown">
      <p v-if="error" id="tenant-create-error" class="error" role="alert">{{ error }}</p>

      <h2 class="detail-heading">Identity</h2>
      <div class="form-fields">
        <FormField
          id="pkey"
          ref="pkeyInput"
          v-model="pkey"
          label="Name"
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
      </div>

      <h2 class="detail-heading">Settings</h2>
      <div class="form-fields">
        <FormField
          id="clusterclid"
          v-model="clusterclid"
          label="CLID"
          type="number"
          placeholder="integer"
        />
        <FormField
          id="abstimeout"
          v-model="abstimeout"
          label="Abstime"
          type="number"
          placeholder="integer"
        />
        <FormField
          id="chanmax"
          v-model="chanmax"
          label="ChanMax"
          type="number"
          placeholder="integer"
        />
        <FormSelect
          id="masteroclo"
          v-model="masteroclo"
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
              :id="`adv-${f.key}`"
              v-model="formAdvanced[f.key]"
              :label="f.label"
              yes-value="YES"
              no-value="NO"
            />
            <FormSelect
              v-else-if="f.type === 'pill'"
              :id="`adv-${f.key}`"
              v-model="formAdvanced[f.key]"
              :label="f.label"
              :options="f.options"
              :required="false"
              empty-text=""
            />
            <FormField
              v-else-if="f.type === 'number'"
              :id="`adv-${f.key}`"
              v-model="formAdvanced[f.key]"
              :label="f.label"
              type="number"
              :placeholder="f.placeholder || 'number'"
            />
            <FormField
              v-else
              :id="`adv-${f.key}`"
              v-model="formAdvanced[f.key]"
              :label="f.label"
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
.advanced-fields {
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
