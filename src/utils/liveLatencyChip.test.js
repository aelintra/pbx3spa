import { describe, expect, it } from 'vitest'
import {
  liveLatencyChipClassSuffix,
  liveLatencyChipLabel,
  parseLatencyMsFromStatus
} from './liveLatencyChip.js'

describe('liveLatencyChip', () => {
  it('parses OK (N ms)', () => {
    expect(parseLatencyMsFromStatus('OK (5 ms)')).toBe(5)
    expect(parseLatencyMsFromStatus('OK (150 ms)')).toBe(150)
    expect(parseLatencyMsFromStatus('Unknown')).toBeNull()
  })

  it('labels ms values', () => {
    expect(liveLatencyChipLabel('OK (42 ms)')).toBe('42 ms')
    expect(liveLatencyChipLabel('Unknown')).toBe('Unknown')
  })

  it('colors: green <100, yellow 100–200, orange 201–300, red >300', () => {
    expect(liveLatencyChipClassSuffix('OK (99 ms)')).toBe('list-chip--on')
    expect(liveLatencyChipClassSuffix('OK (100 ms)')).toBe('list-chip--latency-warn')
    expect(liveLatencyChipClassSuffix('OK (200 ms)')).toBe('list-chip--latency-warn')
    expect(liveLatencyChipClassSuffix('OK (201 ms)')).toBe('list-chip--latency-caution')
    expect(liveLatencyChipClassSuffix('OK (300 ms)')).toBe('list-chip--latency-caution')
    expect(liveLatencyChipClassSuffix('OK (301 ms)')).toBe('list-chip--latency-bad')
  })
})
