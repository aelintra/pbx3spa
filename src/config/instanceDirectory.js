/**
 * Fleet instance catalog (Phase 2). Omit VITE_INSTANCE_DIRECTORY_URL for solo login (Rule 6).
 */
export function getInstanceDirectoryUrl() {
  const url = (import.meta.env.VITE_INSTANCE_DIRECTORY_URL ?? '').trim()
  return url || null
}

export function getDefaultApiBaseUrl() {
  const url = (import.meta.env.VITE_DEFAULT_API_BASE_URL ?? '').trim()
  return url || null
}

export function isFleetDirectoryEnabled() {
  return Boolean(getInstanceDirectoryUrl())
}
