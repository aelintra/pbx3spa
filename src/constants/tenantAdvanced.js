/**
 * Shared tenant (cluster) advanced fields config.
 * Used by TenantCreateView and TenantDetailView so we don't duplicate keys, defaults, or payload logic.
 * Defaults and types align with pbx3 db_sql/sqlite_create_tenant.sql and pbx3api TenantController.
 *
 * Per-tenant settings live in API table `cluster` (GET/PUT /tenants/:id). Instance-wide defaults live in
 * `globals` (GET/PUT /sysglobals); overlap (e.g. maxin, voipmax) is instance vs tenant scope — edit tenants for per-tenant values.
 */

// Defaults from sqlite_create_tenant.sql (cluster) and Tenant $attributes where applicable.
export const CLUSTER_CREATE_DEFAULTS = {
  abstimeout: '14400',
  masteroclo: 'AUTO',
  allow_hash_xfer: 'enabled',
  callrecord_1: 'None',
  cfwd_progress: 'enabled',
  cfwd_answer: 'enabled',
  countrycode: '44',
  emergency: '999 112 911',
  ivr_key_wait: '6',
  ivr_digit_wait: '6000',
  language: 'en-gb',
  ldapbase: 'dc=pbx3,dc=local',
  ldaphost: '127.0.0.1',
  ldapou: 'contacts',
  ldapuser: 'admin',
  ldappass: 'pbx3admin',
  ldaptls: 'off',
  ldapanonbind: 'YES',
  leasedhdtime: '43200',
  localarea: '',
  localdplan: '',
  ext_len: '3',
  lterm: false,
  maxin: '30',
  mixmonitor: '',
  monitor_out: '/var/spool/asterisk/monout/',
  monitor_stage: '/var/spool/asterisk/monstage/',
  operator: '100',
  play_beep: true,
  play_busy: true,
  play_congested: true,
  play_transfer: true,
  rec_age: '60',
  rec_final_dest: '',
  rec_file_dlim: '_-_',
  rec_grace: '5',
  rec_limit: '',
  recmaxage: '60',
  recmaxsize: '0',
  rec_s3: 'NO',
  recused: '0',
  ringdelay: '20',
  spy_pass: '',
  sysop: '',
  syspass: '',
  usemohcustom: 'NO',
  vmail_age: '60',
  voice_instr: true,
  voip_max: '30'
}

// Timers (after Settings, before Advanced).
export const TIMERS_KEYS = [
  'abstimeout',
  'ringdelay',
  'ivr_key_wait',
  'ivr_digit_wait',
  'masteroclo'
]

export const TIMERS_FIELDS = [
  { key: 'abstimeout', label: 'Abstime', type: 'number' },
  { key: 'ringdelay', label: 'Ring delay', type: 'number' },
  { key: 'ivr_key_wait', label: 'IVR key wait', type: 'number' },
  { key: 'ivr_digit_wait', label: 'IVR digit wait', type: 'number' },
    {
    key: 'masteroclo',
    label: 'Master force',
    type: 'segmented',
    options: ['AUTO', 'CLOSED'],
    helpPkey: 'masterclose'
  }
]

// Call recording (after Advanced, before Call control).
export const CALL_RECORDING_KEYS = [
  'callrecord_1',
  'rec_age',
  'rec_final_dest',
  'rec_file_dlim',
  'rec_grace',
  'rec_limit',
  'recmaxage',
  'recmaxsize',
  'rec_s3',
  'recused'
]

// Monitor paths and hot-desk lease (cluster columns). mixmonitor column remains in DB but is not edited in SPA.
export const MONITORING_KEYS = ['monitor_out', 'monitor_stage', 'leasedhdtime']

export const MONITORING_FIELDS = [
  { key: 'monitor_out', label: 'Monitor out path', type: 'text' },
  { key: 'monitor_stage', label: 'Monitor stage path', type: 'text' },
  { key: 'leasedhdtime', label: 'Hot desk lease (seconds)', type: 'number' }
]

export const CALL_RECORDING_FIELDS = [
  {
    key: 'callrecord_1',
    label: 'Call record 1',
    type: 'pill',
    options: ['None', 'In', 'Out', 'Both']
  },
  { key: 'rec_age', label: 'Rec age', type: 'number' },
  { key: 'rec_final_dest', label: 'Rec final dest', type: 'text' },
  { key: 'rec_file_dlim', label: 'Rec file dlim', type: 'text' },
  { key: 'rec_grace', label: 'Rec grace', type: 'number' },
  { key: 'rec_limit', label: 'Rec limit', type: 'readonly' },
  { key: 'recmaxage', label: 'Rec max age', type: 'number' },
  { key: 'recmaxsize', label: 'Rec max size', type: 'number' },
  {
    key: 'rec_s3',
    label: 'S3 offload',
    type: 'pill',
    options: ['NO', 'YES'],
    helpPkey: 'recs3'
  },
  { key: 'recused', label: 'Rec used', type: 'readonly' }
]

// Call control (after Advanced, before LDAP).
export const CALL_CONTROL_KEYS = [
  'allow_hash_xfer',
  'cfwd_progress',
  'cfwd_answer',
  'lterm',
  'play_beep',
  'play_busy',
  'play_congested',
  'play_transfer'
]

export const CALL_CONTROL_FIELDS = [
  {
    key: 'allow_hash_xfer',
    label: 'Allow hash transfer',
    type: 'pill',
    options: ['enabled', 'disabled'],
    helpPkey: 'allow_hash_transfer'
  },
  { key: 'cfwd_progress', label: 'CFWD progress', type: 'pill', options: ['enabled', 'disabled'] },
  { key: 'cfwd_answer', label: 'CFWD answer', type: 'pill', options: ['enabled', 'disabled'] },
  { key: 'lterm', label: 'Lterm', type: 'boolean' },
  { key: 'play_beep', label: 'Play beep', type: 'boolean' },
  { key: 'play_busy', label: 'Play busy', type: 'boolean' },
  { key: 'play_congested', label: 'Play congested', type: 'boolean' },
  { key: 'play_transfer', label: 'Play transfer', type: 'boolean' }
]

// LDAP section — SPA UI parked 2026-08-26 (see workingdocs/LDAP_TENANT_PANEL_PARKED.md).
// Keep keys/fields/payload helpers so the panel can be rewired without rediscovery.
export const LDAP_KEYS = [
  'ldapbase',
  'ldaphost',
  'ldapou',
  'ldapuser',
  'ldappass',
  'ldaptls',
  'ldapanonbind'
]

export const LDAP_FIELDS = [
  { key: 'ldapbase', label: 'LDAP base', type: 'text' },
  { key: 'ldaphost', label: 'LDAP host', type: 'text' },
  { key: 'ldapou', label: 'LDAP OU', type: 'text' },
  { key: 'ldapuser', label: 'LDAP user', type: 'text' },
  { key: 'ldappass', label: 'LDAP pass', type: 'text' },
  { key: 'ldaptls', label: 'LDAP TLS', type: 'pill', options: ['on', 'off'] },
  { key: 'ldapanonbind', label: 'LDAP anon bind', type: 'pill', options: ['YES', 'NO'] }
]

// Advanced field keys (same order as API updateableColumns for advanced section).
export const ADVANCED_KEYS = [
  'countrycode',
  'emergency',
  'language',
  'operator',
  'spy_pass',
  'sysop',
  'syspass',
  'usemohcustom',
  'vmail_age',
  'voice_instr'
]

// Field config for Advanced section: label and type (text, number, pill, boolean).
export const ADVANCED_FIELDS = [
  { key: 'countrycode', label: 'Country code', type: 'number' },
  { key: 'emergency', label: 'Emergency numbers', type: 'text' },
  { key: 'language', label: 'Language', type: 'text' },
  { key: 'spy_pass', label: 'Spy pass', type: 'password', helpPkey: 'spypass' }, // type=password → FormField obscure (not input type=password)
  { key: 'operator', label: 'Operator', type: 'number', helpPkey: 'clustersysop' },
  { key: 'sysop', label: 'Sysop', type: 'number' },
  { key: 'syspass', label: 'Sys pass', type: 'password' }, // obscure via FormField; avoids Keychain
  { key: 'vmail_age', label: 'Vmail age', type: 'number' },
  { key: 'voice_instr', label: 'Voice instr', type: 'boolean' }
]

/**
 * Parse value to number; returns undefined for empty/invalid.
 */
export function parseNum(v) {
  if (v === '' || v == null) return undefined
  const n = Number(v)
  return isNaN(n) ? undefined : n
}

/** cluster integer flags (lterm, play_*, voice_instr): API/SQLite use 0/1, UI uses YES/NO. */
export function yesNoToApiInteger(v) {
  if (v === true || v === 'YES' || v === 1 || v === '1') return 1
  if (v === false || v === 'NO' || v === 0 || v === '0') return 0
  return undefined
}

export function apiIntegerToYesNo(v) {
  if (v === true || v === 1 || v === '1') return 'YES'
  if (v === false || v === 0 || v === '0') return 'NO'
  return ''
}

/** cluster columns stored as 0/1 but edited as YES/NO toggles */
export const API_INTEGER_FLAG_KEYS = new Set([
  'lterm',
  'play_beep',
  'play_busy',
  'play_congested',
  'play_transfer',
  'voice_instr'
])

/**
 * Build initial advanced form state for Create view (from CLUSTER_CREATE_DEFAULTS).
 * Booleans become 'YES'/'NO'; other values stringified.
 */
export function buildInitialFormAdvanced() {
  return Object.fromEntries(
    ADVANCED_KEYS.map((k) => {
      const def = CLUSTER_CREATE_DEFAULTS[k]
      if (def === true || def === false) return [k, def ? 'YES' : 'NO']
      return [k, def != null ? def : '']
    })
  )
}

/**
 * Initial LDAP subsection state (same defaults source as advanced).
 */
export function buildInitialFormLdap() {
  return Object.fromEntries(
    LDAP_KEYS.map((k) => {
      const def = CLUSTER_CREATE_DEFAULTS[k]
      if (def === true || def === false) return [k, def ? 'YES' : 'NO']
      return [k, def != null ? def : '']
    })
  )
}

/**
 * Initial Call control subsection state.
 */
export function buildInitialFormCallControl() {
  return Object.fromEntries(
    CALL_CONTROL_KEYS.map((k) => {
      const def = CLUSTER_CREATE_DEFAULTS[k]
      if (def === true || def === false) return [k, def ? 'YES' : 'NO']
      return [k, def != null ? def : '']
    })
  )
}

/**
 * Initial Call recording subsection state.
 */
export function buildInitialFormCallRecording() {
  return Object.fromEntries(
    CALL_RECORDING_KEYS.map((k) => {
      const def = CLUSTER_CREATE_DEFAULTS[k]
      if (def === true || def === false) return [k, def ? 'YES' : 'NO']
      return [k, def != null ? def : '']
    })
  )
}

export function buildInitialFormMonitoring() {
  return Object.fromEntries(
    MONITORING_KEYS.map((k) => {
      const def = CLUSTER_CREATE_DEFAULTS[k]
      if (def === true || def === false) return [k, def ? 'YES' : 'NO']
      return [k, def != null ? def : '']
    })
  )
}

/**
 * Initial Timers subsection state.
 */
export function buildInitialFormTimers() {
  return Object.fromEntries(
    TIMERS_KEYS.map((k) => {
      const def = CLUSTER_CREATE_DEFAULTS[k]
      if (def === true || def === false) return [k, def ? 'YES' : 'NO']
      return [k, def != null ? def : '']
    })
  )
}

/**
 * Build API payload slice from a form state object using a field-def list.
 */
function buildPayloadFromFields(formState, fieldDefs) {
  const out = {}
  for (const f of fieldDefs) {
    if (f.type === 'readonly') continue
    const v = formState[f.key]
    if (f.type === 'boolean') {
      const flag = yesNoToApiInteger(v)
      if (flag !== undefined) out[f.key] = flag
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

/**
 * Build API payload for advanced fields from form state (formAdvanced reactive object).
 */
export function buildAdvancedPayload(formAdvanced) {
  const out = buildPayloadFromFields(formAdvanced, ADVANCED_FIELDS)
  // Edited in Music-on-Hold section (not ADVANCED_FIELDS); always persist YES/NO.
  out.usemohcustom = formAdvanced.usemohcustom === 'YES' ? 'YES' : 'NO'
  return out
}

/**
 * Build API payload for LDAP fields from form state (formLdap reactive object).
 */
export function buildLdapPayload(formLdap) {
  return buildPayloadFromFields(formLdap, LDAP_FIELDS)
}

/**
 * Build API payload for Call control fields from form state.
 */
export function buildCallControlPayload(formCallControl) {
  return buildPayloadFromFields(formCallControl, CALL_CONTROL_FIELDS)
}

/**
 * Build API payload for Call recording fields from form state.
 */
export function buildCallRecordingPayload(formCallRecording) {
  return buildPayloadFromFields(formCallRecording, CALL_RECORDING_FIELDS)
}

export function buildMonitoringPayload(formMonitoring) {
  return buildPayloadFromFields(formMonitoring, MONITORING_FIELDS)
}

/**
 * Build API payload for Timers fields from form state.
 */
export function buildTimersPayload(formTimers) {
  return buildPayloadFromFields(formTimers, TIMERS_FIELDS)
}
