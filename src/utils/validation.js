/**
 * Validation rules for form fields
 */

/**
 * Validate IVR Direct Dial (pkey)
 * Must be 3-5 numeric digits
 */
export function validateIvrPkey(value) {
  if (!value || !value.trim()) {
    return 'IVR Direct Dial is required'
  }
  const trimmed = value.trim()
  if (!/^\d{3,5}$/.test(trimmed)) {
    return 'Must be 3-5 numeric digits'
  }
  return null
}

/**
 * Validate Tenant (cluster)
 * Must not be empty
 */
export function validateTenant(value) {
  if (!value || !value.trim()) {
    return 'Tenant is required'
  }
  return null
}

/**
 * Validate Tenant name (pkey) for create
 * Required, non-empty
 */
export function validateTenantPkey(value) {
  if (!value || !value.trim()) {
    return 'Tenant name is required'
  }
  return null
}

/**
 * Validate Queue number (pkey) for create/edit
 * Required, 3-5 digits, unique per tenant (uniqueness enforced by API)
 */
export function validateQueuePkey(value) {
  if (!value || !value.trim()) {
    return 'Queue number is required'
  }
  const trimmed = value.trim()
  if (!/^\d{3,5}$/.test(trimmed)) {
    return 'Must be 3-5 digits'
  }
  return null
}

/**
 * Validate Route name (pkey) for create
 * Required, non-empty
 */
export function validateRoutePkey(value) {
  if (!value || !value.trim()) {
    return 'Route name is required'
  }
  return null
}

/**
 * Validate Trunk name (pkey) for create
 * Required, non-empty
 */
export function validateTrunkPkey(value) {
  if (!value || !value.trim()) {
    return 'Trunk name is required'
  }
  return null
}

/**
 * Validate dial prefix digits (pkey) — 2–4 numeric digits
 */
export function validateDialPrefixPkey(value) {
  if (!value || !value.trim()) {
    return 'Prefix is required'
  }
  const trimmed = value.trim()
  if (!/^\d{2,4}$/.test(trimmed)) {
    return 'Must be 2–4 numeric digits'
  }
  return null
}

/**
 * Normalize pasted host/URL → tenant FQDN candidate (lowercase).
 * @param {string} raw
 * @returns {string}
 */
export function normalizeTenantFqdnInput(raw) {
  let s = String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
  if (!s) return ''
  if (s.includes('://')) {
    try {
      s = new URL(s).hostname
    } catch {
      s = s.replace(/^[a-z][a-z0-9+.-]*:\/\//, '').split('/')[0] ?? s
    }
  } else if (s.includes('/') && !s.includes(' ')) {
    s = s.split('/')[0] ?? s
  }
  if (s.includes('@')) {
    s = s.split('@').pop() ?? s
  }
  s = s.replace(/:\d+$/, '').replace(/\.$/, '')
  return s
}

/**
 * Target tenant FQDN for dial prefixes (Q14) — full multi-label host, not bare shortuid.
 */
export function validateTargetTenantFqdn(value) {
  if (!value || !String(value).trim()) {
    return 'Target tenant FQDN is required'
  }
  const fqdn = normalizeTenantFqdnInput(value)
  if (!fqdn.includes('.')) {
    return 'Enter a full tenant FQDN (e.g. sister.pbx3.com), not a shortuid'
  }
  if (!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(fqdn)) {
    return 'Invalid FQDN'
  }
  return null
}

/**
 * Validate Extension number (pkey) for create
 * Required, non-empty
 */
export function validateExtensionPkey(value) {
  if (!value || !value.trim()) {
    return 'Extension number is required'
  }
  return null
}

/**
 * Validate Agent pkey for create
 * Required, integer 1000–9999
 */
export function validateAgentPkey(value) {
  if (value === '' || value == null) return 'Agent number is required'
  const num = parseInt(value, 10)
  if (isNaN(num) || num < 1000 || num > 9999) return 'Must be 1000–9999'
  return null
}

/**
 * Validate Agent passwd
 * Required, integer 1001–9999 (API min is 1001)
 */
export function validateAgentPasswd(value) {
  if (value === '' || value == null) return 'Password is required'
  const num = parseInt(value, 10)
  if (isNaN(num) || num < 1001 || num > 9999) return 'Must be 1001–9999'
  return null
}

/**
 * Validate Agent name (alpha_dash: letters, numbers, underscore, hyphen)
 * Required, non-empty
 */
export function validateAgentName(value) {
  if (!value || !value.trim()) return 'Name is required'
  return null
}

/**
 * Validate Route dialplan
 * Required; route will not work without it (e.g. _XXXXXX)
 */
export function validateDialplan(value) {
  if (!value || !value.trim()) {
    return 'Dialplan is required (e.g. _XXXXXX)'
  }
  return null
}

/**
 * Validate Inbound Route Number (DiD/CLiD pkey)
 * Digits, optional leading + (E.164), pattern _XZN.!, or special s|i|t. Single "0" not allowed.
 */
export function validateInboundRoutePkey(value) {
  if (!value || !String(value).trim()) {
    return 'Number (DiD/CLiD) is required'
  }
  const trimmed = String(value).trim()
  if (trimmed === '0') {
    return 'Number cannot be a single 0'
  }
  if (!/^(\+?\d+|_[XZN.!]+|[sit])$/.test(trimmed)) {
    return 'Must be digits (optional + for E.164), pattern _XZN.! (e.g. _2XXX), or s/i/t'
  }
  return null
}

/**
 * Validate Inbound Route DDI type (carrier / technology)
 * Must be DiD, CLiD, or Class
 */
export function validateInboundCarrier(value) {
  if (!value || !String(value).trim()) {
    return 'DiD Type is required'
  }
  const v = String(value).trim()
  if (v !== 'DiD' && v !== 'CLiD' && v !== 'Class') {
    return 'Must be DiD, CLiD, or Class'
  }
  return null
}

/** Day-parts mode: lowercase letter then alnum/underscore/hyphen, max 32. Empty OK when allowEmpty. */
export const SCHEDULE_MODE_REGEX = /^[a-z][a-z0-9_-]{0,31}$/

export const COMMON_SCHEDULE_MODES = ['open', 'closed', 'lunch', 'night', 'break']

/** Day-of-week order Mon→Sun (matches Asterisk / pbx3-schedule). */
export const DOW_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

/**
 * Normalize dayofweek: trim + lowercase; empty → '*'.
 * @param {string|null|undefined} value
 */
export function normalizeDayOfWeek(value) {
  const s = value == null ? '' : String(value).trim().toLowerCase()
  return s === '' ? '*' : s
}

/**
 * *, single dow, or forward range start-end (no wrap).
 * @param {string|null|undefined} value
 * @param {{ allowEmpty?: boolean }} [opts]
 * @returns {string|null} error message or null
 */
export function validateDayOfWeek(value, opts = {}) {
  const { allowEmpty = false } = opts
  const raw = value == null ? '' : String(value).trim()
  if (raw === '') {
    return allowEmpty ? null : 'Day of week is required'
  }
  const s = normalizeDayOfWeek(raw)
  if (s === '*') return null
  const idx = Object.fromEntries(DOW_ORDER.map((d, i) => [d, i]))
  if (Object.prototype.hasOwnProperty.call(idx, s)) return null
  const m = /^([a-z]{3})-([a-z]{3})$/.exec(s)
  if (!m) {
    return 'Use *, a day (mon…sun), or a forward range (e.g. mon-fri)'
  }
  const a = m[1]
  const b = m[2]
  if (!Object.prototype.hasOwnProperty.call(idx, a) || !Object.prototype.hasOwnProperty.call(idx, b)) {
    return 'Day range must use mon…sun'
  }
  if (idx[a] >= idx[b]) {
    return 'Day range must run forward Mon→Sun (e.g. mon-thu); wrap-around (tue-mon) is not allowed'
  }
  return null
}

/**
 * Friendly label for list/select.
 * @param {string|null|undefined} dow
 */
export function dayOfWeekLabel(dow) {
  const s = normalizeDayOfWeek(dow)
  if (s === '*') return 'Every day'
  const m = /^([a-z]{3})-([a-z]{3})$/.exec(s)
  if (m) {
    const a = m[1].charAt(0).toUpperCase() + m[1].slice(1)
    const b = m[2].charAt(0).toUpperCase() + m[2].slice(1)
    return `${a}–${b}`
  }
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/**
 * @param {string|null|undefined} value
 * @param {{ allowEmpty?: boolean }} [opts]
 */
export function validateScheduleMode(value, opts = {}) {
  const { allowEmpty = false } = opts
  const m = value == null ? '' : String(value).trim().toLowerCase()
  if (m === '') {
    return allowEmpty ? null : 'Mode is required'
  }
  if (!SCHEDULE_MODE_REGEX.test(m)) {
    return 'Mode must be lowercase word (e.g. open, closed, lunch)'
  }
  return null
}

/**
 * @param {string|number|null|undefined} value
 * @param {{ allowEmpty?: boolean }} [opts]
 */
export function validateSchedulePriority(value, opts = {}) {
  const { allowEmpty = true } = opts
  if (value === null || value === undefined || String(value).trim() === '') {
    return allowEmpty ? null : 'Priority is required'
  }
  const n = Number(value)
  if (!Number.isInteger(n) || n < 0 || n > 9999) {
    return 'Priority must be an integer 0–9999'
  }
  return null
}

/**
 * Validate Greeting Number
 * Optional, but if provided must be valid integer >= 0
 */
export function validateGreetnum(value) {
  if (value === 'None' || !value || value === '') {
    return null // Optional field
  }
  const trimmed = String(value).trim()
  if (!/^\d{4}$/.test(trimmed)) {
    return 'Must be a 4-digit greeting number'
  }
  return null
}

/**
 * Validate Custom App name (pkey / context)
 * alpha_dash: letters, numbers, underscore, hyphen (no spaces)
 */
export function validateCustomAppPkey(value) {
  if (!value || !String(value).trim()) {
    return 'App name is required'
  }
  const trimmed = String(value).trim()
  if (!/^[0-9a-zA-Z_-]+$/.test(trimmed)) {
    return 'Must be letters, numbers, underscore, or hyphen (no spaces)'
  }
  return null
}

/**
 * Validate Device template name (pkey)
 * letters, numbers, underscore, hyphen (no spaces)
 */
export function validateDevicePkey(value) {
  if (!value || !String(value).trim()) {
    return 'Template name is required'
  }
  const trimmed = String(value).trim()
  if (!/^[0-9a-zA-Z_-]+$/.test(trimmed)) {
    return 'Must be letters, numbers, underscore, or hyphen (no spaces)'
  }
  return null
}

/**
 * Validate Conference room number (pkey)
 * Required, positive integer, unique per tenant (uniqueness enforced by API)
 */
export function validateConferencePkey(value) {
  if (value === '' || value == null) return 'Room number is required'
  const num = parseInt(value, 10)
  if (isNaN(num) || num < 1) return 'Must be a positive number'
  return null
}

/**
 * Validate Class of Service key (pkey) - letters, numbers, underscore, hyphen
 * Required, unique per tenant (uniqueness enforced by API)
 */
export function validateCosPkey(value) {
  if (value === '' || value == null) return 'CoS key is required'
  const s = String(value).trim()
  if (!s) return 'CoS key is required'
  if (!/^[a-zA-Z0-9_-]+$/.test(s))
    return 'Must be letters, numbers, underscore, or hyphen (no spaces)'
  return null
}

/**
 * Validate Greeting number (pkey)
 * Required, positive integer, unique per tenant (uniqueness enforced by API)
 */
export function validateGreetingPkey(value) {
  if (value === '' || value == null) return 'Greeting number is required'
  const num = parseInt(value, 10)
  if (isNaN(num) || num < 1) return 'Must be a positive number'
  return null
}

/**
 * Validate Help message key (pkey) for tt_help_core
 * letters, numbers, underscore, hyphen (no spaces)
 */
export function validateHelpCorePkey(value) {
  if (!value || !String(value).trim()) {
    return 'Message key is required'
  }
  const trimmed = String(value).trim()
  if (!/^[0-9a-zA-Z_-]+$/.test(trimmed)) {
    return 'Must be letters, numbers, underscore, or hyphen (no spaces)'
  }
  return null
}
