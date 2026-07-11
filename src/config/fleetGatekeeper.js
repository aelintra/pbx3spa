/**
 * Fleet gatekeeper API base (Phase B′).
 * Example: https://fleet.example.com or http://127.0.0.1:8090
 *
 * Auth: production builds must not bake GATEKEEPER_API_TOKEN into the SPA.
 * Prefer sessionStorage (operator paste). VITE_FLEET_GATEKEEPER_TOKEN is DEV-only.
 */

const TOKEN_KEY = 'pbx3.fleetGatekeeperToken'

export function getFleetGatekeeperUrl() {
  const url = import.meta.env.VITE_FLEET_GATEKEEPER_URL
  return typeof url === 'string' && url.trim() ? url.trim().replace(/\/$/, '') : ''
}

export function isFleetGatekeeperEnabled() {
  return Boolean(getFleetGatekeeperUrl())
}

/**
 * Resolve Bearer token for gatekeeper calls.
 * Order: sessionStorage → (import.meta.env.DEV only) VITE_FLEET_GATEKEEPER_TOKEN
 */
export function getFleetGatekeeperToken() {
  try {
    const fromSession = sessionStorage.getItem(TOKEN_KEY)
    if (fromSession && fromSession.trim()) {
      return fromSession.trim()
    }
  } catch {
    // private mode / denied
  }
  if (import.meta.env.DEV) {
    const fromEnv = (import.meta.env.VITE_FLEET_GATEKEEPER_TOKEN || '').trim()
    if (fromEnv) return fromEnv
  }
  return ''
}

export function setFleetGatekeeperToken(token) {
  const t = (token || '').trim()
  if (!t) {
    clearFleetGatekeeperToken()
    return
  }
  sessionStorage.setItem(TOKEN_KEY, t)
}

export function clearFleetGatekeeperToken() {
  try {
    sessionStorage.removeItem(TOKEN_KEY)
  } catch {
    // ignore
  }
}

export function hasFleetGatekeeperToken() {
  return Boolean(getFleetGatekeeperToken())
}
