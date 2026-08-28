/**
 * SIP password display state for the extension detail view's "SIP Password" field.
 * Masked by default (bullet glyphs in a text input); cleartext after Show / Copy / regen.
 *
 * Never use input type=password here — Safari/Chrome treat username+password in a
 * submitted form as a Keychain/login save candidate (SIP User + SIP Password).
 */

/** @param {unknown} passwd */
export function sipPasswordFieldValue(passwd) {
  return passwd != null ? String(passwd) : ''
}

/**
 * Always `text` so password managers do not treat this as a site login secret.
 * @param {boolean} _revealed
 * @param {boolean} _hasPassword
 */
export function sipPasswordFieldType(_revealed, _hasPassword) {
  return 'text'
}

/**
 * @param {string} value
 * @returns {string}
 */
export function sipPasswordMaskDisplay(value) {
  if (!value) return ''
  return '•'.repeat(Math.min(Math.max(value.length, 8), 24))
}

/**
 * @param {unknown} passwd
 * @param {boolean} revealed - true when operator clicked Show/Copy or after regenerate
 * @returns {{ value: string, type: 'text', placeholder: string }}
 */
export function maskSipPassword(passwd, revealed) {
  const value = sipPasswordFieldValue(passwd)
  if (!value) {
    return { value: '', type: 'text', placeholder: '—' }
  }
  return {
    value: revealed ? value : sipPasswordMaskDisplay(value),
    type: 'text',
    placeholder: ''
  }
}
