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
          status: 'active'
        }
      ]
    })
    expect(cat.instances).toHaveLength(1)
    expect(cat.instances[0].label).toBe('Node 1')
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
