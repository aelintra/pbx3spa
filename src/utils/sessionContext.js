/**
 * Human-readable instance signpost from API base URL (e.g. http://host:44300/api → host:44300).
 */
export function defaultInstanceLabelFromBaseUrl(baseUrl) {
  const raw = (baseUrl ?? '').trim()
  if (!raw) return ''
  try {
    const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
    const u = new URL(withProto)
    const host = u.hostname || ''
    const port = u.port
    if (!host) return raw.replace(/\/?api\/?$/i, '').replace(/\/$/, '') || ''
    return port ? `${host}:${port}` : host
  } catch {
    return raw
      .replace(/^https?:\/\//i, '')
      .replace(/\/?api\/?$/i, '')
      .replace(/\/$/, '')
      .trim()
  }
}
