const STORAGE_KEY = 'pbx3_instance_recents'
const MAX_RECENTS = 8

/**
 * @typedef {import('@/utils/instanceCatalog').InstanceRecord} InstanceRecord
 */

/**
 * @returns {InstanceRecord[]}
 */
export function loadInstanceRecents() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((row) => {
        const id = String(row?.id ?? '').trim()
        const api_base_url = String(row?.api_base_url ?? '').trim()
        if (!id || !api_base_url) return null
        return {
          id,
          api_base_url,
          fqdn: String(row?.fqdn ?? '').trim(),
          label: String(row?.label ?? '').trim() || id,
          environment: row?.environment != null ? String(row.environment) : undefined,
          status: row?.status != null ? String(row.status) : undefined
        }
      })
      .filter(Boolean)
  } catch {
    return []
  }
}

/**
 * @param {InstanceRecord} instance
 */
export function pushInstanceRecent(instance) {
  if (!instance?.id || !instance?.api_base_url) return
  const entry = {
    id: instance.id,
    fqdn: instance.fqdn ?? '',
    api_base_url: instance.api_base_url,
    label: instance.label || instance.fqdn || instance.id,
    environment: instance.environment,
    status: instance.status
  }
  const prev = loadInstanceRecents().filter((r) => r.id !== entry.id)
  const next = [entry, ...prev].slice(0, MAX_RECENTS)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // quota / private mode
  }
}
