/**
 * Normalize API list responses to a single array.
 * Handles: direct array, { data: [] }, { resourceKey: [] }, numeric-keyed object.
 *
 * @param {*} response - Raw API response
 * @param {string} [resourceKey] - Optional key to try (e.g. 'tenants', 'ivrs', 'extensions')
 * @returns {Array} Always an array (possibly empty)
 */
export function normalizeList(response, resourceKey = null) {
  if (Array.isArray(response)) return response
  if (response && typeof response === 'object') {
    if (Array.isArray(response.data)) return response.data
    if (resourceKey && Array.isArray(response[resourceKey])) return response[resourceKey]
    if (Object.keys(response).every((k) => /^\d+$/.test(k))) return Object.values(response)
  }
  return []
}
