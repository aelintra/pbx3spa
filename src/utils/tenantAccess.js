/**
 * Tenant-door login: typed shortuid must match the signed-in user's scope.
 */

/**
 * @param {unknown} user
 * @param {string} shortuid
 * @returns {boolean}
 */
export function userMayAccessTenantShortuid(user, shortuid) {
  const want = String(shortuid ?? '')
    .trim()
    .toLowerCase()
  if (!want || !user || typeof user !== 'object') return false

  const abilities = /** @type {{ abilities?: unknown }} */ (user).abilities
  if (Array.isArray(abilities) && abilities.includes('admin')) return true

  const allowed = /** @type {{ allowed_clusters?: unknown }} */ (user).allowed_clusters
  if (Array.isArray(allowed)) {
    for (const c of allowed) {
      if (String(c).trim().toLowerCase() === want) return true
    }
  }

  const details =
    /** @type {{ clusters?: unknown, allowed_cluster_details?: unknown }} */ (user).clusters ||
    /** @type {{ allowed_cluster_details?: unknown }} */ (user).allowed_cluster_details
  if (Array.isArray(details)) {
    for (const d of details) {
      if (!d || typeof d !== 'object') continue
      const row = /** @type {Record<string, unknown>} */ (d)
      if (String(row.shortuid ?? '').trim().toLowerCase() === want) return true
      if (String(row.pkey ?? '').trim().toLowerCase() === want) return true
    }
  }

  return false
}

/**
 * Prefer cluster pkey for session storage; label = shortuid for the chip.
 * @param {unknown} user
 * @param {string} shortuid
 * @returns {{ pkey: string, label: string }}
 */
export function tenantContextForShortuid(user, shortuid) {
  const want = String(shortuid ?? '')
    .trim()
    .toLowerCase()
  const details =
    (user &&
      typeof user === 'object' &&
      (/** @type {{ clusters?: unknown }} */ (user).clusters ||
        /** @type {{ allowed_cluster_details?: unknown }} */ (user).allowed_cluster_details)) ||
    []

  if (Array.isArray(details)) {
    for (const d of details) {
      if (!d || typeof d !== 'object') continue
      const row = /** @type {Record<string, unknown>} */ (d)
      const su = String(row.shortuid ?? '').trim().toLowerCase()
      const pk = String(row.pkey ?? '').trim()
      if (su === want || pk.toLowerCase() === want) {
        return {
          pkey: pk || su || want,
          label: su || pk || want
        }
      }
    }
  }

  return { pkey: want, label: want }
}

/**
 * True when input looks like an email (common mistake on tenant-id field).
 * @param {string} input
 */
export function looksLikeEmail(input) {
  const s = String(input ?? '').trim()
  return s.includes('@') && !s.includes('://')
}
