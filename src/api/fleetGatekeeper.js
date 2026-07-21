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
 * Login with fleet operator email/password; stores returned Bearer in sessionStorage.
 * @returns {{ token: string, user: object, abilities: string[], expires_at?: string }}
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

export function listFleetTenants() {
  return gkFetch('/api/v1/tenants').then((d) =>
    (d.tenants || []).map((t) => {
      const shortuid = t.shortuid || t.tenant_shortuid
      const name = t.label || t.pkey || t.cname || shortuid
      return {
        ...t,
        shortuid,
        name
      }
    })
  )
}

/** S10.5 — catalog DID ownership (flat list). */
export function listFleetDids() {
  return gkFetch('/api/v1/dids')
}

/**
 * Assign / reassign DID → tenant in catalog (`fleet_edge`); projects to SBC unless project:false.
 * @param {{ e164: string, tenant_shortuid: string, status?: string, carrier?: string, notes?: string, sip_prefix?: string, reassign?: boolean, project?: boolean }} body
 */
export function assignFleetDid(body) {
  return gkFetch('/api/v1/dids/assign', {
    method: 'POST',
    body: JSON.stringify(body)
  })
}

/**
 * Soft-release DID in catalog (`fleet_edge`).
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
 * @param {string} id
 * @param {{ mode?: string, active_member?: string, enabled?: boolean, label?: string }} body
 */
export function patchEdgePair(id, body) {
  return gkFetch(`/api/v1/edge-pairs/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body)
  })
}

/** Managed “Promote now” — EIP to standby (fleet_admin). */
export function promoteEdgePair(id) {
  return gkFetch(`/api/v1/edge-pairs/${encodeURIComponent(id)}/promote`, {
    method: 'POST',
    body: '{}'
  })
}
