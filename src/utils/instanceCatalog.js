/**
 * Fetch and normalize catalog/instance-index.json from S3 or static HTTPS URL.
 */

/**
 * @param {unknown} raw
 * @returns {{ version?: number, updated_at?: string, instances: import('@/utils/instanceCatalog').InstanceRecord[] }}
 */
export function normalizeCatalog(raw) {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Catalog response is not a JSON object')
  }
  const o = /** @type {Record<string, unknown>} */ (raw)
  const list = o.instances
  if (!Array.isArray(list)) {
    throw new Error('Catalog missing "instances" array')
  }
  const instances = list
    .map((row, index) => normalizeInstanceRecord(row, index))
    .filter(Boolean)
    .filter((inst) => {
      const status = (inst.status ?? 'active').toLowerCase()
      return status !== 'decommissioned'
    })
  return {
    version: typeof o.version === 'number' ? o.version : undefined,
    updated_at: typeof o.updated_at === 'string' ? o.updated_at : undefined,
    instances
  }
}

/**
 * @typedef {Object} InstanceRecord
 * @property {string} id
 * @property {string} fqdn
 * @property {string} api_base_url
 * @property {string} label
 * @property {string} [status]
 * @property {string} [environment]
 * @property {string} [notes]
 * @property {string} [org_id]
 * @property {string} [region]
 */

/**
 * @param {unknown} row
 * @param {number} index
 * @returns {InstanceRecord | null}
 */
export function normalizeInstanceRecord(row, index) {
  if (!row || typeof row !== 'object') return null
  const r = /** @type {Record<string, unknown>} */ (row)
  const id = String(r.id ?? '').trim()
  const fqdn = String(r.fqdn ?? '').trim()
  const api_base_url = String(r.api_base_url ?? '').trim()
  const label = String(r.label ?? '').trim() || fqdn || id
  if (!id || !api_base_url) {
    console.warn(`Catalog row ${index} skipped: missing id or api_base_url`)
    return null
  }
  return {
    id,
    fqdn,
    api_base_url,
    label,
    status: r.status != null ? String(r.status) : undefined,
    environment: r.environment != null ? String(r.environment) : undefined,
    notes: r.notes != null ? String(r.notes) : undefined,
    org_id: r.org_id != null ? String(r.org_id) : undefined,
    region: r.region != null ? String(r.region) : undefined
  }
}

/**
 * @param {string} directoryUrl
 * @param {{ signal?: AbortSignal }} [options]
 */
export async function fetchInstanceCatalog(directoryUrl, options = {}) {
  const res = await fetch(directoryUrl, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal: options.signal
  })
  if (!res.ok) {
    throw new Error(`Catalog fetch failed (${res.status})`)
  }
  const raw = await res.json()
  return normalizeCatalog(raw)
}

/**
 * @param {InstanceRecord[]} instances
 * @param {string} instanceId
 */
export function findInstanceById(instances, instanceId) {
  const id = (instanceId ?? '').trim()
  if (!id) return null
  return instances.find((i) => i.id === id) ?? null
}
