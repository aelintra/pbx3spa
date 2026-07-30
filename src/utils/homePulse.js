/**
 * Helpers for Instance / tenant Home pulse UI.
 */

/** @param {string[]|undefined|null} include */
export function buildIncludeQuery(include) {
  if (!include || include.length === 0) return undefined
  const allowed = ['system', 'live', 'cdr']
  const parts = include.filter((x) => allowed.includes(x))
  if (parts.length === 0 || parts.length === allowed.length) return undefined
  return parts.join(',')
}

/**
 * Colour band for used % (disk/mem) — kinship with SBC posture strip.
 * @param {number|null|undefined} pct
 * @returns {'ok'|'warn'|'hot'|'unknown'}
 */
export function usedPctBand(pct) {
  if (pct == null || Number.isNaN(Number(pct))) return 'unknown'
  const n = Number(pct)
  if (n >= 90) return 'hot'
  if (n >= 75) return 'warn'
  return 'ok'
}

/**
 * Load vs CPU count band.
 * @param {number|null|undefined} load1
 * @param {number|null|undefined} cpus
 */
export function loadBand(load1, cpus) {
  if (load1 == null || Number.isNaN(Number(load1))) return 'unknown'
  const c = Math.max(1, Number(cpus) || 1)
  const ratio = Number(load1) / c
  if (ratio >= 1.5) return 'hot'
  if (ratio >= 0.85) return 'warn'
  return 'ok'
}

/**
 * Continuous green → amber → red for used-% swatches (Outcomes-legend kinship).
 * @param {number|null|undefined} pct
 * @returns {string} css color
 */
export function usedPctSwatchColor(pct) {
  if (pct == null || Number.isNaN(Number(pct))) return '#94a3b8'
  const t = Math.min(100, Math.max(0, Number(pct))) / 100
  const green = [22, 163, 74]
  const amber = [234, 179, 8]
  const red = [220, 38, 38]
  if (t <= 0.5) {
    return rgbToCss(lerpRgb(green, amber, t / 0.5))
  }
  return rgbToCss(lerpRgb(amber, red, (t - 0.5) / 0.5))
}

/** @param {string|number|null|undefined} raw  e.g. "83%" or 83 */
export function parseUsedPct(raw) {
  if (raw == null || raw === '') return null
  if (typeof raw === 'number') return Number.isNaN(raw) ? null : raw
  const m = String(raw).match(/(\d+(?:\.\d+)?)/)
  return m ? Number(m[1]) : null
}

/** @param {[number, number, number]} a @param {[number, number, number]} b */
function lerpRgb(a, b, t) {
  const u = Math.min(1, Math.max(0, t))
  return [
    Math.round(a[0] + (b[0] - a[0]) * u),
    Math.round(a[1] + (b[1] - a[1]) * u),
    Math.round(a[2] + (b[2] - a[2]) * u)
  ]
}

/** @param {[number, number, number]} rgb */
function rgbToCss(rgb) {
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`
}

export function formatPct(pct) {
  if (pct == null || Number.isNaN(Number(pct))) return '—'
  return `${Number(pct).toFixed(0)}%`
}

/**
 * Memory sizes on Home — always GB (one decimal), same unit as Disk.
 * @param {number|null|undefined} mb  total/available in mebibytes
 */
export function formatMemGb(mb) {
  if (mb == null || Number.isNaN(Number(mb))) return '—'
  const gb = Number(mb) / 1024
  return `${gb.toFixed(1)} GB`
}

/**
 * Byte counts from sysnotes (ram_total / ram_free) — always GB.
 * @param {number|string|null|undefined} bytes
 */
export function formatBytesAsGb(bytes) {
  if (bytes == null || bytes === '') return '—'
  const n = parseInt(String(bytes), 10)
  if (Number.isNaN(n)) return String(bytes)
  return `${(n / 1073741824).toFixed(1)} GB`
}

export function displayOrDash(val) {
  if (val == null || val === '') return '—'
  return String(val)
}
