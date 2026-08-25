import { describe, expect, it } from 'vitest'
import {
  adminPortsWideOpen,
  isWideOpenFrom,
  portTouchesAdmin,
  showAdminPortWarn
} from './firewallAdminWarn.js'

describe('portTouchesAdmin', () => {
  it('matches 22 and 44300 and ranges', () => {
    expect(portTouchesAdmin('22')).toBe(true)
    expect(portTouchesAdmin('44300')).toBe(true)
    expect(portTouchesAdmin('20:25')).toBe(true)
    expect(portTouchesAdmin('5060')).toBe(false)
    expect(portTouchesAdmin('')).toBe(false)
  })
})

describe('isWideOpenFrom', () => {
  it('treats any and empty as wide open', () => {
    expect(isWideOpenFrom('any')).toBe(true)
    expect(isWideOpenFrom('ANY')).toBe(true)
    expect(isWideOpenFrom('')).toBe(true)
    expect(isWideOpenFrom('192.168.1.0/24')).toBe(false)
  })
})

describe('showAdminPortWarn / adminPortsWideOpen', () => {
  it('warns when fleet-style SSH/API are any', () => {
    const rules = [
      { proto: 'tcp', port: '22', from: 'any' },
      { proto: 'tcp', port: '44300', from: 'any' },
      { proto: 'udp', port: '5060', from: '203.0.113.10' }
    ]
    expect(showAdminPortWarn(rules)).toBe(true)
    expect(adminPortsWideOpen(rules)).toEqual(['22', '44300'])
  })

  it('hides warn when solo LAN defaults', () => {
    const rules = [
      { proto: 'tcp', port: '22', from: '192.168.1.0/24' },
      { proto: 'tcp', port: '44300', from: '192.168.1.0/24' },
      { proto: 'udp', port: '10000:20000', from: '192.168.1.0/24' }
    ]
    expect(showAdminPortWarn(rules)).toBe(false)
    expect(adminPortsWideOpen(rules)).toEqual([])
  })

  it('warns only for the still-open admin port', () => {
    const rules = [
      { proto: 'tcp', port: '22', from: '10.0.0.0/8' },
      { proto: 'tcp', port: '44300', from: 'any' }
    ]
    expect(showAdminPortWarn(rules)).toBe(true)
    expect(adminPortsWideOpen(rules)).toEqual(['44300'])
  })

  it('ignores udp on admin ports', () => {
    expect(
      showAdminPortWarn([{ proto: 'udp', port: '22', from: 'any' }])
    ).toBe(false)
  })
})
