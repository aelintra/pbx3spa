import { describe, it, expect } from 'vitest'
import {
  normalizeTenantHome,
  normalizeTenantLookupInput,
  findTenantHome
} from './tenantHome.js'

describe('normalizeTenantHome', () => {
  it('parses rows', () => {
    const home = normalizeTenantHome({
      version: 1,
      tenants: [
        { shortuid: 'Abc789', cname: 'Abc789.pbx3.com', instance_id: 'inst-1' }
      ]
    })
    expect(home.tenants).toHaveLength(1)
    expect(home.tenants[0].shortuid).toBe('abc789')
    expect(home.tenants[0].cname).toBe('abc789.pbx3.com')
  })

  it('throws without tenants array', () => {
    expect(() => normalizeTenantHome({})).toThrow(/tenants/)
  })
})

describe('normalizeTenantLookupInput', () => {
  it('accepts shortuid', () => {
    expect(normalizeTenantLookupInput('  VqcWd4 ')).toEqual({
      shortuidHint: 'vqcwd4',
      hostHint: 'vqcwd4'
    })
  })

  it('accepts host and URL', () => {
    expect(normalizeTenantLookupInput('vqcwd4.pbx3.com')).toEqual({
      shortuidHint: 'vqcwd4',
      hostHint: 'vqcwd4.pbx3.com'
    })
    expect(normalizeTenantLookupInput('https://vqcwd4.pbx3.com/admin')).toEqual({
      shortuidHint: 'vqcwd4',
      hostHint: 'vqcwd4.pbx3.com'
    })
  })
})

describe('findTenantHome', () => {
  const tenants = [
    { shortuid: 'abc789', cname: 'abc789.pbx3.com', instance_id: 'inst-a' },
    { shortuid: 'vqcwd4', cname: 'vqcwd4.pbx3.com', instance_id: 'inst-b' }
  ]

  it('matches shortuid or cname', () => {
    expect(findTenantHome(tenants, 'abc789')?.instance_id).toBe('inst-a')
    expect(findTenantHome(tenants, 'vqcwd4.pbx3.com')?.instance_id).toBe('inst-b')
  })

  it('returns null when missing', () => {
    expect(findTenantHome(tenants, 'nope')).toBeNull()
  })
})
