import { defineStore } from 'pinia'
import { defaultInstanceLabelFromBaseUrl } from '@/utils/sessionContext'

const STORAGE_KEY_BASE = 'pbx3_baseUrl'
const STORAGE_KEY_TOKEN = 'pbx3_token'
const STORAGE_KEY_TENANT_PKEY = 'pbx3_tenant_context_pkey'
const STORAGE_KEY_TENANT_LABEL = 'pbx3_tenant_context_label'

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

function getStoredTenantContext() {
  try {
    const pk = sessionStorage.getItem(STORAGE_KEY_TENANT_PKEY)
    if (!pk) return null
    const label = sessionStorage.getItem(STORAGE_KEY_TENANT_LABEL) ?? pk
    return { pkey: pk, label }
  } catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    baseUrl: getStoredBaseUrl(),
    token: getStoredToken(),
    user: null,
    /** `sysglobals.fqdn` when loaded (session-only; refreshed after login and when globals are fetched). */
    globalsFqdn: '',
    /** Current tenant signpost { pkey, label } or null. */
    tenantContext: getStoredTenantContext()
  }),

  getters: {
    isLoggedIn(state) {
      return Boolean(state.token)
    },
    abilities(state) {
      return state.user?.abilities ?? []
    },
    can(state) {
      const abilities = state.user?.abilities ?? []
      return (ability) => abilities.includes(ability)
    },
    /** Top bar instance line: globals FQDN first, then whoami, then API host from base URL. */
    displayInstanceLabel(state) {
      const fromGlobals = (state.globalsFqdn || '').trim()
      if (fromGlobals) return fromGlobals
      const fromApi = state.user?.instance_label ?? state.user?.instance_name
      if (fromApi != null && String(fromApi).trim() !== '') return String(fromApi).trim()
      return defaultInstanceLabelFromBaseUrl(state.baseUrl) || ''
    }
  },

  actions: {
    /**
     * @param {string} baseUrl
     * @param {string} token
     */
    setCredentials(baseUrl, token) {
      this.baseUrl = baseUrl ?? ''
      this.token = token ?? ''
      if (this.token) {
        this.clearTenantContext()
      }
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

    /**
     * Update instance chip from a `GET`/`PUT` sysglobals response (`fqdn` = node identity).
     * @param {Record<string, unknown> | null | undefined} g
     */
    setGlobalsFqdnFromSysglobal(g) {
      const fq = g?.fqdn != null ? String(g.fqdn).trim() : ''
      this.globalsFqdn = fq
    },

    /** Clear cached globals FQDN (e.g. after failed fetch). */
    setGlobalsFqdn(fqdn) {
      this.globalsFqdn = (fqdn ?? '').toString().trim()
    },

    setTenantContext(pkey, label) {
      const pk = (pkey ?? '').toString().trim()
      if (!pk) {
        this.clearTenantContext()
        return
      }
      const lb = (label ?? '').toString().trim() || pk
      this.tenantContext = { pkey: pk, label: lb }
      try {
        sessionStorage.setItem(STORAGE_KEY_TENANT_PKEY, pk)
        sessionStorage.setItem(STORAGE_KEY_TENANT_LABEL, lb)
      } catch {
        // ignore
      }
    },

    clearTenantContext() {
      this.tenantContext = null
      try {
        sessionStorage.removeItem(STORAGE_KEY_TENANT_PKEY)
        sessionStorage.removeItem(STORAGE_KEY_TENANT_LABEL)
      } catch {
        // ignore
      }
    },

    clearCredentials() {
      this.baseUrl = ''
      this.token = ''
      this.user = null
      this.globalsFqdn = ''
      this.clearTenantContext()
      try {
        sessionStorage.removeItem(STORAGE_KEY_BASE)
        sessionStorage.removeItem(STORAGE_KEY_TOKEN)
      } catch {
        // ignore
      }
    }
  }
})
