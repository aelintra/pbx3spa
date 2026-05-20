<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { createApiClient, getApiClient } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import {
  getInstanceDirectoryUrl,
  getDefaultApiBaseUrl,
  isFleetDirectoryEnabled
} from '@/config/instanceDirectory'
import { fetchInstanceCatalog, findInstanceById } from '@/utils/instanceCatalog'
import { loadInstanceRecents, pushInstanceRecent } from '@/utils/instanceRecents'
import { resolveApiBaseUrl } from '@/config/apiBaseUrl'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const fleetMode = isFleetDirectoryEnabled()
const directoryUrl = getInstanceDirectoryUrl()

/** @type {import('vue').Ref<'loading'|'pick'|'credentials'>} */
const step = ref(fleetMode ? 'loading' : 'credentials')

const catalogLoading = ref(false)
const catalogError = ref('')
/** @type {import('vue').Ref<import('@/utils/instanceCatalog').InstanceRecord[]>} */
const catalogInstances = ref([])
const recents = ref(loadInstanceRecents())

/** @type {import('vue').Ref<import('@/utils/instanceCatalog').InstanceRecord | null>} */
const selectedInstance = ref(null)

const showManualApiUrl = ref(!fleetMode)
const baseUrl = ref(getDefaultApiBaseUrl() ?? '')
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

const effectiveBaseUrl = computed(() => {
  const fromPick = selectedInstance.value?.api_base_url?.trim()
  if (fromPick) return fromPick
  return baseUrl.value.trim()
})

const needsApiUrlField = computed(
  () => showManualApiUrl.value || !selectedInstance.value
)

const selectedSummary = computed(() => {
  const i = selectedInstance.value
  if (!i) return ''
  const parts = [i.label, i.fqdn].filter(Boolean)
  if (i.environment) parts.push(i.environment)
  return parts.join(' · ')
})

function goToCredentials(instance) {
  selectedInstance.value = instance
  if (instance?.api_base_url) {
    baseUrl.value = resolveApiBaseUrl(instance.api_base_url)
  }
  step.value = 'credentials'
  error.value = ''
}

function pickInstance(instance) {
  if ((instance.status ?? '').toLowerCase() === 'maintenance') {
    const ok = window.confirm(
      `${instance.label} is in maintenance. Open this instance anyway?`
    )
    if (!ok) return
  }
  goToCredentials(instance)
}

function pickRecent(instance) {
  goToCredentials(instance)
}

function backToPicker() {
  if (fleetMode && catalogInstances.value.length > 0) {
    step.value = 'pick'
    selectedInstance.value = null
    showManualApiUrl.value = false
    error.value = ''
  }
}

async function loadCatalog() {
  if (!directoryUrl) return
  catalogLoading.value = true
  catalogError.value = ''
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(new Error('Catalog request timed out')), 15_000)
  try {
    const catalog = await fetchInstanceCatalog(directoryUrl, { signal: controller.signal })
    catalogInstances.value = catalog.instances

    const queryId = typeof route.query.instance === 'string' ? route.query.instance : ''
    const fromQuery = queryId ? findInstanceById(catalog.instances, queryId) : null

    if (fromQuery) {
      goToCredentials(fromQuery)
      return
    }

    if (catalog.instances.length === 0) {
      catalogError.value = 'Catalog has no instances. Enter an API URL below or fix the index file.'
      showManualApiUrl.value = true
      step.value = 'credentials'
      return
    }

    step.value = 'pick'
  } catch (err) {
    let msg = err?.message || 'Could not load instance catalog.'
    if (typeof window !== 'undefined' && directoryUrl) {
      try {
        const crossOrigin =
          directoryUrl.startsWith('http') &&
          new URL(directoryUrl, window.location.origin).origin !== window.location.origin
        if (crossOrigin) {
          msg +=
            ' (CORS: allow this SPA origin on the S3 bucket, or use VITE_CATALOG_PROXY_TARGET + /dev-catalog/… in .env.development.)'
        }
      } catch {
        // ignore URL parse errors
      }
    }
    catalogError.value = `${msg} Use a recent instance or enter an API URL.`
    showManualApiUrl.value = true
    step.value = recents.value.length ? 'pick' : 'credentials'
  } finally {
    clearTimeout(timer)
    catalogLoading.value = false
  }
}

async function refreshCatalog() {
  step.value = 'loading'
  selectedInstance.value = null
  await loadCatalog()
}

onMounted(() => {
  if (fleetMode) {
    loadCatalog()
  } else if (getDefaultApiBaseUrl()) {
    baseUrl.value = resolveApiBaseUrl(getDefaultApiBaseUrl())
  }
})

async function onSubmit(e) {
  e.preventDefault()
  error.value = ''
  const url = resolveApiBaseUrl(effectiveBaseUrl.value)
  if (!url) {
    error.value = 'API base URL is required'
    return
  }
  loading.value = true
  try {
    const client = createApiClient(url, '')
    const res = await client.post(
      'auth/login',
      {
        email: email.value.trim(),
        password: password.value
      },
      { timeoutMs: 30_000 }
    )
    auth.setCredentials(url, res.accessToken)
    if (selectedInstance.value) {
      auth.setSelectedInstance(selectedInstance.value)
      pushInstanceRecent(selectedInstance.value)
    } else {
      auth.setSelectedInstance(null)
      pushInstanceRecent({
        id: url,
        label: url,
        fqdn: '',
        api_base_url: url
      })
    }
    try {
      const user = await getApiClient().get('auth/whoami')
      auth.setUser(user)
    } catch {
      // whoami optional
    }
    router.push('/')
  } catch (err) {
    if (err.status === 401) {
      error.value = 'Invalid email or password'
    } else {
      error.value = err.data?.message || err.message || 'Login failed'
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login">
    <form class="login-form" @submit="onSubmit">
      <h1>PBX3 Admin</h1>

      <p v-if="step === 'loading'" class="subtitle">Loading instance catalog…</p>
      <p v-else-if="step === 'pick'" class="subtitle">
        {{ catalogInstances.length === 1 ? 'Select your PBX instance' : 'Choose a PBX instance' }}
      </p>
      <p v-else-if="selectedInstance" class="subtitle">
        Sign in to {{ selectedInstance.label }}
      </p>
      <p v-else class="subtitle">Sign in to your PBX3 instance</p>

      <p v-if="catalogError" class="catalog-warning" role="status">{{ catalogError }}</p>

      <!-- Fleet picker -->
      <section v-if="step === 'pick'" class="instance-section">
        <p v-if="catalogInstances.length === 1" class="pick-hint">
          Click the instance below, then enter your credentials.
        </p>
        <ul class="instance-list" role="listbox" aria-label="Instances">
          <li v-for="inst in catalogInstances" :key="inst.id">
            <button type="button" class="instance-row" @click="pickInstance(inst)">
              <span class="instance-row-label">{{ inst.label }}</span>
              <span class="instance-row-meta">{{ inst.fqdn }}</span>
              <span v-if="inst.environment || inst.status" class="instance-row-badges">
                <span v-if="inst.environment" class="badge">{{ inst.environment }}</span>
                <span
                  v-if="inst.status"
                  class="badge"
                  :class="{ 'badge--warn': inst.status === 'maintenance' }"
                >
                  {{ inst.status }}
                </span>
              </span>
            </button>
          </li>
        </ul>

        <div v-if="recents.length" class="recents">
          <p class="section-label">Recent</p>
          <ul class="instance-list">
            <li v-for="inst in recents" :key="'r-' + inst.id">
              <button type="button" class="instance-row instance-row--compact" @click="pickRecent(inst)">
                <span class="instance-row-label">{{ inst.label }}</span>
                <span class="instance-row-meta">{{ inst.fqdn || inst.api_base_url }}</span>
              </button>
            </li>
          </ul>
        </div>

        <button
          type="button"
          class="btn-secondary"
          :disabled="catalogLoading"
          @click="refreshCatalog"
        >
          {{ catalogLoading ? 'Refreshing…' : 'Refresh catalog' }}
        </button>

        <button type="button" class="btn-link" @click="showManualApiUrl = true; step = 'credentials'">
          Enter API URL manually
        </button>
      </section>

      <!-- Credentials -->
      <template v-if="step === 'credentials'">
        <div v-if="recents.length && (catalogError || showManualApiUrl)" class="recents">
          <p class="section-label">Recent instances</p>
          <ul class="instance-list">
            <li v-for="inst in recents" :key="'c-' + inst.id">
              <button type="button" class="instance-row instance-row--compact" @click="pickRecent(inst)">
                <span class="instance-row-label">{{ inst.label }}</span>
                <span class="instance-row-meta">{{ inst.fqdn || inst.api_base_url }}</span>
              </button>
            </li>
          </ul>
        </div>

        <div
          v-if="selectedInstance && !showManualApiUrl"
          class="selected-instance-panel"
          aria-live="polite"
        >
          <p class="selected-instance-k">Selected instance</p>
          <p class="selected-instance-v">{{ selectedSummary }}</p>
          <button
            v-if="fleetMode && catalogInstances.length > 0"
            type="button"
            class="btn-link-inline"
            @click="backToPicker"
          >
            Change instance
          </button>
        </div>

        <label v-if="needsApiUrlField" for="baseUrl">API base URL</label>
        <input
          v-if="needsApiUrlField"
          id="baseUrl"
          v-model="baseUrl"
          type="url"
          placeholder="e.g. https://08jzwn.pbx3.com:44300/api"
          :required="needsApiUrlField"
        />

        <button
          v-if="fleetMode && !showManualApiUrl && catalogInstances.length !== 0"
          type="button"
          class="btn-link"
          @click="showManualApiUrl = true"
        >
          Use a different API URL
        </button>

        <label for="email">Email</label>
        <input
          id="email"
          v-model="email"
          type="email"
          placeholder="admin@pbx3.com"
          required
          autocomplete="email"
        />

        <label for="password">Password</label>
        <input
          id="password"
          v-model="password"
          type="password"
          placeholder="Password"
          required
          autocomplete="current-password"
        />

        <p v-if="error" class="error">{{ error }}</p>

        <button type="submit" :disabled="loading">
          {{ loading ? 'Signing in…' : 'Sign in' }}
        </button>
      </template>
    </form>
  </div>
</template>

<style scoped>
.login {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}
.login-form {
  width: 100%;
  max-width: 26rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.login-form h1 {
  font-size: 1.5rem;
  margin-bottom: 0;
}
.subtitle {
  color: #64748b;
  font-size: 0.875rem;
  margin: 0 0 0.25rem 0;
}
.catalog-warning {
  color: #b45309;
  background: #fffbeb;
  border: 1px solid #fcd34d;
  border-radius: 0.375rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  margin: 0;
}
.instance-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.section-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #64748b;
  margin: 0;
}
.instance-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.instance-row {
  width: 100%;
  text-align: left;
  padding: 0.65rem 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  background: #fff;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
.instance-row:hover {
  border-color: #3b82f6;
  background: #f8fafc;
}
.instance-row-label {
  font-weight: 600;
  font-size: 0.9375rem;
}
.instance-row-meta {
  font-size: 0.8125rem;
  color: #64748b;
}
.instance-row-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: 0.25rem;
}
.badge {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  padding: 0.1rem 0.4rem;
  border-radius: 0.25rem;
  background: #e2e8f0;
  color: #475569;
}
.badge--warn {
  background: #fef3c7;
  color: #92400e;
}
.pick-hint {
  font-size: 0.875rem;
  color: #64748b;
  margin: 0;
}
.selected-instance-panel {
  padding: 0.65rem 0.75rem;
  border-radius: 0.375rem;
  border: 1px solid #bfdbfe;
  background: #eff6ff;
  margin: 0;
}
.selected-instance-k {
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #64748b;
  margin: 0 0 0.25rem 0;
}
.selected-instance-v {
  font-size: 0.9375rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 0.35rem 0;
}
.login-form label {
  font-size: 0.875rem;
  font-weight: 500;
}
.login-form input {
  padding: 0.5rem 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  font-size: 1rem;
}
.login-form input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}
.error {
  color: #dc2626;
  font-size: 0.875rem;
  margin: 0;
}
.login-form button[type='submit'] {
  margin-top: 0.25rem;
  padding: 0.5rem 1rem;
  font-size: 1rem;
  font-weight: 500;
  color: #fff;
  background: #2563eb;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
}
.login-form button[type='submit']:hover:not(:disabled) {
  background: #1d4ed8;
}
.login-form button[type='submit']:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
.btn-secondary {
  padding: 0.45rem 0.75rem;
  font-size: 0.875rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  background: #f8fafc;
  cursor: pointer;
}
.btn-secondary:hover:not(:disabled) {
  background: #f1f5f9;
}
.btn-link,
.btn-link-inline {
  background: none;
  border: none;
  color: #2563eb;
  font-size: 0.875rem;
  cursor: pointer;
  padding: 0;
  text-align: left;
}
.btn-link-inline {
  text-decoration: underline;
}
</style>
