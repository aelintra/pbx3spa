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
    /** Catalog row for connected instance (session-only; from fleet picker). */
    selectedInstance: null,
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
      return (ability) => {
        if (abilities.includes('admin')) return true
        return abilities.includes(ability)
      }
    },
    /** Instance MSP / full box access. */
    isAdmin(state) {
      return (state.user?.abilities ?? []).includes('admin')
    },
    /** Can use tenant panel surface (admin implies true). */
    canTenantPanels(state) {
      const a = state.user?.abilities ?? []
      return a.includes('admin') || a.includes('tenant')
    },
    canRecordings(state) {
      const a = state.user?.abilities ?? []
      return a.includes('admin') || a.includes('recordings')
    },
    /** Any panel access (admin or tenant). Recordings-only is not enough for general panels. */
    canAccessPanels(state) {
      const a = state.user?.abilities ?? []
      return a.includes('admin') || a.includes('tenant')
    },
    /** Cluster shortuids/pkeys the user may work on (empty = admin / all). */
    allowedClusters(state) {
      if ((state.user?.abilities ?? []).includes('admin')) return []
      const raw = state.user?.allowed_clusters
      return Array.isArray(raw) ? raw.map((c) => String(c)).filter(Boolean) : []
    },
    allowedClusterDetails(state) {
      const details = state.user?.clusters ?? state.user?.allowed_cluster_details
      if (Array.isArray(details) && details.length) {
        return details.map((d) => ({
          shortuid: String(d.shortuid ?? d.pkey ?? ''),
          pkey: String(d.pkey ?? d.shortuid ?? ''),
          label: String(d.label ?? d.pkey ?? d.shortuid ?? '')
        }))
      }
      return (state.user?.allowed_clusters ?? []).map((id) => ({
        shortuid: String(id),
        pkey: String(id),
        label: String(id)
      }))
    },
    /** Top bar instance line: globals FQDN first, then whoami, then API host from base URL. */
    displayInstanceLabel(state) {
      const fromGlobals = (state.globalsFqdn || '').trim()
      if (fromGlobals) return fromGlobals
      const fromCatalog = (state.selectedInstance?.label || state.selectedInstance?.fqdn || '').trim()
      if (fromCatalog) return fromCatalog
      const fromApi = state.user?.instance_label ?? state.user?.instance_name
      if (fromApi != null && String(fromApi).trim() !== '') return String(fromApi).trim()
      return defaultInstanceLabelFromBaseUrl(state.baseUrl) || ''
    },
    displayInstanceEnvironment(state) {
      return (state.selectedInstance?.environment ?? '').trim()
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
      // Single-cluster tenant users: lock context; multi: keep stored if still allowed
      const a = user?.abilities ?? []
      if (a.includes('admin')) return
      const clusters = Array.isArray(user?.allowed_clusters)
        ? user.allowed_clusters.map((c) => String(c)).filter(Boolean)
        : []
      if (clusters.length === 1) {
        const id = clusters[0]
        const detail = (user?.clusters || user?.allowed_cluster_details || []).find(
          (d) => String(d.shortuid) === id || String(d.pkey) === id
        )
        this.setTenantContext(detail?.pkey || id, detail?.label || detail?.pkey || id)
      } else if (clusters.length > 1 && this.tenantContext?.pkey) {
        const pk = this.tenantContext.pkey
        const still =
          clusters.includes(pk) ||
          (user?.clusters || user?.allowed_cluster_details || []).some(
            (d) => String(d.pkey) === pk || String(d.shortuid) === pk
          )
        if (!still) this.clearTenantContext()
      }
    },

    /** @param {import('@/utils/instanceCatalog').InstanceRecord | null} instance */
    setSelectedInstance(instance) {
      this.selectedInstance = instance
        ? {
            id: instance.id,
            fqdn: instance.fqdn ?? '',
            api_base_url: instance.api_base_url,
            label: instance.label,
            environment: instance.environment,
            status: instance.status
          }
        : null
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
      this.selectedInstance = null
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
