import { describe, it, expect } from 'vitest'
import { buildProvisionBody } from './fleetTenantProvision.js'

describe('buildProvisionBody', () => {
  it('requires instance, pkey, description', () => {
    expect(buildProvisionBody({}).ok).toBe(false)
    expect(
      buildProvisionBody({
        instance_id: 'i1',
        pkey: 'acme',
        description: 'Acme'
      }).body
    ).toEqual({
      instance_id: 'i1',
      pkey: 'acme',
      description: 'Acme'
    })
  })

  it('includes digit CLID/localarea', () => {
    const r = buildProvisionBody({
      instance_id: 'i1',
      pkey: 'acme',
      description: 'Acme',
      clusterclid: '01924',
      localarea: '01924'
    })
    expect(r.ok).toBe(true)
    expect(r.body.clusterclid).toBe('01924')
  })

  it('rejects non-digit CLID', () => {
    const r = buildProvisionBody({
      instance_id: 'i1',
      pkey: 'acme',
      description: 'Acme',
      clusterclid: 'AB'
    })
    expect(r.ok).toBe(false)
  })
})
