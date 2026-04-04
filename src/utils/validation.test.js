import { describe, expect, it } from 'vitest'
import {
  validateAgentPkey,
  validateAgentPasswd,
  validateConferencePkey,
  validateCosPkey,
  validateCustomAppPkey,
  validateGreetnum,
  validateInboundRoutePkey,
  validateIvrPkey,
  validateQueuePkey,
  validateTenant
} from './validation.js'

describe('validateIvrPkey', () => {
  it('rejects empty and invalid patterns', () => {
    expect(validateIvrPkey('')).toBe('IVR Direct Dial is required')
    expect(validateIvrPkey('  ')).toBe('IVR Direct Dial is required')
    expect(validateIvrPkey('12')).toBe('Must be 3-5 numeric digits')
    expect(validateIvrPkey('123456')).toBe('Must be 3-5 numeric digits')
  })

  it('accepts 3–5 digits', () => {
    expect(validateIvrPkey('123')).toBeNull()
    expect(validateIvrPkey('12345')).toBeNull()
  })
})

describe('validateQueuePkey', () => {
  it('matches digit rules', () => {
    expect(validateQueuePkey('')).toBe('Queue number is required')
    expect(validateQueuePkey('ab')).toBe('Must be 3-5 digits')
    expect(validateQueuePkey('201')).toBeNull()
  })
})

describe('validateTenant', () => {
  it('requires non-empty', () => {
    expect(validateTenant('')).toBe('Tenant is required')
    expect(validateTenant('t1')).toBeNull()
  })
})

describe('validateAgentPkey', () => {
  it('requires integer in 1000–9999', () => {
    expect(validateAgentPkey('')).toBe('Agent number is required')
    expect(validateAgentPkey('999')).toBe('Must be 1000–9999')
    expect(validateAgentPkey('10000')).toBe('Must be 1000–9999')
    expect(validateAgentPkey('1000')).toBeNull()
  })
})

describe('validateAgentPasswd', () => {
  it('requires integer in 1001–9999', () => {
    expect(validateAgentPasswd('1000')).toBe('Must be 1001–9999')
    expect(validateAgentPasswd('1001')).toBeNull()
  })
})

describe('validateInboundRoutePkey', () => {
  it('rejects single 0 and invalid patterns', () => {
    expect(validateInboundRoutePkey('0')).toBe('Number cannot be a single 0')
    expect(validateInboundRoutePkey('abc')).toContain('valid Asterisk')
  })

  it('accepts digits and pattern / special tokens', () => {
    expect(validateInboundRoutePkey('0123456789')).toBeNull()
    // After `_`, only X Z N . ! are allowed (not numeric digits)
    expect(validateInboundRoutePkey('_XXXX')).toBeNull()
    expect(validateInboundRoutePkey('s')).toBeNull()
  })
})

describe('validateGreetnum', () => {
  it('allows empty / None', () => {
    expect(validateGreetnum('')).toBeNull()
    expect(validateGreetnum('None')).toBeNull()
  })

  it('requires 4 digits when set', () => {
    expect(validateGreetnum('12')).toContain('4-digit')
    expect(validateGreetnum('1234')).toBeNull()
  })
})

describe('validateCustomAppPkey', () => {
  it('enforces alpha_dash', () => {
    expect(validateCustomAppPkey('bad name')).toContain('letters')
    expect(validateCustomAppPkey('app_1')).toBeNull()
  })
})

describe('validateConferencePkey', () => {
  it('requires positive integer', () => {
    expect(validateConferencePkey('0')).toBe('Must be a positive number')
    expect(validateConferencePkey('1')).toBeNull()
  })
})

describe('validateCosPkey', () => {
  it('requires allowed characters', () => {
    expect(validateCosPkey('a b')).toContain('letters')
    expect(validateCosPkey('cos1')).toBeNull()
  })
})
