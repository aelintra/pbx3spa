/**
 * Fleet gatekeeper HTTP helpers (S8.10 move wizard).
 * Lab: VITE_FLEET_GATEKEEPER_URL=http://127.0.0.1:8090
 *      VITE_FLEET_GATEKEEPER_TOKEN=… (lab only — not for production builds)
 */
import { getFleetGatekeeperUrl } from '@/config/fleetGatekeeper'

function token() {
  return (import.meta.env.VITE_FLEET_GATEKEEPER_TOKEN || '').trim()
}

function base() {
  const url = getFleetGatekeeperUrl()
  if (!url) {
    throw new Error('VITE_FLEET_GATEKEEPER_URL is not set')
  }
  return url
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

export function listFleetTenants() {
  return gkFetch('/api/v1/tenants').then((d) => d.tenants || [])
}

export function getFleetCatalog() {
  return gkFetch('/api/v1/catalog')
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
