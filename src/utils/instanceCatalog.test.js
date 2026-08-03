import { describe, it, expect } from 'vitest'
import { normalizeCatalog, findInstanceById } from './instanceCatalog.js'

describe('normalizeCatalog', () => {
  it('parses valid index', () => {
    const cat = normalizeCatalog({
      version: 1,
      instances: [
        {
          id: 'abc',
          fqdn: 'node.example.com',
          api_base_url: 'https://node.example.com:44300/api',
          label: 'Node 1',
          status: 'active',
          last_seen_at: '2026-08-02T12:00:00Z'
        }
      ]
    })
    expect(cat.instances).toHaveLength(1)
    expect(cat.instances[0].label).toBe('Node 1')
    expect(cat.instances[0].last_seen_at).toBe('2026-08-02T12:00:00Z')
  })

  it('skips invalid rows', () => {
    const cat = normalizeCatalog({
      instances: [{ id: 'ok', api_base_url: 'https://x/api', fqdn: 'x' }, { id: '' }]
    })
    expect(cat.instances).toHaveLength(1)
  })

  it('throws without instances array', () => {
    expect(() => normalizeCatalog({})).toThrow(/instances/)
  })

  it('excludes decommissioned instances from picker list', () => {
    const cat = normalizeCatalog({
      instances: [
        {
          id: 'active1',
          fqdn: 'a.example.com',
          api_base_url: 'https://a.example.com/api',
          label: 'Active',
          status: 'active'
        },
        {
          id: 'gone1',
          fqdn: 'old.example.com',
          api_base_url: 'https://old.example.com/api',
          label: 'Retired',
          status: 'decommissioned'
        }
      ]
    })
    expect(cat.instances).toHaveLength(1)
    expect(cat.instances[0].id).toBe('active1')
  })
})

describe('findInstanceById', () => {
  const list = [{ id: 'a', api_base_url: 'https://x/api', fqdn: 'x', label: 'A' }]

  it('finds by id', () => {
    expect(findInstanceById(list, 'a')?.label).toBe('A')
  })

  it('returns null when missing', () => {
    expect(findInstanceById(list, 'b')).toBeNull()
  })
})
