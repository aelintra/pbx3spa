/**
 * Fleet gatekeeper HTTP helpers (Fleet mode / move wizard).
 * Lab: VITE_FLEET_GATEKEEPER_URL=/fleet-gk → proxy to control host.
 * Auth: prefer POST /api/v1/auth/login → sessionStorage Bearer; optional paste / DEV break-glass.
 */
import {
  getFleetGatekeeperUrl,
  getFleetGatekeeperToken,
  setFleetGatekeeperToken,
  clearFleetGatekeeperToken
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

/** Public — no Bearer. */
export async function fleetAuthStatus() {
  return gkFetch('/api/v1/auth/status')
}

/**
 * Login with fleet operator email/password; stores returned Bearer in sessionStorage.
 * @returns {{ token: string, user: object, expires_at?: string }}
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
  return data
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

export function getFleetCatalog() {
  return gkFetch('/api/v1/catalog')
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
