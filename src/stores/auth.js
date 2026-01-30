import { defineStore } from 'pinia'

const STORAGE_KEY_BASE = 'pbx3_baseUrl'
const STORAGE_KEY_TOKEN = 'pbx3_token'

function getStoredBaseUrl() {
  try {
    return sessionStorage.getItem(STORAGE_KEY_BASE) ?? ''
  } catch {
    return ''
  }
}

function getStoredToken() {
  try {
    return sessionStorage.getItem(STORAGE_KEY_TOKEN) ?? ''
  } catch {
    return ''
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    baseUrl: getStoredBaseUrl(),
    token: getStoredToken(),
    user: null
  }),

  getters: {
    isLoggedIn(state) {
      return Boolean(state.token)
    }
  },

  actions: {
    setCredentials(baseUrl, token) {
      this.baseUrl = baseUrl ?? ''
      this.token = token ?? ''
      try {
        if (this.baseUrl) sessionStorage.setItem(STORAGE_KEY_BASE, this.baseUrl)
        else sessionStorage.removeItem(STORAGE_KEY_BASE)
        if (this.token) sessionStorage.setItem(STORAGE_KEY_TOKEN, this.token)
        else sessionStorage.removeItem(STORAGE_KEY_TOKEN)
      } catch {
        // ignore storage errors (e.g. private mode)
      }
    },

    setUser(user) {
      this.user = user
    },

    clearCredentials() {
      this.baseUrl = ''
      this.token = ''
      this.user = null
      try {
        sessionStorage.removeItem(STORAGE_KEY_BASE)
        sessionStorage.removeItem(STORAGE_KEY_TOKEN)
      } catch {
        // ignore
      }
    }
  }
})
