/**
 * SIP password display state for the extension detail view's "SIP Password" field.
 * Masked by default (`type=password`); only shown in cleartext right after a
 * successful regenerate, since the operator needs to copy the new value into
 * the phone before it can register again (PRE_RELEASE_SAFETY_DEBT #15).
 */

/** @param {unknown} passwd */
export function sipPasswordFieldValue(passwd) {
  return passwd != null ? String(passwd) : ''
}

/**
 * @param {boolean} revealed
 * @param {boolean} hasPassword
 */
export function sipPasswordFieldType(revealed, hasPassword) {
  return revealed && hasPassword ? 'text' : 'password'
}

/**
 * @param {unknown} passwd
 * @param {boolean} revealed - true only immediately after a successful regenerate
 * @returns {{ value: string, type: 'text'|'password', placeholder: string }}
 */
export function maskSipPassword(passwd, revealed) {
  const value = sipPasswordFieldValue(passwd)
  return {
    value,
    type: sipPasswordFieldType(revealed, value !== ''),
    placeholder: value ? '' : '—'
  }
}
