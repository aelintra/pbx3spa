/**
 * Fleet gatekeeper API base (Phase B′).
 * Example: https://control.pbx3.com or /fleet-gk (Vite proxy).
 *
 * Auth: sessionStorage Bearer from login (or paste / DEV break-glass).
 * Never bake GATEKEEPER_API_TOKEN into production builds.
 *
 * Abilities (S10.1): stored alongside token; server enforces — SPA only hides UI.
 */

const TOKEN_KEY = 'pbx3.fleetGatekeeperToken'
const ABILITIES_KEY = 'pbx3.fleetAbilities'

/** @type {readonly string[]} */
export const FLEET_ABILITY = Object.freeze({
  READ: 'fleet_read',
  INSTANCES: 'fleet_instances',
  MOVES: 'fleet_moves',
  EDGE: 'fleet_edge',
  ADMIN: 'fleet_admin'
})

/** @type {readonly string[]} */
export const FLEET_ABILITY_ALL = Object.freeze([
  FLEET_ABILITY.READ,
  FLEET_ABILITY.INSTANCES,
  FLEET_ABILITY.MOVES,
  FLEET_ABILITY.EDGE,
  FLEET_ABILITY.ADMIN
])

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
  clearFleetAbilities()
}

export function hasFleetGatekeeperToken() {
  return Boolean(getFleetGatekeeperToken())
}

/** @param {unknown} abilities */
export function setFleetAbilities(abilities) {
  const list = normalizeFleetAbilities(abilities)
  try {
    if (list.length === 0) {
      sessionStorage.removeItem(ABILITIES_KEY)
      return
    }
    sessionStorage.setItem(ABILITIES_KEY, JSON.stringify(list))
  } catch {
    // ignore
  }
}

export function clearFleetAbilities() {
  try {
    sessionStorage.removeItem(ABILITIES_KEY)
  } catch {
    // ignore
  }
}

/** @returns {string[]} */
export function getFleetAbilities() {
  try {
    const raw = sessionStorage.getItem(ABILITIES_KEY)
    if (!raw) return []
    return normalizeFleetAbilities(JSON.parse(raw))
  } catch {
    return []
  }
}

/** @param {unknown} raw */
export function normalizeFleetAbilities(raw) {
  if (!Array.isArray(raw)) return []
  const out = []
  for (const item of raw) {
    if (typeof item !== 'string') continue
    const a = item.trim()
    if (a && FLEET_ABILITY_ALL.includes(a) && !out.includes(a)) {
      out.push(a)
    }
  }
  return out
}

/**
 * fleet_admin grants every fleet_* ability (mirrors gatekeeper FleetAbilities::grants).
 * @param {string} ability
 */
export function canFleet(ability) {
  const held = getFleetAbilities()
  if (held.includes(FLEET_ABILITY.ADMIN)) return true
  return held.includes(ability)
}

/** Enter Fleet mode / list panels require at least fleet_read. */
export function canEnterFleet() {
  return canFleet(FLEET_ABILITY.READ)
}
