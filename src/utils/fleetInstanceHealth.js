/**
 * Fleet Instances health badge from catalog last_seen_at + Gatekeeper health overlay.
 *
 * Thresholds (agreed): Healthy ≤2m, Warning ≤5m, Degraded >5m, Down when unreachable.
 * Maintenance / decommissioned → Probe paused (no RTT).
 */

export const HEALTHY_MAX_MS = 2 * 60 * 1000
export const WARNING_MAX_MS = 5 * 60 * 1000

/**
 * @typedef {Object} InstanceHealthOverlay
 * @property {boolean} [probe_paused]
 * @property {boolean|null} [reachable]
 * @property {number|null} [consecutive_misses]
 * @property {string|null} [last_ok_at]
 * @property {string|null} [last_probe_at]
 * @property {number|null} [last_rtt_ms]
 * @property {string|null} [egress_state]
 * @property {number|null} [egress_rtt_ms]
 * @property {string|null} [egress_probed_at]
 */

/**
 * @typedef {Object} FleetHealthBadge
 * @property {'healthy'|'warning'|'degraded'|'down'|'paused'|'unknown'} kind
 * @property {string} label
 */

/**
 * @param {string|null|undefined} iso
 * @param {number} [nowMs]
 * @returns {number|null} age in ms, or null if unparseable
 */
export function ageMsFromIso(iso, nowMs = Date.now()) {
  if (!iso || typeof iso !== 'string') return null
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return null
  return Math.max(0, nowMs - t)
}

/**
 * @param {{
 *   status?: string|null,
 *   last_seen_at?: string|null,
 *   health?: InstanceHealthOverlay|null
 * }} row
 * @param {number} [nowMs]
 * @returns {FleetHealthBadge}
 */
export function instanceHealthBadge(row, nowMs = Date.now()) {
  const status = String(row?.status ?? 'active').toLowerCase()
  if (status === 'maintenance' || status === 'decommissioned') {
    return { kind: 'paused', label: 'Probe paused' }
  }

  const health = row?.health
  if (health?.probe_paused) {
    return { kind: 'paused', label: 'Probe paused' }
  }
  if (health?.reachable === false) {
    return { kind: 'down', label: 'Down' }
  }

  const age =
    ageMsFromIso(row?.last_seen_at, nowMs) ??
    ageMsFromIso(health?.last_ok_at, nowMs)

  if (age == null) {
    return { kind: 'unknown', label: 'Unknown' }
  }
  if (age <= HEALTHY_MAX_MS) {
    return { kind: 'healthy', label: 'Healthy' }
  }
  if (age <= WARNING_MAX_MS) {
    return { kind: 'warning', label: 'Warning' }
  }
  return { kind: 'degraded', label: 'Degraded' }
}

/**
 * @param {number|null|undefined} rttMs
 * @returns {string|null}
 */
export function formatProbeRtt(rttMs) {
  if (rttMs == null || !Number.isFinite(Number(rttMs))) return null
  const n = Math.max(0, Math.round(Number(rttMs)))
  return `${n} ms`
}

/**
 * Show RTT only for active (probed) instances that are not down.
 * @param {{
 *   status?: string|null,
 *   health?: InstanceHealthOverlay|null
 * }} row
 * @returns {string|null}
 */
export function probeRttLabel(row) {
  const status = String(row?.status ?? 'active').toLowerCase()
  if (status === 'maintenance' || status === 'decommissioned') return null
  const health = row?.health
  if (health?.probe_paused || health?.reachable === false) return null
  return formatProbeRtt(health?.last_rtt_ms)
}

/**
 * Login instance picker: reachability from public catalog last_seen_at (no Gatekeeper health overlay).
 * Does not surface lifecycle ACTIVE (that only means still enrolled, not online).
 *
 * @param {{
 *   status?: string|null,
 *   last_seen_at?: string|null,
 *   health?: InstanceHealthOverlay|null
 * }} row
 * @param {number} [nowMs]
 * @returns {FleetHealthBadge}
 */
export function loginAvailabilityBadge(row, nowMs = Date.now()) {
  const status = String(row?.status ?? 'active').toLowerCase()
  if (status === 'maintenance') {
    return { kind: 'paused', label: 'Maintenance' }
  }
  if (status === 'decommissioned') {
    return { kind: 'paused', label: 'Decommissioned' }
  }

  const health = instanceHealthBadge(row, nowMs)
  if (health.kind === 'healthy') {
    return { kind: 'healthy', label: 'Available' }
  }
  if (health.kind === 'warning') {
    return { kind: 'warning', label: 'Warning' }
  }
  // Stale last_seen (or explicit probe Down) → not a place to sign in
  if (health.kind === 'degraded' || health.kind === 'down') {
    return { kind: 'down', label: 'Unavailable' }
  }
  if (health.kind === 'paused') {
    return health
  }
  return { kind: 'unknown', label: 'Unknown' }
}

/**
 * Egress qualify badge from Gatekeeper health overlay (AMI via fleet.token probe).
 * @param {{
 *   status?: string|null,
 *   health?: InstanceHealthOverlay|null
 * }} row
 * @returns {{ kind: 'avail'|'unavail'|'unknown'|'hidden', label: string }|null}
 */
export function instanceEgressBadge(row) {
  const status = String(row?.status ?? 'active').toLowerCase()
  if (status === 'maintenance' || status === 'decommissioned') {
    return null
  }
  const health = row?.health
  if (health?.probe_paused || health?.reachable === false) {
    return null
  }
  const state = String(health?.egress_state ?? '')
  if (state === 'Avail') {
    const rtt = formatProbeRtt(health?.egress_rtt_ms)
    return {
      kind: 'avail',
      label: rtt ? `Egress Avail · ${rtt}` : 'Egress Avail'
    }
  }
  if (state === 'Unavail') {
    return { kind: 'unavail', label: 'Egress Unavail' }
  }
  if (state === 'Unknown' || state === '') {
    return { kind: 'unknown', label: 'Egress Unknown' }
  }
  return { kind: 'unknown', label: 'Egress Unknown' }
}
