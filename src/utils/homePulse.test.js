import { describe, it, expect } from 'vitest'
import {
  buildIncludeQuery,
  usedPctBand,
  loadBand,
  formatPct,
  formatMemGb,
  formatBytesAsGb,
  usedPctSwatchColor,
  parseUsedPct
} from './homePulse.js'

describe('buildIncludeQuery', () => {
  it('returns undefined for full or empty include', () => {
    expect(buildIncludeQuery(null)).toBeUndefined()
    expect(buildIncludeQuery(['system', 'live', 'cdr'])).toBeUndefined()
  })

  it('joins subset', () => {
    expect(buildIncludeQuery(['cdr', 'live'])).toBe('cdr,live')
  })
})

describe('usedPctBand', () => {
  it('bands thresholds', () => {
    expect(usedPctBand(10)).toBe('ok')
    expect(usedPctBand(80)).toBe('warn')
    expect(usedPctBand(95)).toBe('hot')
    expect(usedPctBand(null)).toBe('unknown')
  })
})

describe('loadBand', () => {
  it('compares load to cpus', () => {
    expect(loadBand(0.5, 2)).toBe('ok')
    expect(loadBand(1.8, 2)).toBe('warn')
    expect(loadBand(4, 2)).toBe('hot')
  })
})

describe('formatPct', () => {
  it('formats or dash', () => {
    expect(formatPct(41.2)).toBe('41%')
    expect(formatPct(null)).toBe('—')
  })
})

describe('formatMemGb', () => {
  it('formats mebibytes as GB', () => {
    expect(formatMemGb(1837)).toBe('1.8 GB')
    expect(formatMemGb(null)).toBe('—')
  })
})

describe('formatBytesAsGb', () => {
  it('formats byte counts as GB', () => {
    expect(formatBytesAsGb(1932735283)).toBe('1.8 GB')
    expect(formatBytesAsGb(149946368)).toBe('0.1 GB')
    expect(formatBytesAsGb(null)).toBe('—')
  })
})

describe('usedPctSwatchColor', () => {
  it('graduates green to red', () => {
    expect(usedPctSwatchColor(0)).toMatch(/^rgb\(/)
    expect(usedPctSwatchColor(50)).toMatch(/^rgb\(/)
    expect(usedPctSwatchColor(100)).toBe('rgb(220, 38, 38)')
    expect(usedPctSwatchColor(null)).toBe('#94a3b8')
  })
})

describe('parseUsedPct', () => {
  it('parses percent strings', () => {
    expect(parseUsedPct('83%')).toBe(83)
    expect(parseUsedPct(56)).toBe(56)
    expect(parseUsedPct(null)).toBeNull()
  })
})
