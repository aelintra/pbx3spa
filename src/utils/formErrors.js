/**
 * Map API validation errors to a field-keyed object.
 * Use in Create/Edit views to show field-level or first error message.
 *
 * @param {*} err - Caught error (e.g. from getApiClient().post/put)
 * @returns {Object<string, string[]> | null} e.g. { pkey: ['Must be 3-5 digits'], cluster: ['Required'] } or null
 */
export function fieldErrors(err) {
  if (!err?.data || typeof err.data !== 'object') return null
  const entries = Object.entries(err.data).filter(([, v]) => Array.isArray(v) && v.length)
  return entries.length ? Object.fromEntries(entries) : null
}

/**
 * Get the first error message from fieldErrors, or a fallback.
 * For 404, returns a friendly "Not found" when the API doesn't provide a message.
 * @param {*} err - Caught error
 * @param {string} fallback - e.g. 'Failed to save'
 * @returns {string}
 */
export function firstErrorMessage(err, fallback = '') {
  if (err?.status === 404) {
    const msg = err?.data?.message ?? err?.data?.Error ?? err?.message
    if (msg && typeof msg === 'string') return msg
    return 'Not found'
  }
  const errors = fieldErrors(err)
  if (errors) {
    const first = Object.values(errors).flat().find((m) => typeof m === 'string')
    if (first) return first
  }
  return err?.data?.message ?? err?.data?.Error ?? err?.message ?? fallback
}
