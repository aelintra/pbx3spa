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
 * Asterisk extension: digits, pattern _XZN.!, or special s|i|t. Single "0" not allowed.
 */
export function validateInboundRoutePkey(value) {
  if (!value || !String(value).trim()) {
    return 'Number (DiD/CLiD) is required'
  }
  const trimmed = String(value).trim()
  if (trimmed === '0') {
    return 'Number cannot be a single 0'
  }
  if (!/^(\d+|_[XZN.!]+|[sit])$/.test(trimmed)) {
    return 'Must be a valid Asterisk extension: digits, pattern _XZN.! (e.g. _2XXX), or s/i/t'
  }
  return null
}

/**
 * Validate Inbound Route DDI type (carrier)
 * Must be DiD or CLID
 */
export function validateInboundCarrier(value) {
  if (!value || !String(value).trim()) {
    return 'DDI type is required'
  }
  const v = String(value).trim()
  if (v !== 'DiD' && v !== 'CLID') {
    return 'Must be DiD or CLID'
  }
  return null
}

/**
 * Validate Greeting Number
 * Optional, but if provided must be valid integer >= 0
 */
export function validateGreetnum(value) {
  if (!value || value === '') {
    return null // Optional field
  }
  const num = parseInt(value, 10)
  if (isNaN(num) || num < 0) {
    return 'Must be a valid greeting number'
  }
  return null
}
