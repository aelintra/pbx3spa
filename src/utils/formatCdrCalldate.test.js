import { describe, it, expect } from 'vitest'
import { formatCdrCalldate } from './formatCdrCalldate.js'

describe('formatCdrCalldate', () => {
  it('formats UTC wall string into America/New_York', () => {
    // 2026-08-01 20:30:00 UTC → 16:30 Eastern (EDT)
    const s = formatCdrCalldate('2026-08-01 20:30:00', 'America/New_York')
    expect(s).toMatch(/2026/)
    expect(s).toMatch(/16:30/)
  })

  it('keeps UTC when timezone is UTC', () => {
    const s = formatCdrCalldate('2026-08-01 20:30:00', 'UTC')
    expect(s).toMatch(/20:30/)
  })

  it('returns em dash for empty', () => {
    expect(formatCdrCalldate('', 'UTC')).toBe('—')
    expect(formatCdrCalldate(null, 'UTC')).toBe('—')
  })

  it('returns raw string when unparseable', () => {
    expect(formatCdrCalldate('not-a-date', 'UTC')).toBe('not-a-date')
  })
})
