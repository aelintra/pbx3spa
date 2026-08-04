import { getApiClient } from '@/api/client'
import { normalizeList } from '@/utils/listResponse'
import { getTenantHomeUrl } from '@/config/instanceDirectory'
import { fetchTenantHome } from '@/utils/tenantHome'
import { loadTenantOptions } from '@/utils/loadTenantOptions'

/**
 * Known tenant FQDNs for dial-prefix target picker (restricted list; config-time only; Rule 1 OK).
 * Sources: local GET tenants fqdn + catalog tenant-home cname (when reachable).
 * No freeform — operator only picks what we know.
 *
 * @returns {Promise<{
 *   fqdns: string[],
 *   labels: Map<string, string>,
 *   localTenants: Array<Record<string, unknown>>,
 *   catalogAttempted: boolean,
 *   catalogOk: boolean,
 * }>}
 */
export async function loadTargetTenantFqdnCatalog() {
  /** @type {Map<string, string>} */
  const labels = new Map()
  /** @type {Set<string>} */
  const fqdns = new Set()

  let localTenants = []
  try {
    localTenants = await loadTenantOptions()
  } catch {
    localTenants = []
  }

  for (const t of localTenants) {
    const fqdn = String(t.fqdn ?? '').trim().toLowerCase()
    if (fqdn && fqdn.includes('.')) {
      fqdns.add(fqdn)
      const label = String(t.pkey ?? t.shortuid ?? '').trim()
      if (label) labels.set(fqdn, label)
    }
  }

  let catalogAttempted = false
  let catalogOk = false
  const homeUrl = getTenantHomeUrl()
  if (homeUrl) {
    catalogAttempted = true
    try {
      const home = await fetchTenantHome(homeUrl)
      catalogOk = true
      for (const row of home.tenants || []) {
        const cname = String(row.cname ?? '').trim().toLowerCase()
        if (cname && cname.includes('.')) {
          fqdns.add(cname)
          const label = String(row.shortuid ?? '').trim()
          if (label && !labels.has(cname)) {
            labels.set(cname, label)
          }
        }
      }
    } catch {
      catalogOk = false
    }
  }

  const sorted = [...fqdns].sort((a, b) => a.localeCompare(b))
  return { fqdns: sorted, labels, localTenants, catalogAttempted, catalogOk }
}

/**
 * Select options: value = FQDN, label = "pkey — fqdn" (or FQDN alone).
 * @param {string[]} fqdns
 * @param {Map<string, string>} labels
 * @param {{ excludeFqdn?: string }} [opts]
 * @returns {Array<{ value: string, label: string }>}
 */
export function targetFqdnSelectOptions(fqdns, labels, opts = {}) {
  const exclude = String(opts.excludeFqdn ?? '')
    .trim()
    .toLowerCase()
  return fqdns
    .filter((f) => f && f !== exclude)
    .map((fqdn) => {
      const name = labels.get(fqdn)
      return {
        value: fqdn,
        label: name ? `${name} — ${fqdn}` : fqdn
      }
    })
}

/**
 * Calling-tenant pkey options from local rows only (prefix owned on this node).
 * @param {Array<Record<string, unknown>>} localTenants
 */
export function callingTenantPkeys(localTenants) {
  return [...new Set(localTenants.map((t) => t.pkey).filter(Boolean))].sort((a, b) =>
    String(a).localeCompare(String(b))
  )
}

/**
 * Local tenant FQDN for a calling-tenant pkey / shortuid selection.
 * @param {Array<Record<string, unknown>>} localTenants
 * @param {string} clusterPkey
 */
export function callingTenantFqdn(localTenants, clusterPkey) {
  const p = String(clusterPkey || '').trim()
  if (!p) return ''
  const t = localTenants.find(
    (row) =>
      String(row.pkey ?? '') === p ||
      String(row.shortuid ?? '') === p ||
      String(row.id ?? '') === p
  )
  return String(t?.fqdn ?? '')
    .trim()
    .toLowerCase()
}

/**
 * @deprecated prefer loadTargetTenantFqdnCatalog
 */
export async function loadLocalTenantFqdns() {
  try {
    const res = await getApiClient().get('tenants')
    return normalizeList(res, 'tenants')
  } catch {
    return []
  }
}
