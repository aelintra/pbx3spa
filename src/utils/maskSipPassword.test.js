import { describe, expect, it } from 'vitest'
import {
  maskSipPassword,
  sipPasswordFieldType,
  sipPasswordFieldValue,
  sipPasswordMaskDisplay
} from './maskSipPassword.js'

describe('maskSipPassword', () => {
  it('masked by default when a password exists (text + bullets, not type=password)', () => {
    const field = maskSipPassword('S3cr3t!', false)
    expect(field.type).toBe('text')
    expect(field.value).toBe(sipPasswordMaskDisplay('S3cr3t!'))
    expect(field.value).not.toBe('S3cr3t!')
    expect(field.placeholder).toBe('')
  })

  it('reveals cleartext only when revealed=true', () => {
    const field = maskSipPassword('S3cr3t!', true)
    expect(field.type).toBe('text')
    expect(field.value).toBe('S3cr3t!')
  })

  it('shows em-dash placeholder when there is no password', () => {
    expect(maskSipPassword(null, false)).toEqual({ value: '', type: 'text', placeholder: '—' })
    expect(maskSipPassword(undefined, true)).toEqual({
      value: '',
      type: 'text',
      placeholder: '—'
    })
    expect(maskSipPassword('', false)).toEqual({ value: '', type: 'text', placeholder: '—' })
  })

  it('coerces non-string passwd values to string', () => {
    expect(sipPasswordFieldValue(12345)).toBe('12345')
    expect(sipPasswordFieldValue(null)).toBe('')
  })

  it('sipPasswordFieldType is always text (avoid browser password save)', () => {
    expect(sipPasswordFieldType(true, true)).toBe('text')
    expect(sipPasswordFieldType(true, false)).toBe('text')
    expect(sipPasswordFieldType(false, true)).toBe('text')
    expect(sipPasswordFieldType(false, false)).toBe('text')
  })

  it('sipPasswordMaskDisplay clamps bullet count', () => {
    expect(sipPasswordMaskDisplay('ab').length).toBe(8)
    expect(sipPasswordMaskDisplay('x'.repeat(40)).length).toBe(24)
  })
})
