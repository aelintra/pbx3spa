/**
 * PBX3 API client. Accepts base URL (e.g. https://host:port/api) and Bearer token,
 * provides get/post/put/delete with Accept: application/json and Authorization: Bearer <token>.
 */

import { useAuthStore } from '@/stores/auth'

function clearSessionAndGoLogin() {
  useAuthStore().clearCredentials()
  window.location.replace('/login')
}

/**
 * Returns an API client configured with the auth store's baseUrl and token.
 * Use this for all API calls after login; credentials come from the store.
 */
export function getApiClient() {
  const store = useAuthStore()
  return createApiClient(store.baseUrl, store.token)
}

/**
 * @param {string} baseUrl - API base URL (e.g. https://192.168.1.205:44300/api)
 * @param {string} token - Bearer token
 * @returns {{ get: (path: string) => Promise<any>, post: (path: string, body?: object) => Promise<any>, put: (path: string, body?: object) => Promise<any>, delete: (path: string) => Promise<any> }}
 */
export function createApiClient(baseUrl, token) {
  const base = baseUrl.replace(/\/$/, '')
  const headers = {
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  }

  function buildUrl(path, params) {
    const pathPart = path.startsWith('http') ? path : `${base}/${path.replace(/^\//, '')}`
    if (params && typeof params === 'object' && Object.keys(params).length > 0) {
      const search = new URLSearchParams(params).toString()
      return search ? `${pathPart}?${search}` : pathPart
    }
    return pathPart
  }

  const defaultTimeoutMs = 60_000

  async function request(method, path, body, requestOptions = {}) {
    const isGetWithParams =
      method === 'GET' && body && typeof body === 'object' && !Array.isArray(body)
    const url = buildUrl(path, isGetWithParams ? body : undefined)
    const timeoutMs = requestOptions.timeoutMs ?? defaultTimeoutMs
    const controller = new AbortController()
    const timer =
      timeoutMs > 0
        ? setTimeout(() => controller.abort(new Error(`Request timed out after ${timeoutMs}ms`)), timeoutMs)
        : null

    const options = {
      method,
      signal: controller.signal,
      headers:
        method !== 'GET' && body !== undefined && body !== null
          ? { ...headers, 'Content-Type': 'application/json' }
          : headers
    }
    if (body !== undefined && body !== null && method !== 'GET') {
      options.body = JSON.stringify(body)
    }
    let res
    try {
      res = await fetch(url, options)
    } catch (err) {
      if (err?.name === 'AbortError') {
        const timeoutErr = new Error(
          err.cause?.message || `Request timed out (${method} ${path})`
        )
        timeoutErr.status = 0
        throw timeoutErr
      }
      throw err
    } finally {
      if (timer) clearTimeout(timer)
    }
    const text = await res.text()
    if (!res.ok) {
      if (res.status === 401) clearSessionAndGoLogin()
      const err = new Error(`API ${method} ${path}: ${res.status} ${res.statusText}`)
      err.status = res.status
      err.response = text
      try {
        err.data = JSON.parse(text)
      } catch {
        err.data = null
      }
      throw err
    }
    if (!text) return null
    try {
      return JSON.parse(text)
    } catch {
      return text
    }
  }

  async function getBlob(path) {
    const url = path.startsWith('http') ? path : `${base}/${path.replace(/^\//, '')}`
    const res = await fetch(url, { method: 'GET', headers: { ...headers } })
    if (!res.ok) {
      if (res.status === 401) clearSessionAndGoLogin()
      const text = await res.text()
      const err = new Error(`API GET ${path}: ${res.status} ${res.statusText}`)
      err.status = res.status
      err.response = text
      try {
        err.data = JSON.parse(text)
      } catch {
        err.data = null
      }
      throw err
    }
    return res.blob()
  }

  async function postFile(path, formData) {
    const url = path.startsWith('http') ? path : `${base}/${path.replace(/^\//, '')}`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
        // Don't set Content-Type - browser will set it with boundary for FormData
      },
      body: formData
    })
    const text = await res.text()
    if (!res.ok) {
      if (res.status === 401) clearSessionAndGoLogin()
      const err = new Error(`API POST ${path}: ${res.status} ${res.statusText}`)
      err.status = res.status
      err.response = text
      try {
        err.data = JSON.parse(text)
      } catch {
        err.data = null
      }
      throw err
    }
    if (!text) return null
    try {
      return JSON.parse(text)
    } catch {
      return text
    }
  }

  return {
    get(path, options) {
      return request('GET', path, options?.params, options)
    },
    getBlob(path) {
      return getBlob(path)
    },
    post(path, body, options) {
      return request('POST', path, body, options)
    },
    postFile(path, formData) {
      return postFile(path, formData)
    },
    put(path, body) {
      return request('PUT', path, body)
    },
    delete(path) {
      return request('DELETE', path)
    }
  }
}
