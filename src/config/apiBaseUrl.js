/**
 * Resolve API base URL for the browser.
 * In local Vite dev, only use /api proxy when the target host matches VITE_API_PROXY_TARGET
 * (or the user entered the dev-server URL). Otherwise use the URL they typed (other nodes).
 */

function normalizeApiBase(url) {
  const trimmed = (url ?? '').trim().replace(/\/$/, '')
  if (!trimmed) return ''
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`
}

/** @returns {string} hostname:port for comparison */
function hostPort(urlString) {
  const withScheme = urlString.includes('://') ? urlString : `https://${urlString}`
  const u = new URL(withScheme)
  const port = u.port || (u.protocol === 'https:' ? '443' : '80')
  return `${u.hostname}:${port}`
}

export function resolveApiBaseUrl(url) {
  const normalized = normalizeApiBase(url)
  if (!normalized) return ''

  if (!import.meta.env.DEV || typeof window === 'undefined') {
    return normalized
  }

  const origin = window.location.origin
  if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
    return normalized
  }

  if (/^https?:\/\/(localhost|127\.0\.0\.1)/i.test(normalized)) {
    return `${origin}/api`
  }

  const proxyTarget = (import.meta.env.VITE_API_PROXY_TARGET ?? '').trim()
  if (!proxyTarget) {
    return normalized
  }

  try {
    const proxyHp = hostPort(
      proxyTarget.endsWith('/api') ? proxyTarget : `${proxyTarget.replace(/\/$/, '')}/api`
    )
    if (hostPort(normalized) === proxyHp) {
      return `${origin}/api`
    }
  } catch {
    // ignore parse errors — use direct URL
  }

  return normalized
}
