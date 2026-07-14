import { defineStore } from 'pinia'
import { clearFleetGatekeeperToken, isFleetGatekeeperEnabled } from '@/config/fleetGatekeeper'
import { isFleetDirectoryEnabled } from '@/config/instanceDirectory'

const MODE_KEY = 'pbx3.uiMode'
const RETURN_KEY = 'pbx3.fleetReturnPath'

function readMode() {
  try {
    return sessionStorage.getItem(MODE_KEY) === 'fleet' ? 'fleet' : 'tenant'
  } catch {
    return 'tenant'
  }
}

function readReturnPath() {
  try {
    return sessionStorage.getItem(RETURN_KEY) || '/'
  } catch {
    return '/'
  }
}

/**
 * SPA shell mode: tenant (node pbx3api) vs fleet (gatekeeper only).
 * See TENANT_MOBILITY_FLEET_CONSOLE_DESIGN.md §2.5.
 */
export const useFleetModeStore = defineStore('fleetMode', {
  state: () => ({
    mode: readMode(),
    returnPath: readReturnPath()
  }),

  getters: {
    isFleetMode(state) {
      return state.mode === 'fleet'
    },
    /** Lab: directory catalog + gatekeeper URL configured. */
    fleetAvailable() {
      return isFleetDirectoryEnabled() && isFleetGatekeeperEnabled()
    }
  },

  actions: {
    persist() {
      try {
        sessionStorage.setItem(MODE_KEY, this.mode)
        sessionStorage.setItem(RETURN_KEY, this.returnPath || '/')
      } catch {
        // private mode / quota
      }
    },

    /**
     * @param {string} [returnPath] path to restore on Exit Fleet
     */
    enterFleet(returnPath) {
      const path = returnPath && !String(returnPath).startsWith('/fleet') ? returnPath : '/'
      this.returnPath = path || '/'
      this.mode = 'fleet'
      this.persist()
    },

    /**
     * Clear fleet token and leave fleet mode.
     * @returns {string} path to navigate after exit
     */
    exitFleet() {
      clearFleetGatekeeperToken()
      this.mode = 'tenant'
      const path = this.returnPath || '/'
      this.persist()
      return path
    },

    /** On logout / session end — drop fleet context without navigation. */
    reset() {
      clearFleetGatekeeperToken()
      this.mode = 'tenant'
      this.returnPath = '/'
      this.persist()
    }
  }
})
