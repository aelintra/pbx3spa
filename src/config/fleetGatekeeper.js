/**
 * Fleet gatekeeper API base (Phase B′).
 * Example: https://fleet.example.com or http://127.0.0.1:8090
 */
export function getFleetGatekeeperUrl() {
  const url = import.meta.env.VITE_FLEET_GATEKEEPER_URL
  return typeof url === 'string' && url.trim() ? url.trim().replace(/\/$/, '') : ''
}

export function isFleetGatekeeperEnabled() {
  return Boolean(getFleetGatekeeperUrl())
}
