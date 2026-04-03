/** AMI latency string often starts with OK, e.g. `OK (5 ms)`. */
export const STATUS_OK_REGEX = /^OK/

/** Parse RTT milliseconds from AMI latency string, e.g. `OK (5 ms)` → 5. */
export function parseLatencyMsFromStatus(s) {
  if (!s || typeof s !== 'string') return null
  const m = s.match(/(\d+)\s*ms\b/i)
  if (!m) return null
  const n = parseInt(m[1], 10)
  return Number.isFinite(n) ? n : null
}

/** Pill label for extensions/trunks live latency column. */
export function liveLatencyChipLabel(s) {
  if (s === '…') return 'Live…'
  if (s === 'Unknown') return 'Unknown'
  const ms = parseLatencyMsFromStatus(s)
  if (ms != null) return `${ms} ms`
  if (STATUS_OK_REGEX.test((s ?? '').trim())) return 'Online'
  return String(s ?? '')
}

/** Pill class suffix (use with `.list-chip`). Green ≤100ms, orange 101–200ms, red >200ms. */
export function liveLatencyChipClassSuffix(s) {
  if (s === '…') return 'list-chip--pending'
  if (s === 'Unknown') return 'list-chip--unknown'
  const ms = parseLatencyMsFromStatus(s)
  if (ms != null) {
    if (ms <= 100) return 'list-chip--on'
    if (ms <= 200) return 'list-chip--latency-warn'
    return 'list-chip--latency-bad'
  }
  if (STATUS_OK_REGEX.test((s ?? '').trim())) return 'list-chip--on'
  return 'list-chip--neutral'
}

/** Row counts “online” when live string looks like a reachable OK* response. */
export function isLiveStatusOnline(s) {
  if (s === '…' || s === 'Unknown') return false
  return STATUS_OK_REGEX.test((s ?? '').trim())
}
