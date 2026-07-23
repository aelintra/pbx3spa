/**
 * B′ tenant-home catalog — shortuid/cname → instance_id for login resolve.
 */

/**
 * @typedef {Object} TenantHomeRecord
 * @property {string} shortuid
 * @property {string} cname
 * @property {string} instance_id
 */

/**
 * @param {unknown} raw
 * @returns {{ version?: number, updated_at?: string, tenants: TenantHomeRecord[] }}
 */
export function normalizeTenantHome(raw) {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Tenant-home response is not a JSON object')
  }
  const o = /** @type {Record<string, unknown>} */ (raw)
  const list = o.tenants
  if (!Array.isArray(list)) {
    throw new Error('Tenant-home missing "tenants" array')
  }
  const tenants = list
    .map((row, index) => normalizeTenantHomeRecord(row, index))
    .filter(Boolean)
  return {
    version: typeof o.version === 'number' ? o.version : undefined,
    updated_at: typeof o.updated_at === 'string' ? o.updated_at : undefined,
    tenants
  }
}

/**
 * @param {unknown} row
 * @param {number} index
 * @returns {TenantHomeRecord | null}
 */
export function normalizeTenantHomeRecord(row, index) {
  if (!row || typeof row !== 'object') return null
  const r = /** @type {Record<string, unknown>} */ (row)
  const shortuid = String(r.shortuid ?? '').trim().toLowerCase()
  const cname = String(r.cname ?? '').trim().toLowerCase()
  const instance_id = String(r.instance_id ?? '').trim()
  if (!shortuid || !instance_id) {
    console.warn(`Tenant-home row ${index} skipped: missing shortuid or instance_id`)
    return null
  }
  return {
    shortuid,
    cname: cname || shortuid,
    instance_id
  }
}

/**
 * Normalize user input: shortuid, host, or URL → lookup keys.
 * @param {string} input
 * @returns {{ shortuidHint: string, hostHint: string }}
 */
export function normalizeTenantLookupInput(input) {
  let raw = (input ?? '').trim().toLowerCase()
  if (!raw) return { shortuidHint: '', hostHint: '' }

  if (raw.includes('://')) {
    try {
      raw = new URL(raw).hostname
    } catch {
      raw = raw.replace(/^[a-z][a-z0-9+.-]*:\/\//, '').split('/')[0] ?? raw
    }
  } else if (raw.includes('/') && !raw.includes(' ')) {
    raw = raw.split('/')[0] ?? raw
  }

  raw = raw.replace(/:\d+$/, '')
  const hostHint = raw
  const shortuidHint = raw.includes('.') ? (raw.split('.')[0] ?? raw) : raw
  return { shortuidHint, hostHint }
}

/**
 * @param {TenantHomeRecord[]} tenants
 * @param {string} input
 * @returns {TenantHomeRecord | null}
 */
export function findTenantHome(tenants, input) {
  const { shortuidHint, hostHint } = normalizeTenantLookupInput(input)
  if (!shortuidHint && !hostHint) return null

  const byCname = tenants.find((t) => t.cname === hostHint)
  if (byCname) return byCname

  const byShort = tenants.find((t) => t.shortuid === shortuidHint)
  if (byShort) return byShort

  return null
}

/**
 * @param {string} tenantHomeUrl
 * @param {{ signal?: AbortSignal }} [options]
 */
export async function fetchTenantHome(tenantHomeUrl, options = {}) {
  const res = await fetch(tenantHomeUrl, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal: options.signal
  })
  if (!res.ok) {
    throw new Error(`Tenant-home fetch failed (${res.status})`)
  }
  const raw = await res.json()
  return normalizeTenantHome(raw)
}
