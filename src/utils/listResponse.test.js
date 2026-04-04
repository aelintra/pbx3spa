import { describe, expect, it } from 'vitest'
import { normalizeList } from './listResponse.js'

describe('normalizeList', () => {
  it('returns the array when response is already an array', () => {
    const a = [1, 2]
    expect(normalizeList(a)).toBe(a)
    expect(normalizeList([])).toEqual([])
  })

  it('unwraps response.data when it is an array', () => {
    expect(normalizeList({ data: [1, 2] })).toEqual([1, 2])
  })

  it('unwraps resourceKey when provided', () => {
    expect(normalizeList({ tenants: [{ id: 1 }] }, 'tenants')).toEqual([{ id: 1 }])
    expect(normalizeList({ other: [] }, 'tenants')).toEqual([])
  })

  it('converts numeric-keyed object to values array', () => {
    expect(normalizeList({ 0: 'a', 1: 'b' })).toEqual(['a', 'b'])
  })

  it('returns empty array for null, primitives, or unusable objects', () => {
    expect(normalizeList(null)).toEqual([])
    expect(normalizeList(undefined)).toEqual([])
    expect(normalizeList('x')).toEqual([])
    expect(normalizeList(3)).toEqual([])
    expect(normalizeList({})).toEqual([])
    expect(normalizeList({ foo: 'bar' })).toEqual([])
  })
})
