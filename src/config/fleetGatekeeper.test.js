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
      clearFleetGatekeeperToken,
      setFleetAbilities,
      getFleetAbilities,
      canFleet,
      FLEET_ABILITY
    } = await import('@/config/fleetGatekeeper.js')

    setFleetGatekeeperToken('  abc123  ')
    expect(getFleetGatekeeperToken()).toBe('abc123')
    expect(hasFleetGatekeeperToken()).toBe(true)
    expect(session.getItem(TOKEN_KEY)).toBe('abc123')

    setFleetAbilities(['fleet_admin'])
    expect(canFleet(FLEET_ABILITY.READ)).toBe(true)
    expect(canFleet(FLEET_ABILITY.MOVES)).toBe(true)

    setFleetGatekeeperToken('')
    expect(getFleetGatekeeperToken()).toBe('')
    expect(hasFleetGatekeeperToken()).toBe(false)
    expect(session.getItem(TOKEN_KEY)).toBe(null)
    expect(getFleetAbilities()).toEqual([])

    setFleetGatekeeperToken('again')
    setFleetAbilities(['fleet_read'])
    clearFleetGatekeeperToken()
    expect(getFleetGatekeeperToken()).toBe('')
    expect(getFleetAbilities()).toEqual([])
  })

  it('canFleet requires specific ability unless fleet_admin', async () => {
    const { setFleetAbilities, canFleet, FLEET_ABILITY } = await import(
      '@/config/fleetGatekeeper.js'
    )
    setFleetAbilities(['fleet_read'])
    expect(canFleet(FLEET_ABILITY.READ)).toBe(true)
    expect(canFleet(FLEET_ABILITY.MOVES)).toBe(false)
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

  it('loginFleet stores returned token and abilities', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          token: 'login-token',
          user: { email: 'fleet@example.com', abilities: ['fleet_admin'] },
          abilities: [
            'fleet_read',
            'fleet_instances',
            'fleet_moves',
            'fleet_edge',
            'fleet_admin'
          ]
        })
    })
    vi.stubGlobal('fetch', fetchMock)

    const { loginFleet } = await import('@/api/fleetGatekeeper.js')
    const { getFleetGatekeeperToken, canFleet, FLEET_ABILITY } = await import(
      '@/config/fleetGatekeeper.js'
    )

    const data = await loginFleet('fleet@example.com', 'GimmeTheFleet')
    expect(data.token).toBe('login-token')
    expect(getFleetGatekeeperToken()).toBe('login-token')
    expect(canFleet(FLEET_ABILITY.MOVES)).toBe(true)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://control.test/api/v1/auth/login',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('loginFleet rejects accounts without fleet_read', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          token: 'login-token',
          user: { email: 'none@example.com', abilities: [] },
          abilities: []
        })
    })
    vi.stubGlobal('fetch', fetchMock)

    const { loginFleet } = await import('@/api/fleetGatekeeper.js')
    const { getFleetGatekeeperToken } = await import('@/config/fleetGatekeeper.js')

    await expect(loginFleet('none@example.com', 'GimmeTheFleet')).rejects.toThrow(/fleet_read/)
    expect(getFleetGatekeeperToken()).toBe('')
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

  it('registerFleetInstance POSTs body with verify_up', async () => {
    session.setItem(TOKEN_KEY, 't')
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      text: async () => JSON.stringify({ catalog: { instances: [] } })
    })
    vi.stubGlobal('fetch', fetchMock)

    const { registerFleetInstance } = await import('@/api/fleetGatekeeper.js')
    await registerFleetInstance({
      id: 'abc',
      fqdn: 'x.example',
      api_base_url: 'https://x.example:44300/api',
      label: 'x',
      status: 'active',
      verify_up: true
    })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://control.test/api/v1/instances',
      expect.objectContaining({ method: 'POST' })
    )
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.verify_up).toBe(true)
  })

  it('decommissionFleetInstance sends confirm', async () => {
    session.setItem(TOKEN_KEY, 't')
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ instance: { status: 'decommissioned' } })
    })
    vi.stubGlobal('fetch', fetchMock)

    const { decommissionFleetInstance } = await import('@/api/fleetGatekeeper.js')
    await decommissionFleetInstance('kid123', { notes: 'lab cleanup' })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://control.test/api/v1/instances/kid123/decommission',
      expect.objectContaining({ method: 'POST' })
    )
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.confirm).toBe(true)
    expect(body.notes).toBe('lab cleanup')
  })

  it('retryTenantMove posts to /retry', async () => {
    session.setItem(TOKEN_KEY, 't')
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ state: 'pending' })
    })
    vi.stubGlobal('fetch', fetchMock)

    const { retryTenantMove } = await import('@/api/fleetGatekeeper.js')
    await retryTenantMove('tmj_abc', '9wvvnb')
    expect(fetchMock).toHaveBeenCalledWith(
      'https://control.test/api/v1/tenant-moves/tmj_abc/retry',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('getFleetReconcile GETs /reconcile', async () => {
    session.setItem(TOKEN_KEY, 't')
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          ok: true,
          summary: { matched: 1, drifts: 0 },
          drifts: []
        })
    })
    vi.stubGlobal('fetch', fetchMock)

    const { getFleetReconcile } = await import('@/api/fleetGatekeeper.js')
    const report = await getFleetReconcile()
    expect(fetchMock).toHaveBeenCalledWith(
      'https://control.test/api/v1/reconcile',
      expect.any(Object)
    )
    expect(report.ok).toBe(true)
  })

  it('projectFleetReconcile POSTs confirm', async () => {
    session.setItem(TOKEN_KEY, 't')
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ dry_run: false, projected: [], after: { ok: true } })
    })
    vi.stubGlobal('fetch', fetchMock)

    const { projectFleetReconcile } = await import('@/api/fleetGatekeeper.js')
    await projectFleetReconcile({ confirm: true })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://control.test/api/v1/reconcile/project',
      expect.objectContaining({ method: 'POST' })
    )
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.confirm).toBe(true)
  })
})
