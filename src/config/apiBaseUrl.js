/**
 * Resolve API base URL for the browser.
 * In local Vite dev, route API calls through the dev server proxy (/api → VITE_API_PROXY_TARGET).
 */
export function resolveApiBaseUrl(url) {
  const trimmed = (url ?? '').trim().replace(/\/$/, '')
  if (!trimmed) return ''

  if (import.meta.env.DEV && typeof window !== 'undefined') {
    const origin = window.location.origin
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
      return `${origin}/api`
    }
  }

  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`
}
