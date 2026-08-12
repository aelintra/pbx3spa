/**
 * Fleet gatekeeper HTTP helpers (Fleet mode / move wizard).
 * Lab: VITE_FLEET_GATEKEEPER_URL=/fleet-gk → proxy to control host.
 * Auth: prefer POST /api/v1/auth/login → sessionStorage Bearer; optional paste / DEV break-glass.
 */
import {
  getFleetGatekeeperUrl,
  getFleetGatekeeperToken,
  setFleetGatekeeperToken,
  clearFleetGatekeeperToken,
  setFleetAbilities,
  FLEET_ABILITY,
  canFleet
} from '@/config/fleetGatekeeper'

function token() {
  return getFleetGatekeeperToken()
}

function base() {
  const url = getFleetGatekeeperUrl()
  if (!url) {
    throw new Error('VITE_FLEET_GATEKEEPER_URL is not set')
  }
  return url
}

async function parseJsonResponse(res) {
  const text = await res.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = { raw: text }
  }
  if (res.status === 401) {
    // Stale/expired Bearer — mirrors instance api/client.js 401 handling.
    // clearFleetGatekeeperToken() also clears cached abilities.
    clearFleetGatekeeperToken()
  }
  if (!res.ok) {
    const msg = data?.error || data?.message || `Gatekeeper ${res.status}`
    throw new Error(msg)
  }
  return data
}

async function gkFetch(path, options = {}) {
  const headers = {
    Accept: 'application/json',
    ...(options.headers || {})
  }
  const t = token()
  if (t) {
    headers.Authorization = `Bearer ${t}`
  }
  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }
  const res = await fetch(`${base()}${path}`, { ...options, headers })
  return parseJsonResponse(res)
}

function applyAbilitiesFromAuthPayload(data) {
  const abilities = data?.abilities ?? data?.user?.abilities ?? []
  setFleetAbilities(abilities)
  return abilities
}

/** Public — no Bearer. */
export async function fleetAuthStatus() {
  return gkFetch('/api/v1/auth/status')
}

/**
 * Login with fleet operator email/password.
 * Either stores Bearer, or returns { requires_2fa, challenge_id } (no token stored).
 * @returns {Promise<object>}
 */
export async function loginFleet(email, password) {
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json'
  }
  const res = await fetch(`${base()}/api/v1/auth/login`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email, password })
  })
  const data = await parseJsonResponse(res)
  if (data?.requires_2fa && data?.challenge_id) {
    return {
      requires_2fa: true,
      challenge_id: String(data.challenge_id)
    }
  }
  return finishFleetLogin(data)
}

/**
 * Complete TOTP challenge; stores Bearer on success.
 * @returns {Promise<object>}
 */
export async function verifyFleetTwoFactor(challengeId, code) {
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json'
  }
  const res = await fetch(`${base()}/api/v1/auth/2fa/verify`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      challenge_id: challengeId,
      code
    })
  })
  const data = await parseJsonResponse(res)
  return finishFleetLogin(data)
}

function finishFleetLogin(data) {
  if (!data?.token) {
    throw new Error('Login response missing token')
  }
  setFleetGatekeeperToken(data.token)
  applyAbilitiesFromAuthPayload(data)
  if (!canFleet(FLEET_ABILITY.READ)) {
    clearFleetGatekeeperToken()
    throw new Error('This account lacks fleet_read — cannot enter Fleet mode')
  }
  return data
}

/**
 * After paste / DEV token: load /me and store abilities.
 * Rejects sessions without fleet_read.
 */
export async function refreshFleetSession() {
  if (!token()) {
    setFleetAbilities([])
    return null
  }
  const me = await getFleetMe()
  applyAbilitiesFromAuthPayload(me)
  if (!canFleet(FLEET_ABILITY.READ)) {
    clearFleetGatekeeperToken()
    throw new Error('This account lacks fleet_read — cannot enter Fleet mode')
  }
  return me
}

export async function logoutFleet() {
  try {
    if (token()) {
      await gkFetch('/api/v1/auth/logout', { method: 'POST', body: '{}' })
    }
  } catch {
    // still clear local session
  }
  clearFleetGatekeeperToken()
}

export function getFleetMe() {
  return gkFetch('/api/v1/auth/me')
}

export function setupFleetTwoFactor(password) {
  return gkFetch('/api/v1/auth/2fa/setup', {
    method: 'POST',
    body: JSON.stringify({ password })
  })
}

export function confirmFleetTwoFactor(code) {
  return gkFetch('/api/v1/auth/2fa/confirm', {
    method: 'POST',
    body: JSON.stringify({ code })
  })
}

export function disableFleetTwoFactor(password, code) {
  return gkFetch('/api/v1/auth/2fa/disable', {
    method: 'POST',
    body: JSON.stringify({ password, code })
  })
}

export function regenerateFleetRecoveryCodes(password, code) {
  return gkFetch('/api/v1/auth/2fa/recovery', {
    method: 'POST',
    body: JSON.stringify({ password, code })
  })
}

export function clearFleetUserTwoFactor(id) {
  return gkFetch(`/api/v1/fleet-users/${encodeURIComponent(id)}/clear-2fa`, {
    method: 'POST',
    body: '{}'
  })
}

export function listFleetTenants() {
  return gkFetch('/api/v1/tenants').then((d) =>
    (d.tenants || [])
      .map((t) => {
        const shortuid = t.shortuid || t.tenant_shortuid
        // Name = pkey (FLEET_NAMING_LOCK). label is optional mirror; description must not win.
        const name = t.pkey || t.label || t.cname || shortuid
        return {
          ...t,
          shortuid,
          name
        }
      })
      .filter((t) => String(t.status || '').toLowerCase() !== 'decommissioned')
  )
}

/** S10.5 — catalog DID ownership (flat list). */
export function listFleetDids() {
  return gkFetch('/api/v1/dids')
}

/**
 * Catalog ↔ SBC fleet=did inbound rule drift (`fleet_edge`).
 * Apply = {@link projectFleetDids} (catalog → edge).
 */
export function reconcileFleetDids() {
  return gkFetch('/api/v1/dids/reconcile')
}

/**
 * Assign / reassign DID or hop-1 block → tenant in catalog (`fleet_edge`); projects to SBC unless project:false.
 * @param {{ e164: string, tenant_shortuid: string, status?: string, delivery?: 'singleton'|'block', carrier?: string, notes?: string, sip_prefix?: string, reassign?: boolean, project?: boolean }} body
 */
export function assignFleetDid(body) {
  return gkFetch('/api/v1/dids/assign', {
    method: 'POST',
    body: JSON.stringify(body)
  })
}

/**
 * Soft-release DID in catalog, or hard-remove with `remove: true` (`fleet_edge`).
 * @param {{ e164: string, confirm?: boolean, remove?: boolean, project?: boolean }} body
 */
export function releaseFleetDid(body) {
  return gkFetch('/api/v1/dids/release', {
    method: 'POST',
    body: JSON.stringify(body)
  })
}

/**
 * Force-project catalog DIDs → SBC inbound dr_rules (`fleet_edge`).
 * @param {{ tenant_shortuid?: string, dry_run?: boolean }} [body]
 */
export function projectFleetDids(body = {}) {
  return gkFetch('/api/v1/dids/project', {
    method: 'POST',
    body: JSON.stringify(body)
  })
}

/**
 * Fleet-first tenant create — node + catalog + SBC domain (`fleet_instances`).
 * Returns the provision payload even on HTTP 502 (catalog fail after node ok) so the SPA can show resume shortuid.
 * @param {{ instance_id: string, pkey: string, description: string, clusterclid?: string, localarea?: string, resume?: boolean, shortuid?: string, fqdn?: string }} body
 */
export async function provisionFleetTenant(body) {
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json'
  }
  const t = token()
  if (t) {
    headers.Authorization = `Bearer ${t}`
  }
  const res = await fetch(`${base()}/api/v1/tenants/provision`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  })
  const text = await res.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = { raw: text }
  }
  if (data && typeof data === 'object' && ('ok' in data || 'stages' in data)) {
    return data
  }
  if (!res.ok) {
    const msg = data?.error || data?.message || `Gatekeeper ${res.status}`
    throw new Error(msg)
  }
  return data
}

/**
 * Ensure tenant fqdn exists as SBC domain at catalog setid (`fleet_edge`).
 * @param {string} shortuid
 */
export function registerFleetTenantDomain(shortuid) {
  return gkFetch(`/api/v1/tenants/${encodeURIComponent(shortuid)}/register-domain`, {
    method: 'POST',
    body: '{}'
  })
}

export function getFleetCatalog() {
  return gkFetch('/api/v1/catalog')
}

/** Live SBC dispatcher setids (catalog sbc_dispatcher_setid must be one of these). */
export function listFleetDispatcherSets() {
  return gkFetch('/api/v1/sbc/dispatcher-sets').then((d) => d.sets || [])
}

/** S10.4 — catalog ↔ SBC domain.setid drift (`fleet_edge`). */
export function getFleetReconcile() {
  return gkFetch('/api/v1/reconcile')
}

/**
 * Force-project setid_mismatch drifts onto SBC (`fleet_edge`).
 * @param {{ confirm?: boolean, dry_run?: boolean, domains?: string[] }} [body]
 */
export function projectFleetReconcile(body = { confirm: true }) {
  return gkFetch('/api/v1/reconcile/project', {
    method: 'POST',
    body: JSON.stringify(body)
  })
}

/** @param {Record<string, unknown>} body */
export function registerFleetInstance(body) {
  return gkFetch('/api/v1/instances', {
    method: 'POST',
    body: JSON.stringify(body)
  })
}

/** @param {string} id @param {Record<string, unknown>} body */
export function patchFleetInstance(id, body) {
  return gkFetch(`/api/v1/instances/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body)
  })
}

/**
 * S10.5 — provision SBC dispatcher set + Asterisk Peer; write catalog setid + sbc_backend_uri.
 * @param {string} id
 * @param {{ backend_uri?: string, confirm?: boolean, source_ip?: string, dry_run?: boolean }} [body]
 */
export function provisionFleetInstanceEdge(id, body = {}) {
  return gkFetch(`/api/v1/instances/${encodeURIComponent(id)}/provision-edge`, {
    method: 'POST',
    body: JSON.stringify(body)
  })
}

/**
 * Soft decommission (status=decommissioned).
 * @param {string} id
 * @param {{ notes?: string }} [opts]
 */
export function decommissionFleetInstance(id, opts = {}) {
  return gkFetch(`/api/v1/instances/${encodeURIComponent(id)}/decommission`, {
    method: 'POST',
    body: JSON.stringify({
      confirm: true,
      ...(opts.notes ? { notes: opts.notes } : {})
    })
  })
}

export function listTenantMoves(limit = 50) {
  const q = new URLSearchParams({ limit: String(limit) })
  return gkFetch(`/api/v1/tenant-moves?${q}`).then((d) => d.jobs || [])
}

export function createTenantMove(body) {
  return gkFetch('/api/v1/tenant-moves', {
    method: 'POST',
    body: JSON.stringify(body)
  })
}

export function getTenantMove(jobId, tenantShortuid) {
  const q = tenantShortuid ? `?tenant=${encodeURIComponent(tenantShortuid)}` : ''
  return gkFetch(`/api/v1/tenant-moves/${encodeURIComponent(jobId)}${q}`)
}

export function runTenantMove(jobId, tenantShortuid) {
  return gkFetch(`/api/v1/tenant-moves/${encodeURIComponent(jobId)}/run`, {
    method: 'POST',
    body: JSON.stringify(tenantShortuid ? { tenant_shortuid: tenantShortuid } : {})
  })
}

export function advanceTenantMove(jobId, body) {
  return gkFetch(`/api/v1/tenant-moves/${encodeURIComponent(jobId)}/advance`, {
    method: 'POST',
    body: JSON.stringify(body || {})
  })
}

export function abortTenantMove(jobId, tenantShortuid) {
  return gkFetch(`/api/v1/tenant-moves/${encodeURIComponent(jobId)}/abort`, {
    method: 'POST',
    body: JSON.stringify(tenantShortuid ? { tenant_shortuid: tenantShortuid } : {})
  })
}

export function retryTenantMove(jobId, tenantShortuid) {
  return gkFetch(`/api/v1/tenant-moves/${encodeURIComponent(jobId)}/retry`, {
    method: 'POST',
    body: JSON.stringify(tenantShortuid ? { tenant_shortuid: tenantShortuid } : {})
  })
}

export function rollbackTenantMove(jobId, tenantShortuid) {
  return gkFetch(`/api/v1/tenant-moves/${encodeURIComponent(jobId)}/rollback`, {
    method: 'POST',
    body: JSON.stringify(tenantShortuid ? { tenant_shortuid: tenantShortuid } : {})
  })
}

/** Fleet Delete — create job (runs to awaiting_confirm). Body: { tenant_shortuid } */
export function createTenantDelete(body) {
  return gkFetch('/api/v1/tenant-deletes', {
    method: 'POST',
    body: JSON.stringify(body || {})
  })
}

export function listTenantDeletes(limit = 50) {
  const q = new URLSearchParams({ limit: String(limit) })
  return gkFetch(`/api/v1/tenant-deletes?${q}`).then((d) => d.jobs || [])
}

export function getTenantDelete(jobId, tenantShortuid) {
  const q = tenantShortuid ? `?tenant=${encodeURIComponent(tenantShortuid)}` : ''
  return gkFetch(`/api/v1/tenant-deletes/${encodeURIComponent(jobId)}${q}`)
}

export function runTenantDelete(jobId, tenantShortuid) {
  return gkFetch(`/api/v1/tenant-deletes/${encodeURIComponent(jobId)}/run`, {
    method: 'POST',
    body: JSON.stringify(tenantShortuid ? { tenant_shortuid: tenantShortuid } : {})
  })
}

/** Confirm gate: { confirm: true, typed_shortuid } */
export function confirmTenantDelete(jobId, body) {
  return gkFetch(`/api/v1/tenant-deletes/${encodeURIComponent(jobId)}/confirm`, {
    method: 'POST',
    body: JSON.stringify(body || {})
  })
}

export function abortTenantDelete(jobId, tenantShortuid) {
  return gkFetch(`/api/v1/tenant-deletes/${encodeURIComponent(jobId)}/abort`, {
    method: 'POST',
    body: JSON.stringify(tenantShortuid ? { tenant_shortuid: tenantShortuid } : {})
  })
}

export function retryTenantDelete(jobId, tenantShortuid) {
  return gkFetch(`/api/v1/tenant-deletes/${encodeURIComponent(jobId)}/retry`, {
    method: 'POST',
    body: JSON.stringify(tenantShortuid ? { tenant_shortuid: tenantShortuid } : {})
  })
}

/** S10.6 — list fleet users (`fleet_admin`). */
export function listFleetUsers() {
  return gkFetch('/api/v1/fleet-users')
}

/**
 * @param {{ email: string, password: string, name?: string, abilities?: string[] }} body
 */
export function createFleetUser(body) {
  return gkFetch('/api/v1/fleet-users', {
    method: 'POST',
    body: JSON.stringify(body)
  })
}

/**
 * @param {number|string} id
 * @param {{ name?: string, password?: string, abilities?: string[] }} body
 */
export function updateFleetUser(id, body) {
  return gkFetch(`/api/v1/fleet-users/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body)
  })
}

export function disableFleetUser(id) {
  return gkFetch(`/api/v1/fleet-users/${encodeURIComponent(id)}/disable`, {
    method: 'POST',
    body: '{}'
  })
}

export function enableFleetUser(id) {
  return gkFetch(`/api/v1/fleet-users/${encodeURIComponent(id)}/enable`, {
    method: 'POST',
    body: '{}'
  })
}

export function revokeFleetUserSessions(id) {
  return gkFetch(`/api/v1/fleet-users/${encodeURIComponent(id)}/revoke-sessions`, {
    method: 'POST',
    body: '{}'
  })
}

/** SBC HA edge pairs */
export function listEdgePairs() {
  return gkFetch('/api/v1/edge-pairs')
}

export function getEdgePair(id) {
  return gkFetch(`/api/v1/edge-pairs/${encodeURIComponent(id)}`)
}

/**
 * @param {Record<string, unknown>} body
 */
export function createEdgePair(body) {
  return gkFetch('/api/v1/edge-pairs', {
    method: 'POST',
    body: JSON.stringify(body)
  })
}

/**
 * @param {string} id
 * @param {{ mode?: string, active_member?: string, enabled?: boolean, label?: string }} body
 */
export function patchEdgePair(id, body) {
  return gkFetch(`/api/v1/edge-pairs/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body)
  })
}

/** Remove pair from control registry (does not touch AWS). */
export function deleteEdgePair(id) {
  return gkFetch(`/api/v1/edge-pairs/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  })
}

/**
 * Managed “Promote now” — EIP to standby (fleet_admin).
 * If standby SIP OPTIONS fails, gatekeeper returns 409 needs_confirm (no EIP move).
 * Pass confirmStandbySipWarning: true to proceed after the operator acknowledges.
 *
 * @param {string} id
 * @param {{ confirmStandbySipWarning?: boolean }} [opts]
 * @returns {Promise<object>} — may be { needs_confirm: true, warning, standby_sip } on soft block
 */
export async function promoteEdgePair(id, opts = {}) {
  const body = {}
  if (opts.confirmStandbySipWarning) {
    body.confirm_standby_sip_warning = true
  }
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json'
  }
  const t = token()
  if (t) {
    headers.Authorization = `Bearer ${t}`
  }
  const res = await fetch(`${base()}/api/v1/edge-pairs/${encodeURIComponent(id)}/promote`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  })
  const text = await res.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = { raw: text }
  }
  if (res.status === 409 && data?.needs_confirm) {
    return data
  }
  if (!res.ok) {
    const msg = data?.error || data?.message || `Gatekeeper ${res.status}`
    throw new Error(msg)
  }
  return data
}

/** Warm sync — active backup+upload → standby --db-only (fleet_admin). */
export function warmSyncEdgePair(id) {
  return gkFetch(`/api/v1/edge-pairs/${encodeURIComponent(id)}/warm-sync`, {
    method: 'POST',
    body: '{}'
  })
}

/** Edge settings (SBC admin API URL). */
export function getEdgeSettings() {
  return gkFetch('/api/v1/edge-settings')
}

/**
 * @param {{ sbc_admin_api_url?: string }} body — empty string clears DB override (env fallback)
 */
export function patchEdgeSettings(body) {
  return gkFetch('/api/v1/edge-settings', {
    method: 'PATCH',
    body: JSON.stringify(body)
  })
}

/** Fleet velocity policy (S3 catalog/velocity-policy.json). */
export function getFleetVelocityPolicy() {
  return gkFetch('/api/v1/velocity-policy')
}

/** @param {Record<string, unknown>} body */
export function putFleetVelocityPolicy(body) {
  return gkFetch('/api/v1/velocity-policy', {
    method: 'PUT',
    body: JSON.stringify(body)
  })
}

// ── Dial cohorts / Site Groups (C1–C4) ───────────────────────────────

/** Index rollup for Fleet → Site Groups list. */
export function listFleetDialCohorts() {
  return gkFetch('/api/v1/dial-cohorts')
}

export function getFleetDialCohort(id) {
  return gkFetch(`/api/v1/dial-cohorts/${encodeURIComponent(id)}`)
}

/**
 * @param {{ name: string, prefix_width?: number }} body
 */
export function createFleetDialCohort(body) {
  return gkFetch('/api/v1/dial-cohorts', {
    method: 'POST',
    body: JSON.stringify(body)
  })
}

/**
 * @param {string} id
 * @param {{ name?: string, prefix_width?: number }} body
 */
export function patchFleetDialCohort(id, body) {
  return gkFetch(`/api/v1/dial-cohorts/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body)
  })
}

/**
 * @param {string} id
 * @param {{ tenant_shortuid: string, routing_prefix: string, materialise?: boolean, prune_unmanaged?: boolean }} body
 */
export function addFleetDialCohortMember(id, body) {
  return gkFetch(`/api/v1/dial-cohorts/${encodeURIComponent(id)}/members`, {
    method: 'POST',
    body: JSON.stringify(body)
  })
}

/**
 * @param {string} id
 * @param {string} shortuid
 * @param {{ materialise?: boolean }} [opts]
 */
export function removeFleetDialCohortMember(id, shortuid, opts = {}) {
  const q =
    opts.materialise === false ? '?materialise=false' : opts.materialise === true ? '?materialise=true' : ''
  return gkFetch(
    `/api/v1/dial-cohorts/${encodeURIComponent(id)}/members/${encodeURIComponent(shortuid)}${q}`,
    { method: 'DELETE' }
  )
}

/**
 * Sync now — materialise mesh + optional prune.
 * @param {string} id
 * @param {{ reason?: string, prune_unmanaged?: boolean }} [body]
 */
export function syncFleetDialCohort(id, body = {}) {
  return gkFetch(`/api/v1/dial-cohorts/${encodeURIComponent(id)}/sync`, {
    method: 'POST',
    body: JSON.stringify(body)
  })
}

/**
 * @param {string} id
 * @param {{ confirm: boolean, materialise?: boolean }} body
 */
export function decommissionFleetDialCohort(id, body) {
  return gkFetch(`/api/v1/dial-cohorts/${encodeURIComponent(id)}/decommission`, {
    method: 'POST',
    body: JSON.stringify(body)
  })
}

/**
 * @param {string} shortuid
 * @param {{ routing_prefix: string, routing_prefix_width?: number, materialise?: boolean }} body
 */
export function patchTenantRoutingPrefix(shortuid, body) {
  return gkFetch(`/api/v1/tenants/${encodeURIComponent(shortuid)}/routing-prefix`, {
    method: 'PATCH',
    body: JSON.stringify(body)
  })
}
