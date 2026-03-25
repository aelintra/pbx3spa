/**
 * Shared tenant (cluster) advanced fields config.
 * Used by TenantCreateView and TenantDetailView so we don't duplicate keys, defaults, or payload logic.
 * Defaults align with pbx3 db_sql/sqlite_create_tenant.sql and pbx3api Tenant model.
 */

// Defaults from database create SQL (cluster table) and API model $attributes.
export const CLUSTER_CREATE_DEFAULTS = {
  abstimeout: '14400',
  masteroclo: 'AUTO',
  allow_hash_xfer: 'enabled',
  callrecord_1: 'None',
  cfwd_progress: 'enabled',
  cfwd_answer: 'enabled',
  countrycode: '44',
  emergency: '',
  ivr_key_wait: '6',
  ivr_digit_wait: '6000',
  language: 'en-gb',
  ldapbase: 'dc=sark,dc=local',
  ldaphost: '127.0.0.1',
  ldapou: 'contacts',
  ldapuser: 'admin',
  ldappass: 'sarkadmin',
  ldaptls: 'off',
  ldapanonbind: 'YES',
  localarea: '',
  localdplan: '',
  lterm: false,
  maxin: '30',
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
  recused: '0',
  ringdelay: '20',
  spy_pass: '3333',
  sysop: '',
  syspass: '4444',
  usemohcustom: '',
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
  { key: 'masteroclo', label: 'Timer status', type: 'segmented', options: ['AUTO', 'CLOSED'] }
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
  'recused'
]

export const CALL_RECORDING_FIELDS = [
  { key: 'callrecord_1', label: 'Call record 1', type: 'pill', options: ['None', 'In', 'Out', 'Both'] },
  { key: 'rec_age', label: 'Rec age', type: 'number' },
  { key: 'rec_final_dest', label: 'Rec final dest', type: 'text' },
  { key: 'rec_file_dlim', label: 'Rec file dlim', type: 'text' },
  { key: 'rec_grace', label: 'Rec grace', type: 'number' },
  { key: 'rec_limit', label: 'Rec limit', type: 'readonly' },
  { key: 'recmaxage', label: 'Rec max age', type: 'number' },
  { key: 'recmaxsize', label: 'Rec max size', type: 'number' },
  { key: 'recused', label: 'Rec used', type: 'number' }
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
  { key: 'allow_hash_xfer', label: 'Allow hash transfer', type: 'pill', options: ['enabled', 'disabled'] },
  { key: 'cfwd_progress', label: 'CFWD progress', type: 'pill', options: ['enabled', 'disabled'] },
  { key: 'cfwd_answer', label: 'CFWD answer', type: 'pill', options: ['enabled', 'disabled'] },
  { key: 'lterm', label: 'Lterm', type: 'boolean' },
  { key: 'play_beep', label: 'Play beep', type: 'boolean' },
  { key: 'play_busy', label: 'Play busy', type: 'boolean' },
  { key: 'play_congested', label: 'Play congested', type: 'boolean' },
  { key: 'play_transfer', label: 'Play transfer', type: 'boolean' }
]

// LDAP section (rendered last in tenant create/detail).
export const LDAP_KEYS = [
  'ldapbase', 'ldaphost', 'ldapou', 'ldapuser', 'ldappass', 'ldaptls', 'ldapanonbind'
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
  'countrycode', 'emergency',
  'language',
  'operator',
  'spy_pass', 'sysop', 'syspass',
  'usemohcustom', 'vmail_age', 'voice_instr'
]

// Field config for Advanced section: label and type (text, number, pill, boolean).
export const ADVANCED_FIELDS = [
  { key: 'countrycode', label: 'Country code', type: 'number' },
  { key: 'emergency', label: 'Emergency', type: 'number' },
  { key: 'language', label: 'Language', type: 'text' },
  { key: 'operator', label: 'Operator', type: 'number' },
  { key: 'spy_pass', label: 'Spy pass', type: 'number', helpPkey: 'spypass' },
  { key: 'sysop', label: 'Sysop', type: 'number' },
  { key: 'syspass', label: 'Sys pass', type: 'number' },
  { key: 'usemohcustom', label: 'Use MOH custom', type: 'number' },
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

/**
 * Build initial advanced form state for Create view (from CLUSTER_CREATE_DEFAULTS).
 * Booleans become 'YES'/'NO'; other values stringified.
 */
export function buildInitialFormAdvanced() {
  return Object.fromEntries(ADVANCED_KEYS.map((k) => {
    const def = CLUSTER_CREATE_DEFAULTS[k]
    if (def === true || def === false) return [k, def ? 'YES' : 'NO']
    return [k, def != null ? def : '']
  }))
}

/**
 * Initial LDAP subsection state (same defaults source as advanced).
 */
export function buildInitialFormLdap() {
  return Object.fromEntries(LDAP_KEYS.map((k) => {
    const def = CLUSTER_CREATE_DEFAULTS[k]
    if (def === true || def === false) return [k, def ? 'YES' : 'NO']
    return [k, def != null ? def : '']
  }))
}

/**
 * Initial Call control subsection state.
 */
export function buildInitialFormCallControl() {
  return Object.fromEntries(CALL_CONTROL_KEYS.map((k) => {
    const def = CLUSTER_CREATE_DEFAULTS[k]
    if (def === true || def === false) return [k, def ? 'YES' : 'NO']
    return [k, def != null ? def : '']
  }))
}

/**
 * Initial Call recording subsection state.
 */
export function buildInitialFormCallRecording() {
  return Object.fromEntries(CALL_RECORDING_KEYS.map((k) => {
    const def = CLUSTER_CREATE_DEFAULTS[k]
    if (def === true || def === false) return [k, def ? 'YES' : 'NO']
    return [k, def != null ? def : '']
  }))
}

/**
 * Initial Timers subsection state.
 */
export function buildInitialFormTimers() {
  return Object.fromEntries(TIMERS_KEYS.map((k) => {
    const def = CLUSTER_CREATE_DEFAULTS[k]
    if (def === true || def === false) return [k, def ? 'YES' : 'NO']
    return [k, def != null ? def : '']
  }))
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

/**
 * Build API payload for advanced fields from form state (formAdvanced reactive object).
 */
export function buildAdvancedPayload(formAdvanced) {
  return buildPayloadFromFields(formAdvanced, ADVANCED_FIELDS)
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

/**
 * Build API payload for Timers fields from form state.
 */
export function buildTimersPayload(formTimers) {
  return buildPayloadFromFields(formTimers, TIMERS_FIELDS)
}
