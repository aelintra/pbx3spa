import { describe, expect, it } from 'vitest'
import { fieldErrors, firstErrorMessage } from './formErrors.js'

describe('fieldErrors', () => {
  it('returns null when err is missing or has no object data', () => {
    expect(fieldErrors(null)).toBeNull()
    expect(fieldErrors(undefined)).toBeNull()
    expect(fieldErrors({})).toBeNull()
    expect(fieldErrors({ data: 'x' })).toBeNull()
  })

  it('returns null when no array-valued fields', () => {
    expect(fieldErrors({ data: { foo: 'bar' } })).toBeNull()
    expect(fieldErrors({ data: { foo: [] } })).toBeNull()
  })

  it('maps Laravel-style validation object', () => {
    const err = {
      data: {
        pkey: ['Must be 3-5 digits'],
        cluster: ['Required']
      }
    }
    expect(fieldErrors(err)).toEqual({
      pkey: ['Must be 3-5 digits'],
      cluster: ['Required']
    })
  })
})

describe('firstErrorMessage', () => {
  it('returns API message for 404 when present', () => {
    expect(
      firstErrorMessage({ status: 404, data: { message: 'Gone' }, message: 'x' }, 'fallback')
    ).toBe('Gone')
    expect(firstErrorMessage({ status: 404, data: { Error: 'Legacy' } }, 'f')).toBe('Legacy')
  })

  it('returns Not found for bare 404', () => {
    expect(firstErrorMessage({ status: 404 }, 'f')).toBe('Not found')
  })

  it('prefers first field error string', () => {
    const err = { data: { pkey: ['First'], cluster: ['Second'] } }
    expect(firstErrorMessage(err, 'fallback')).toBe('First')
  })

  it('falls back to data.message, data.Error, err.message, then fallback', () => {
    expect(firstErrorMessage({ data: { message: 'M' } }, 'f')).toBe('M')
    expect(firstErrorMessage({ data: { Error: 'E' } }, 'f')).toBe('E')
    expect(firstErrorMessage({ message: 'Top' }, 'f')).toBe('Top')
    expect(firstErrorMessage({}, 'fallback')).toBe('fallback')
  })
})
