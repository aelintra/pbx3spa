/**
 * Tenant-scoped greeting dropdown helpers (queue.greetnum, ivrmenu.greetnum).
 * Values are numeric greeting pkeys; GenClass plays usergreeting{pkey}.
 */

export function greetingNumberFromStored(value) {
  if (value == null || value === '' || String(value).trim() === 'None') return 'None'
  const s = String(value).trim()
  const prefixed = s.match(/^usergreeting(\d+)$/i)
  if (prefixed) return prefixed[1]
  return s
}

export function greetingNumberFromRecord(record) {
  return greetingNumberFromStored(record?.pkey)
}

/** cluster identifiers that match a tenant row (pkey, shortuid, id). */
export function tenantClusterIdentifiers(tenants, tenantPkey) {
  if (!tenantPkey) return []
  const t = tenants.find((x) => String(x.pkey) === String(tenantPkey))
  const keys = t ? [t.pkey, t.shortuid, t.id] : [tenantPkey]
  return [...new Set(keys.filter((k) => k != null && k !== '').map(String))]
}

export function filterGreetingsForTenant(greetings, tenants, tenantPkey) {
  const ids = new Set(tenantClusterIdentifiers(tenants, tenantPkey))
  if (!ids.size) return []
  return (Array.isArray(greetings) ? greetings : []).filter((g) =>
    ids.has(String(g.cluster ?? ''))
  )
}

/** FormSelect options: None + tenant greetings; keeps legacy value if missing from list. */
export function buildGreetnumSelectOptions(greetings, currentValue = 'None') {
  const opts = [{ value: 'None', label: 'None' }]
  const seen = new Set(['None'])

  for (const g of greetings) {
    const num = greetingNumberFromRecord(g)
    if (!num || num === 'None' || seen.has(num)) continue
    seen.add(num)
    const name = (g.cname ?? '').trim() || (g.description ?? '').trim()
    opts.push({
      value: num,
      label: name ? `${num} — ${name}` : String(num)
    })
  }

  const sorted = opts.slice(1).sort((a, b) => {
    const an = Number.parseInt(a.value, 10)
    const bn = Number.parseInt(b.value, 10)
    if (Number.isFinite(an) && Number.isFinite(bn)) return an - bn
    return String(a.label).localeCompare(String(b.label))
  })

  const cur = greetingNumberFromStored(currentValue)
  if (cur && cur !== 'None' && !seen.has(cur)) {
    sorted.unshift({ value: cur, label: `${cur} (not in tenant list)` })
  }

  return [{ value: 'None', label: 'None' }, ...sorted]
}
