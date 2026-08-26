/** Instance globals default: 600 seconds = 10 minutes idle before SPA logout. */
export const DEFAULT_SESSION_TIMEOUT_SECONDS = 600

/**
 * @param {unknown} value
 * @returns {number} positive seconds
 */
export function parseSessionTimeoutSeconds(value) {
  const seconds = Number(value)
  return Number.isFinite(seconds) && seconds > 0 ? seconds : DEFAULT_SESSION_TIMEOUT_SECONDS
}

/**
 * Build-time / fleet fallback when instance `sessiontimout` is not loaded yet.
 * @returns {number} milliseconds
 */
export function getFallbackInactivityTimeoutMs() {
  const envMinutes = import.meta.env.VITE_AUTO_LOGOUT_MINUTES
  if (envMinutes != null && envMinutes !== '') {
    const minutes = Number(envMinutes)
    if (Number.isFinite(minutes) && minutes > 0) return minutes * 60_000
  }
  return DEFAULT_SESSION_TIMEOUT_SECONDS * 1000
}

/**
 * @param {unknown} seconds
 * @returns {number} milliseconds
 */
export function sessionTimeoutSecondsToMs(seconds) {
  return parseSessionTimeoutSeconds(seconds) * 1000
}

/** @deprecated use DEFAULT_SESSION_TIMEOUT_SECONDS / parseSessionTimeoutSeconds */
export const DEFAULT_INACTIVITY_MINUTES = DEFAULT_SESSION_TIMEOUT_SECONDS / 60

/** @deprecated use parseSessionTimeoutSeconds */
export function parseInactivityMinutes(value) {
  const minutes = Number(value)
  return Number.isFinite(minutes) && minutes > 0 ? minutes : DEFAULT_INACTIVITY_MINUTES
}

/** @deprecated use getFallbackInactivityTimeoutMs */
export function getInactivityTimeoutMs() {
  return getFallbackInactivityTimeoutMs()
}
