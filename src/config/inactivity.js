export const DEFAULT_INACTIVITY_MINUTES = 10

/**
 * @param {unknown} value
 * @returns {number}
 */
export function parseInactivityMinutes(value) {
  const minutes = Number(value)
  return Number.isFinite(minutes) && minutes > 0 ? minutes : DEFAULT_INACTIVITY_MINUTES
}

export function getInactivityTimeoutMs() {
  return parseInactivityMinutes(import.meta.env.VITE_AUTO_LOGOUT_MINUTES) * 60_000
}
