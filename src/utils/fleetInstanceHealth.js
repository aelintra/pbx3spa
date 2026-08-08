/**
 * Fleet Instances health badge from catalog last_seen_at + Gatekeeper health overlay.
 *
 * Thresholds (agreed): Healthy ≤2m, Warning ≤5m, Degraded >5m, Down when unreachable —
 * based on how long since the last successful /up (not probe RTT).
 * Uses the freshest of S3 last_seen_at and health.last_ok_at.
 * Maintenance / decommissioned → Probe paused (no RTT).
 */

export const HEALTHY_MAX_MS = 2 * 60 * 1000
export const WARNING_MAX_MS = 5 * 60 * 1000

/**
 * Login picker is looser than Fleet Instances health (2m/5m).
 * Public S3 `last_seen_at` only updates on successful Gatekeeper /up probes (~60s).
 * If the probe job lags or flops for a short time, tight thresholds mark every
 * enrolled node UNAVAILABLE even while the PBX is fine for Sanctum login.
 *
 * Available ≤15m, Warning ≤60m, Unavailable beyond that (or explicit reachable=false).
 * Missing last_seen → Unknown (not Unavailable).
 */
export const LOGIN_AVAILABLE_MAX_MS = 15 * 60 * 1000
export const LOGIN_WARNING_MAX_MS = 60 * 60 * 1000

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
 * Freshest successful-probe age from catalog last_seen_at and/or health.last_ok_at.
 * Prefer min so a lagged S3 stamp does not paint Warning while Gatekeeper SQLite is fresh
 * (RTT comes from the overlay — matching that clock avoids "Warning · 60 ms" confusion).
 * @param {{
 *   last_seen_at?: string|null,
 *   health?: InstanceHealthOverlay|null
 * }} row
 * @param {number} [nowMs]
 * @returns {number|null}
 */
export function freshestProbeAgeMs(row, nowMs = Date.now()) {
  const ages = [
    ageMsFromIso(row?.last_seen_at, nowMs),
    ageMsFromIso(row?.health?.last_ok_at, nowMs)
  ].filter((a) => a != null)
  if (!ages.length) return null
  return Math.min(...ages)
}

/**
 * Compact age for status detail (e.g. 45s, 2m 10s).
 * @param {number|null|undefined} ageMs
 * @returns {string|null}
 */
export function formatProbeAge(ageMs) {
  if (ageMs == null || !Number.isFinite(Number(ageMs))) return null
  const s = Math.max(0, Math.round(Number(ageMs) / 1000))
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const rem = s % 60
  if (m < 60) return rem ? `${m}m ${rem}s` : `${m}m`
  const h = Math.floor(m / 60)
  const mRem = m % 60
  return mRem ? `${h}h ${mRem}m` : `${h}h`
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

  const age = freshestProbeAgeMs(row, nowMs)

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
 * Uses LOGIN_* thresholds (not Fleet 2m/5m) so a brief probe outage does not paint the whole fleet red.
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

  const health = row?.health
  if (health?.probe_paused) {
    return { kind: 'paused', label: 'Probe paused' }
  }
  if (health?.reachable === false) {
    return { kind: 'down', label: 'Unavailable' }
  }

  const age =
    ageMsFromIso(row?.last_seen_at, nowMs) ?? ageMsFromIso(health?.last_ok_at, nowMs)

  if (age == null) {
    return { kind: 'unknown', label: 'Unknown' }
  }
  if (age <= LOGIN_AVAILABLE_MAX_MS) {
    return { kind: 'healthy', label: 'Available' }
  }
  if (age <= LOGIN_WARNING_MAX_MS) {
    return { kind: 'warning', label: 'Warning' }
  }
  return { kind: 'down', label: 'Unavailable' }
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
