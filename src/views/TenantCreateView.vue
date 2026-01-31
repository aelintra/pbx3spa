<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { getApiClient } from '@/api/client'
import { useToastStore } from '@/stores/toast'

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
const advancedOpen = ref(false)

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
const formAdvanced = reactive(
  Object.fromEntries(ADVANCED_KEYS.map((k) => [k, CLUSTER_CREATE_DEFAULTS[k] ?? '']))
)

// Field config for Advanced: label and type (text, number, select, pill, boolean).
// pill = short fixed-choice list rendered as segmented pill (switch-toggle switch-ios).
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
      if (v === 'true') out[f.key] = true
      if (v === 'false') out[f.key] = false
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
    // Omit undefined/empty so API doesn't receive them for optional
    const cleaned = Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined && v !== ''))
    const tenant = await getApiClient().post('tenants', cleaned)
    toast.show(`Tenant ${tenant.pkey} created`)
    router.push({ name: 'tenant-detail', params: { pkey: tenant.pkey } })
  } catch (err) {
    const errors = fieldErrors(err)
    if (errors) {
      const first = Object.values(errors).flat()[0]
      error.value = first || err.message
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
</script>

<template>
  <div>
    <p class="back">
      <button type="button" class="back-btn" @click="goBack">← Tenants</button>
    </p>
    <h1>Create tenant</h1>

    <form class="form create-form" @submit="onSubmit">
      <h2 class="detail-heading">Identity</h2>
      <label for="pkey">name</label>
      <input
        id="pkey"
        v-model="pkey"
        type="text"
        placeholder="e.g. mycluster"
        required
        autocomplete="off"
        class="edit-input"
      />
      <label for="description">description</label>
      <input
        id="description"
        v-model="description"
        type="text"
        placeholder="Short description"
        required
        class="edit-input"
      />

      <h2 class="detail-heading">Settings</h2>
      <label for="clusterclid">CLID</label>
      <input id="clusterclid" v-model="clusterclid" type="number" class="edit-input" placeholder="integer" />
      <label for="abstimeout">Abstime</label>
      <input id="abstimeout" v-model="abstimeout" type="number" class="edit-input" placeholder="integer" />
      <label for="chanmax">ChanMax</label>
      <input id="chanmax" v-model="chanmax" type="number" class="edit-input" placeholder="integer" />
      <label class="edit-label-block">Timer status</label>
      <div class="switch-toggle switch-ios">
        <input id="masteroclo-auto" type="radio" value="AUTO" v-model="masteroclo" />
        <label for="masteroclo-auto">AUTO</label>
        <input id="masteroclo-closed" type="radio" value="CLOSED" v-model="masteroclo" />
        <label for="masteroclo-closed">CLOSED</label>
      </div>

      <section class="detail-section create-advanced">
        <button type="button" class="collapse-trigger" :aria-expanded="advancedOpen" @click="advancedOpen = !advancedOpen">
          {{ advancedOpen ? '▼' : '▶' }} Advanced
        </button>
        <div v-show="advancedOpen" class="advanced-fields">
          <template v-for="f in ADVANCED_FIELDS" :key="f.key">
            <template v-if="f.type === 'boolean'">
              <label class="edit-label-block">{{ f.label }}</label>
              <div class="switch-toggle switch-ios">
                <input :id="`adv-${f.key}-true`" type="radio" :value="true" v-model="formAdvanced[f.key]" />
                <label :for="`adv-${f.key}-true`">YES</label>
                <input :id="`adv-${f.key}-false`" type="radio" :value="false" v-model="formAdvanced[f.key]" />
                <label :for="`adv-${f.key}-false`">NO</label>
              </div>
            </template>
            <template v-else-if="f.type === 'pill'">
              <label class="edit-label-block">{{ f.label }}</label>
              <div class="switch-toggle switch-ios">
                <template v-for="opt in f.options" :key="opt">
                  <input :id="`adv-${f.key}-${opt}`" type="radio" :value="opt" v-model="formAdvanced[f.key]" />
                  <label :for="`adv-${f.key}-${opt}`">{{ opt }}</label>
                </template>
              </div>
            </template>
            <template v-else-if="f.type === 'select'">
              <label :for="`adv-${f.key}`">{{ f.label }}</label>
              <select :id="`adv-${f.key}`" v-model="formAdvanced[f.key]" class="edit-input">
                <option value="">—</option>
                <option v-for="opt in f.options" :key="opt" :value="opt">{{ opt }}</option>
              </select>
            </template>
            <template v-else-if="f.type === 'number'">
              <label :for="`adv-${f.key}`">{{ f.label }}</label>
              <input
                :id="`adv-${f.key}`"
                v-model="formAdvanced[f.key]"
                type="number"
                class="edit-input"
                :placeholder="f.placeholder || 'number'"
              />
            </template>
            <template v-else>
              <label :for="`adv-${f.key}`">{{ f.label }}</label>
              <input
                :id="`adv-${f.key}`"
                v-model="formAdvanced[f.key]"
                type="text"
                class="edit-input"
                :placeholder="f.placeholder || ''"
              />
            </template>
          </template>
        </div>
      </section>

      <p v-if="error" class="error">{{ error }}</p>

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
.back {
  margin-bottom: 1rem;
}
.back-btn {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
  color: #64748b;
  background: transparent;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  cursor: pointer;
}
.back-btn:hover {
  color: #0f172a;
  background: #f1f5f9;
}
.form {
  margin-top: 1rem;
  max-width: 36rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.create-form .detail-heading {
  font-size: 1rem;
  font-weight: 600;
  color: #334155;
  margin: 1.25rem 0 0.5rem 0;
}
.create-form .detail-heading:first-of-type {
  margin-top: 0.5rem;
}
.form label {
  font-size: 0.875rem;
  font-weight: 500;
}
.edit-label-block {
  display: block;
  margin-bottom: 0.25rem;
}
.edit-input {
  padding: 0.5rem 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  font-size: 1rem;
}
.edit-input:focus {
  outline: none;
  border-color: #3b82f6;
}
.switch-toggle.switch-ios {
  display: flex;
  flex-wrap: wrap;
  background: #e2e8f0;
  border-radius: 0.5rem;
  padding: 0.25rem;
  gap: 0;
}
.switch-toggle.switch-ios input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}
.switch-toggle.switch-ios label {
  flex: 1;
  min-width: 0;
  margin: 0;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  text-align: center;
  cursor: pointer;
  border-radius: 0.375rem;
  color: #64748b;
}
.switch-toggle.switch-ios label:hover {
  color: #334155;
}
.switch-toggle.switch-ios input:checked + label {
  background: white;
  color: #0f172a;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}
.detail-section.create-advanced {
  margin-top: 1.5rem;
}
.collapse-trigger {
  display: block;
  width: 100%;
  padding: 0.5rem 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: #334155;
  background: transparent;
  border: none;
  border-bottom: 1px solid #e2e8f0;
  cursor: pointer;
  text-align: left;
}
.collapse-trigger:hover {
  color: #0f172a;
}
.advanced-fields {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.75rem;
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
