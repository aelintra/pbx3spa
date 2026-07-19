import { describe, expect, it } from 'vitest'
import { DEFAULT_INACTIVITY_MINUTES, parseInactivityMinutes } from './inactivity'

describe('parseInactivityMinutes', () => {
  it('accepts a positive configurable value', () => {
    expect(parseInactivityMinutes('15')).toBe(15)
    expect(parseInactivityMinutes('0.5')).toBe(0.5)
  })

  it('uses ten minutes for missing or invalid values', () => {
    expect(DEFAULT_INACTIVITY_MINUTES).toBe(10)
    expect(parseInactivityMinutes(undefined)).toBe(10)
    expect(parseInactivityMinutes('')).toBe(10)
    expect(parseInactivityMinutes('0')).toBe(10)
    expect(parseInactivityMinutes('-2')).toBe(10)
    expect(parseInactivityMinutes('later')).toBe(10)
  })
})
