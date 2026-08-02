import { describe, it, expect } from 'vitest'
import {
  userMayAccessTenantShortuid,
  tenantContextForShortuid,
  looksLikeEmail
} from './tenantAccess.js'

describe('userMayAccessTenantShortuid', () => {
  it('allows admin any shortuid', () => {
    expect(
      userMayAccessTenantShortuid({ abilities: ['admin'], allowed_clusters: null }, 'pb0wsk')
    ).toBe(true)
  })

  it('matches allowed_clusters shortuid', () => {
    expect(
      userMayAccessTenantShortuid(
        { abilities: ['tenant'], allowed_clusters: ['dhbm8x', 'pb0wsk'] },
        'PB0WSK'
      )
    ).toBe(true)
    expect(
      userMayAccessTenantShortuid(
        { abilities: ['tenant'], allowed_clusters: ['dhbm8x'] },
        'pb0wsk'
      )
    ).toBe(false)
  })

  it('matches cluster detail pkey', () => {
    expect(
      userMayAccessTenantShortuid(
        {
          abilities: ['tenant'],
          allowed_clusters: ['pb0wsk'],
          clusters: [{ shortuid: 'pb0wsk', pkey: 'sipp' }]
        },
        'sipp'
      )
    ).toBe(true)
  })
})

describe('tenantContextForShortuid', () => {
  it('prefers pkey storage and shortuid label', () => {
    expect(
      tenantContextForShortuid(
        {
          clusters: [{ shortuid: 'pb0wsk', pkey: 'sipp' }]
        },
        'pb0wsk'
      )
    ).toEqual({ pkey: 'sipp', label: 'pb0wsk' })
  })
})

describe('looksLikeEmail', () => {
  it('detects emails vs tenant ids', () => {
    expect(looksLikeEmail('tenant.demo@pbx3.test')).toBe(true)
    expect(looksLikeEmail('pb0wsk')).toBe(false)
    expect(looksLikeEmail('pb0wsk.pbx3.com')).toBe(false)
  })
})
