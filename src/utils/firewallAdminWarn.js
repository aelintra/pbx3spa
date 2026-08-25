/**
 * Pure helpers for Firewall SPA F11 warning (SSH/API still from any).
 */

export const ADMIN_PORTS = new Set(['22', '44300'])

export function portTouchesAdmin(port) {
  const p = String(port || '').trim()
  if (!p || /^n\/?a$/i.test(p)) return false
  if (ADMIN_PORTS.has(p)) return true
  const m = p.match(/^(\d+):(\d+)$/)
  if (!m) return false
  const lo = Number(m[1])
  const hi = Number(m[2])
  return [...ADMIN_PORTS].some((ap) => {
    const n = Number(ap)
    return n >= lo && n <= hi
  })
}

export function isWideOpenFrom(from) {
  const f = String(from || '').trim().toLowerCase()
  return f === '' || f === 'any'
}

/** True while :22 or :44300 still allow from any (tcp/all). */
export function showAdminPortWarn(rules) {
  return (rules || []).some((r) => {
    const proto = String(r.proto || '').toLowerCase()
    if (proto !== 'tcp' && proto !== 'all') return false
    if (!portTouchesAdmin(r.port)) return false
    return isWideOpenFrom(r.from)
  })
}

export function adminPortsWideOpen(rules) {
  const found = new Set()
  for (const r of rules || []) {
    const proto = String(r.proto || '').toLowerCase()
    if (proto !== 'tcp' && proto !== 'all') continue
    if (!isWideOpenFrom(r.from)) continue
    const p = String(r.port || '').trim()
    if (ADMIN_PORTS.has(p)) found.add(p)
    else if (portTouchesAdmin(p)) {
      for (const ap of ADMIN_PORTS) {
        const n = Number(ap)
        const m = p.match(/^(\d+):(\d+)$/)
        if (m && n >= Number(m[1]) && n <= Number(m[2])) found.add(ap)
      }
    }
  }
  return [...found].sort((a, b) => Number(a) - Number(b))
}
