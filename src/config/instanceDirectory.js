/**
 * Fleet instance catalog (Phase 2).
 *
 * Omit VITE_INSTANCE_DIRECTORY_URL (and no runtime override) for solo login (Rule 6).
 *
 * Multi-fleet (same SPA origin): VITE_* is the **default** catalog only. Operators may
 * override at runtime (localStorage); each org bucket must CORS-allow this SPA origin.
 */
const CATALOG_OVERRIDE_KEY = 'pbx3_catalog_url'
const CATALOG_RECENTS_KEY = 'pbx3_catalog_recents'
const MAX_CATALOG_RECENTS = 6

/**
 * @returns {string|null}
 */
export function getDefaultInstanceDirectoryUrl() {
  const url = (import.meta.env.VITE_INSTANCE_DIRECTORY_URL ?? '').trim()
  return url || null
}

/**
 * Active catalog URL: runtime override, else build-time default.
 * @returns {string|null}
 */
export function getInstanceDirectoryUrl() {
  try {
    if (typeof localStorage !== 'undefined') {
      const override = (localStorage.getItem(CATALOG_OVERRIDE_KEY) ?? '').trim()
      if (override) return override
    }
  } catch {
    // private mode / SSR
  }
  return getDefaultInstanceDirectoryUrl()
}

/**
 * Persist catalog override (empty clears override → back to build default).
 * @param {string|null|undefined} url
 */
export function setInstanceDirectoryUrl(url) {
  const trimmed = String(url ?? '').trim()
  try {
    if (typeof localStorage === 'undefined') return
    if (!trimmed) {
      localStorage.removeItem(CATALOG_OVERRIDE_KEY)
      return
    }
    localStorage.setItem(CATALOG_OVERRIDE_KEY, trimmed)
    pushCatalogRecent(trimmed)
  } catch {
    // quota / private mode
  }
}

export function clearInstanceDirectoryOverride() {
  setInstanceDirectoryUrl('')
}

/**
 * @returns {string[]}
 */
export function loadCatalogRecents() {
  try {
    if (typeof localStorage === 'undefined') return []
    const raw = localStorage.getItem(CATALOG_RECENTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.map((u) => String(u ?? '').trim()).filter(Boolean)
  } catch {
    return []
  }
}

/**
 * @param {string} url
 */
function pushCatalogRecent(url) {
  const entry = String(url ?? '').trim()
  if (!entry) return
  const prev = loadCatalogRecents().filter((u) => u !== entry)
  const next = [entry, ...prev].slice(0, MAX_CATALOG_RECENTS)
  try {
    localStorage.setItem(CATALOG_RECENTS_KEY, JSON.stringify(next))
  } catch {
    // ignore
  }
}

/**
 * B′ tenant-home rollup. Explicit VITE_TENANT_HOME_URL, else derive from active catalog URL.
 */
export function getTenantHomeUrl() {
  const explicit = (import.meta.env.VITE_TENANT_HOME_URL ?? '').trim()
  if (explicit) return explicit
  const catalog = getInstanceDirectoryUrl()
  if (!catalog) return null
  if (catalog.includes('instance-index.json')) {
    return catalog.replace(/instance-index\.json(\?.*)?$/, 'tenant-home.json$1')
  }
  return `${catalog.replace(/\/?$/, '/')}tenant-home.json`
}

export function getDefaultApiBaseUrl() {
  const url = (import.meta.env.VITE_DEFAULT_API_BASE_URL ?? '').trim()
  return url || null
}

export function isFleetDirectoryEnabled() {
  return Boolean(getInstanceDirectoryUrl())
}

export function isTenantHomeEnabled() {
  return Boolean(getTenantHomeUrl())
}
