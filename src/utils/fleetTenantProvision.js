/**
 * Pure helpers for fleet-first tenant provision request shaping (SPA).
 * Gatekeeper does authoritative validation; this mirrors digit-string rules for UX.
 */

/**
 * @param {{ instance_id?: string, pkey?: string, description?: string, clusterclid?: string, localarea?: string }} form
 * @returns {{ ok: true, body: object } | { ok: false, error: string }}
 */
export function buildProvisionBody(form) {
  const instance_id = String(form?.instance_id || '').trim()
  const pkey = String(form?.pkey || '').trim()
  const description = String(form?.description || '').trim()
  if (!instance_id) return { ok: false, error: 'Home instance is required' }
  if (!pkey) return { ok: false, error: 'Tenant name is required' }
  if (!description) return { ok: false, error: 'Description is required' }

  const body = { instance_id, pkey, description }
  const clid = String(form?.clusterclid || '').trim()
  const local = String(form?.localarea || '').trim()
  if (clid !== '') {
    if (!/^\d*$/.test(clid)) return { ok: false, error: 'Cluster CLID must be digits only' }
    body.clusterclid = clid
  }
  if (local !== '') {
    if (!/^\d*$/.test(local)) return { ok: false, error: 'Local area must be digits only' }
    body.localarea = local
  }
  return { ok: true, body }
}
