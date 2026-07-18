/**
 * Timezone display helpers for Network (and similar) panels.
 * API still saves IANA identifiers (e.g. America/New_York).
 */

/** Common operator picks — shown first when the list is unfiltered. */
export const COMMON_TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (US) — America/New_York' },
  { value: 'America/Chicago', label: 'Central Time (US) — America/Chicago' },
  { value: 'America/Denver', label: 'Mountain Time (US) — America/Denver' },
  { value: 'America/Phoenix', label: 'Arizona (no DST) — America/Phoenix' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US) — America/Los_Angeles' },
  { value: 'America/Anchorage', label: 'Alaska — America/Anchorage' },
  { value: 'Pacific/Honolulu', label: 'Hawaii — Pacific/Honolulu' },
  { value: 'UTC', label: 'UTC — UTC' },
  { value: 'Europe/London', label: 'UK — Europe/London' }
]

const COMMON_BY_VALUE = new Map(COMMON_TIMEZONES.map((o) => [o.value, o]))

/**
 * @param {string} id IANA timezone id
 * @returns {string}
 */
export function timezoneLabel(id) {
  const s = String(id ?? '').trim()
  if (!s) return ''
  const known = COMMON_BY_VALUE.get(s)
  if (known) return known.label
  return s.replace(/_/g, ' ')
}

/**
 * @param {string[]} ids
 * @returns {{ value: string, label: string }[]}
 */
export function buildTimezoneOptions(ids) {
  const list = Array.isArray(ids) ? ids : []
  const seen = new Set()
  const out = []
  for (const c of COMMON_TIMEZONES) {
    if (list.includes(c.value) || c.value === 'UTC') {
      out.push(c)
      seen.add(c.value)
    }
  }
  const rest = list
    .filter((id) => id && !seen.has(id))
    .slice()
    .sort((a, b) => a.localeCompare(b))
    .map((id) => ({ value: id, label: timezoneLabel(id) }))
  return [...out, ...rest]
}

/**
 * @param {{ value: string, label: string }[]} options
 * @param {string} query
 * @param {number} [limit]
 */
export function filterTimezoneOptions(options, query, limit = 80) {
  const q = String(query ?? '')
    .trim()
    .toLowerCase()
  const list = Array.isArray(options) ? options : []
  if (!q) {
    // Unfiltered: common first (already first in build), then cap so the menu stays usable.
    return list.slice(0, Math.max(limit, COMMON_TIMEZONES.length))
  }
  const matches = list.filter((o) => {
    const hay = `${o.label} ${o.value}`.toLowerCase()
    return hay.includes(q) || q.split(/\s+/).every((part) => hay.includes(part))
  })
  return matches.slice(0, limit)
}
