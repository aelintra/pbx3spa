/**
 * Format Asterisk CDR calldate (UTC wall string) for site-TZ display.
 * @see pbx3/workingdocs/CDR_TIMEZONE_POLICY.md
 */

/**
 * @param {string|null|undefined} calldate UTC `YYYY-MM-DD HH:MM:SS` (or ISO-ish)
 * @param {string|null|undefined} timeZone IANA id (e.g. America/New_York); empty → UTC
 * @returns {string}
 */
export function formatCdrCalldate(calldate, timeZone) {
  const raw = String(calldate ?? '').trim()
  if (!raw) return '—'

  const iso = raw.includes('T') ? raw : raw.replace(' ', 'T')
  const withZ = /Z$|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : `${iso}Z`
  const d = new Date(withZ)
  if (Number.isNaN(d.getTime())) return raw

  const tz = String(timeZone ?? '').trim() || 'UTC'
  try {
    return new Intl.DateTimeFormat(undefined, {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(d)
  } catch {
    return raw
  }
}
