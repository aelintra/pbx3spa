/**
 * LE helper scripts often emit Shorewall / iptables-restore logs alongside certbot.
 * Mirrors pbx3api CertificateController::leSyscmdDetailForClient so the SPA stays
 * readable when talking to an API that still returns raw syscmd output.
 *
 * @param {string|null|undefined} out
 * @returns {string}
 */
export function sanitizeLeSyscmdDetail(out) {
  const raw = String(out ?? '').trim()
  if (!raw) {
    return ''
  }
  const lines = raw.split(/\r?\n/)
  const kept = []
  for (const line of lines) {
    if (isLeSyscmdFirewallNoiseLine(line)) {
      continue
    }
    kept.push(line)
  }
  let filtered = kept.join('\n').trim()
  if (!filtered) {
    return ''
  }
  const max = 3500
  if (filtered.length > max) {
    return `\u2026${filtered.slice(-max)}`
  }
  return filtered
}

/** @param {string} line */
function isLeSyscmdFirewallNoiseLine(line) {
  if (line.trim() === '') {
    return true
  }
  if (line.toLowerCase().includes('shorewall')) {
    return true
  }
  if (/iptables-restore|ip6tables-restore/.test(line)) {
    return true
  }
  return false
}
