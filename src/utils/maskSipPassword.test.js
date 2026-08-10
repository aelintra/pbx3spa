import { describe, expect, it } from 'vitest'
import { maskSipPassword, sipPasswordFieldType, sipPasswordFieldValue } from './maskSipPassword.js'

describe('maskSipPassword', () => {
  it('masked by default when a password exists', () => {
    const field = maskSipPassword('S3cr3t!', false)
    expect(field.type).toBe('password')
    expect(field.value).toBe('S3cr3t!')
    expect(field.placeholder).toBe('')
  })

  it('reveals cleartext only when revealed=true', () => {
    const field = maskSipPassword('S3cr3t!', true)
    expect(field.type).toBe('text')
    expect(field.value).toBe('S3cr3t!')
  })

  it('shows em-dash placeholder when there is no password', () => {
    expect(maskSipPassword(null, false)).toEqual({ value: '', type: 'password', placeholder: '—' })
    expect(maskSipPassword(undefined, true)).toEqual({
      value: '',
      type: 'password',
      placeholder: '—'
    })
    expect(maskSipPassword('', false)).toEqual({ value: '', type: 'password', placeholder: '—' })
  })

  it('coerces non-string passwd values to string', () => {
    expect(sipPasswordFieldValue(12345)).toBe('12345')
    expect(sipPasswordFieldValue(null)).toBe('')
  })

  it('sipPasswordFieldType only allows text when both revealed and has a password', () => {
    expect(sipPasswordFieldType(true, true)).toBe('text')
    expect(sipPasswordFieldType(true, false)).toBe('password')
    expect(sipPasswordFieldType(false, true)).toBe('password')
    expect(sipPasswordFieldType(false, false)).toBe('password')
  })
})
