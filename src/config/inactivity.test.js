import { describe, expect, it } from 'vitest'
import {
  DEFAULT_INACTIVITY_MINUTES,
  DEFAULT_SESSION_TIMEOUT_SECONDS,
  getFallbackInactivityTimeoutMs,
  parseInactivityMinutes,
  parseSessionTimeoutSeconds,
  sessionTimeoutSecondsToMs
} from './inactivity'

describe('parseSessionTimeoutSeconds', () => {
  it('accepts a positive configurable value', () => {
    expect(parseSessionTimeoutSeconds('900')).toBe(900)
    expect(parseSessionTimeoutSeconds(120)).toBe(120)
  })

  it('uses 600 seconds for missing or invalid values', () => {
    expect(DEFAULT_SESSION_TIMEOUT_SECONDS).toBe(600)
    expect(parseSessionTimeoutSeconds(undefined)).toBe(600)
    expect(parseSessionTimeoutSeconds('')).toBe(600)
    expect(parseSessionTimeoutSeconds('0')).toBe(600)
    expect(parseSessionTimeoutSeconds('-2')).toBe(600)
    expect(parseSessionTimeoutSeconds('later')).toBe(600)
  })
})

describe('sessionTimeoutSecondsToMs', () => {
  it('converts seconds to milliseconds', () => {
    expect(sessionTimeoutSecondsToMs(600)).toBe(600_000)
  })
})

describe('getFallbackInactivityTimeoutMs', () => {
  it('defaults to 600 seconds when env unset', () => {
    expect(getFallbackInactivityTimeoutMs()).toBe(600_000)
  })
})

describe('parseInactivityMinutes (deprecated)', () => {
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
