/**
 * Fleet instance catalog (Phase 2). Omit VITE_INSTANCE_DIRECTORY_URL for solo login (Rule 6).
 */
export function getInstanceDirectoryUrl() {
  const url = (import.meta.env.VITE_INSTANCE_DIRECTORY_URL ?? '').trim()
  return url || null
}

/**
 * B′ tenant-home rollup. Explicit VITE_TENANT_HOME_URL, else derive from instance-index URL.
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
