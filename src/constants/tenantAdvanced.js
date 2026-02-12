/**
 * Shared tenant (cluster) advanced fields config.
 * Used by TenantCreateView and TenantDetailView so we don't duplicate keys, defaults, or payload logic.
 * Defaults align with pbx3 db_sql/sqlite_create_tenant.sql and pbx3api Tenant model.
 */

// Defaults from database create SQL (cluster table) and API model $attributes.
export const CLUSTER_CREATE_DEFAULTS = {
  allow_hash_xfer: 'enabled',
  callrecord_1: 'None',
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
  ldapanonbind: 'YES',
  localarea: '',
  localdplan: '',
  lterm: false,
  leasedhdtime: '43200',
  maxin: '30',
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

// Advanced field keys (same order as API updateableColumns for advanced section).
export const ADVANCED_KEYS = [
  'allow_hash_xfer', 'callrecord_1', 'cfwdextern_rule', 'cfwd_progress', 'cfwd_answer',
  'countrycode', 'dynamicfeatures', 'emergency', 'int_ring_delay', 'ivr_key_wait', 'ivr_digit_wait',
  'language', 'ldapbase', 'ldaphost', 'ldapou', 'ldapuser', 'ldappass', 'ldaptls', 'ldapanonbind',
  'localarea', 'localdplan', 'lterm', 'leasedhdtime', 'maxin', 'monitor_out', 'operator',
  'pickupgroup', 'play_beep', 'play_busy', 'play_congested', 'play_transfer',
  'rec_age', 'rec_final_dest', 'rec_file_dlim', 'rec_grace', 'rec_limit', 'rec_mount',
  'recmaxage', 'recmaxsize', 'recused', 'ringdelay', 'routeoverride', 'spy_pass', 'sysop', 'syspass',
  'usemohcustom', 'vmail_age', 'voice_instr', 'voip_max'
]

// Field config for Advanced section: label and type (text, number, pill, boolean).
export const ADVANCED_FIELDS = [
  { key: 'allow_hash_xfer', label: 'Allow hash xfer', type: 'pill', options: ['enabled', 'disabled'] },
  { key: 'callrecord_1', label: 'Call record 1', type: 'pill', options: ['None', 'In', 'Out', 'Both'] },
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
  { key: 'ldapanonbind', label: 'LDAP anon bind', type: 'pill', options: ['YES', 'NO'] },
  { key: 'localarea', label: 'Local area', type: 'number' },
  { key: 'localdplan', label: 'Local dplan', type: 'text', placeholder: 'e.g. _X.' },
  { key: 'lterm', label: 'Lterm', type: 'boolean' },
  { key: 'leasedhdtime', label: 'Leased HD time', type: 'number' },
  { key: 'maxin', label: 'Max in', type: 'number' },
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
 * Build API payload for advanced fields from form state (formAdvanced reactive object).
 */
export function buildAdvancedPayload(formAdvanced) {
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
