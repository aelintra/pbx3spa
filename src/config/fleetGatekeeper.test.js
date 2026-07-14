import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const TOKEN_KEY = 'pbx3.fleetGatekeeperToken'

function mockSessionStorage() {
  const store = new Map()
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => {
      store.set(k, String(v))
    },
    removeItem: (k) => {
      store.delete(k)
    },
    clear: () => store.clear(),
    _store: store
  }
}

describe('fleetGatekeeper config helpers', () => {
  let session

  beforeEach(() => {
    session = mockSessionStorage()
    vi.stubGlobal('sessionStorage', session)
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('set → get → has; empty set clears', async () => {
    const {
      setFleetGatekeeperToken,
      getFleetGatekeeperToken,
      hasFleetGatekeeperToken,
      clearFleetGatekeeperToken
    } = await import('@/config/fleetGatekeeper.js')

    setFleetGatekeeperToken('  abc123  ')
    expect(getFleetGatekeeperToken()).toBe('abc123')
    expect(hasFleetGatekeeperToken()).toBe(true)
    expect(session.getItem(TOKEN_KEY)).toBe('abc123')

    setFleetGatekeeperToken('')
    expect(getFleetGatekeeperToken()).toBe('')
    expect(hasFleetGatekeeperToken()).toBe(false)
    expect(session.getItem(TOKEN_KEY)).toBe(null)

    setFleetGatekeeperToken('again')
    clearFleetGatekeeperToken()
    expect(getFleetGatekeeperToken()).toBe('')
  })

  it('sessionStorage wins over DEV env token', async () => {
    vi.stubEnv('DEV', true)
    vi.stubEnv('VITE_FLEET_GATEKEEPER_TOKEN', 'env-token')
    session.setItem(TOKEN_KEY, 'session-token')

    const { getFleetGatekeeperToken } = await import('@/config/fleetGatekeeper.js')
    expect(getFleetGatekeeperToken()).toBe('session-token')
  })
})

describe('fleetGatekeeper API login/logout', () => {
  let session

  beforeEach(() => {
    session = mockSessionStorage()
    vi.stubGlobal('sessionStorage', session)
    vi.stubEnv('VITE_FLEET_GATEKEEPER_URL', 'https://control.test')
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('loginFleet stores returned token', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          token: 'login-token',
          user: { email: 'fleet@example.com' }
        })
    })
    vi.stubGlobal('fetch', fetchMock)

    const { loginFleet } = await import('@/api/fleetGatekeeper.js')
    const { getFleetGatekeeperToken } = await import('@/config/fleetGatekeeper.js')

    const data = await loginFleet('fleet@example.com', 'GimmeTheFleet')
    expect(data.token).toBe('login-token')
    expect(getFleetGatekeeperToken()).toBe('login-token')
    expect(fetchMock).toHaveBeenCalledWith(
      'https://control.test/api/v1/auth/login',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('logoutFleet clears local token even when HTTP fails', async () => {
    session.setItem(TOKEN_KEY, 'doomed-token')
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => JSON.stringify({ error: 'boom' })
    })
    vi.stubGlobal('fetch', fetchMock)

    const { logoutFleet } = await import('@/api/fleetGatekeeper.js')
    const { getFleetGatekeeperToken } = await import('@/config/fleetGatekeeper.js')

    await logoutFleet()
    expect(getFleetGatekeeperToken()).toBe('')
  })

  it('listFleetTenants normalizes shortuid and name', async () => {
    session.setItem(TOKEN_KEY, 't')
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          tenants: [
            {
              shortuid: '9wvvnb',
              instance_id: '08jzwn',
              label: 'Affcot',
              fqdn: 'affcot.example',
              status: 'active'
            }
          ]
        })
    })
    vi.stubGlobal('fetch', fetchMock)

    const { listFleetTenants } = await import('@/api/fleetGatekeeper.js')
    const rows = await listFleetTenants()
    expect(rows).toHaveLength(1)
    expect(rows[0].shortuid).toBe('9wvvnb')
    expect(rows[0].name).toBe('Affcot')
    expect(rows[0].instance_id).toBe('08jzwn')
  })
})
