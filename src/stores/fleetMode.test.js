import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

describe('fleetMode store exit/reset', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const store = new Map()
    vi.stubGlobal('sessionStorage', {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
      clear: () => store.clear()
    })
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it('exitFleet calls logoutFleet and returns to tenant mode', async () => {
    const logoutFleet = vi.fn().mockResolvedValue(undefined)
    vi.doMock('@/api/fleetGatekeeper', () => ({ logoutFleet }))
    vi.doMock('@/config/instanceDirectory', () => ({
      isFleetDirectoryEnabled: () => true
    }))
    vi.doMock('@/config/fleetGatekeeper', async () => {
      const actual = await vi.importActual('@/config/fleetGatekeeper')
      return {
        ...actual,
        isFleetGatekeeperEnabled: () => true
      }
    })

    const { useFleetModeStore } = await import('@/stores/fleetMode.js')
    const fleetMode = useFleetModeStore()
    fleetMode.enterFleet('/extensions')
    expect(fleetMode.isFleetMode).toBe(true)

    const path = await fleetMode.exitFleet()
    expect(logoutFleet).toHaveBeenCalled()
    expect(fleetMode.isFleetMode).toBe(false)
    expect(path).toBe('/extensions')
  })
})
