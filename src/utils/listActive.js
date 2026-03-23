/**
 * Whether a list row counts as "active" for summary tallies (YES/NO, booleans, common truthy strings).
 */
export function isRowActive(active) {
  if (active === true || active === 1) return true
  if (active === false || active === 0) return false
  const s = (active ?? '').toString().trim().toUpperCase()
  if (s === '' || s === '—' || s === '\u2014') return false
  return s === 'YES' || s === 'Y' || s === 'TRUE' || s === '1' || s === 'ON'
}

export function countActiveRows(rows, getActive = (r) => r.active) {
  let n = 0
  for (const row of rows) {
    if (isRowActive(getActive(row))) n += 1
  }
  return n
}
