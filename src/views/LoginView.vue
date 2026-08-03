<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { createApiClient, getApiClient } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import {
  getInstanceDirectoryUrl,
  getDefaultApiBaseUrl,
  getTenantHomeUrl,
  isFleetDirectoryEnabled,
  isTenantHomeEnabled
} from '@/config/instanceDirectory'
import { useFleetModeStore } from '@/stores/fleetMode'
import { fetchInstanceCatalog, findInstanceById } from '@/utils/instanceCatalog'
import { fetchTenantHome, findTenantHome } from '@/utils/tenantHome'
import {
  looksLikeEmail,
  userMayAccessTenantShortuid
} from '@/utils/tenantAccess'
import { loadInstanceRecents, pushInstanceRecent } from '@/utils/instanceRecents'
import { resolveApiBaseUrl, usesDevApiProxy } from '@/config/apiBaseUrl'
import { loginNetworkErrorMessage } from '@/utils/loginErrors'
import { loginAvailabilityBadge } from '@/utils/fleetInstanceHealth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const fleetUi = useFleetModeStore()

const isDev = import.meta.env.DEV
const viteProxyTarget = import.meta.env.VITE_API_PROXY_TARGET ?? ''

const directoryEnabled = isFleetDirectoryEnabled()
const directoryUrl = getInstanceDirectoryUrl()
const tenantHomeEnabled = isTenantHomeEnabled()
const tenantHomeUrl = getTenantHomeUrl()
const showEntryChooser = computed(() => fleetUi.fleetAvailable)

/** @type {import('vue').Ref<'chooser'|'loading'|'pick'|'tenant'|'credentials'>} */
const step = ref(
  showEntryChooser.value ? 'chooser' : directoryEnabled ? 'loading' : 'credentials'
)

const catalogLoading = ref(false)
const catalogError = ref('')
/** @type {import('vue').Ref<import('@/utils/instanceCatalog').InstanceRecord[]>} */
const catalogInstances = ref([])
const recents = ref(loadInstanceRecents())

/** @type {import('vue').Ref<import('@/utils/instanceCatalog').InstanceRecord | null>} */
const selectedInstance = ref(null)

const tenantIdInput = ref('')
/** @type {import('vue').Ref<HTMLInputElement | null>} */
const tenantIdEl = ref(null)
/** Until unlocked, email/password stay readonly so autofill does not steal focus from Tenant id. */
const tenantCredsLocked = ref(true)
/** @type {ReturnType<typeof setTimeout>[]} */
let tenantFocusTimers = []
const tenantResolveLoading = ref(false)
/** Set only on Manage-instance path when showing selected instance; tenant door signs in in one step. */
const resolvedTenantShortuid = ref('')

const showManualApiUrl = ref(!directoryEnabled)
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

/** URL used for auth/login (dev → Vite /api proxy). */
const resolvedLoginApiUrl = computed(() => resolveApiBaseUrl(effectiveBaseUrl.value))
const loginUsesDevProxy = computed(() => usesDevApiProxy(resolvedLoginApiUrl.value))

const needsApiUrlField = computed(
  () => showManualApiUrl.value || !selectedInstance.value
)

const selectedSummary = computed(() => {
  const i = selectedInstance.value
  if (!i) return ''
  const parts = [i.label, i.fqdn].filter(Boolean)
  if (i.environment) parts.push(i.environment)
  if (resolvedTenantShortuid.value) {
    parts.unshift(`tenant ${resolvedTenantShortuid.value}`)
  }
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
  resolvedTenantShortuid.value = ''
  if ((instance.status ?? '').toLowerCase() === 'maintenance') {
    const ok = window.confirm(
      `${instance.label} is in maintenance. Open this instance anyway?`
    )
    if (!ok) return
  } else {
    const avail = loginAvailabilityBadge(instance)
    if (avail.kind === 'down') {
      const ok = window.confirm(
        `${instance.label} looks unavailable (no recent probe). Open this instance anyway?`
      )
      if (!ok) return
    }
  }
  goToCredentials(instance)
}

/** @param {import('@/utils/instanceCatalog').InstanceRecord} inst */
function availabilityBits(inst) {
  return loginAvailabilityBadge(inst)
}

/** @param {ReturnType<typeof loginAvailabilityBadge>['kind']} kind */
function availabilityClass(kind) {
  if (kind === 'healthy') return 'badge badge--ok'
  if (kind === 'warning') return 'badge badge--warn'
  if (kind === 'down') return 'badge badge--down'
  if (kind === 'paused') return 'badge badge--warn'
  return 'badge badge--muted'
}

function pickRecent(instance) {
  resolvedTenantShortuid.value = ''
  goToCredentials(instance)
}

function backToPicker() {
  if (directoryEnabled && catalogInstances.value.length > 0) {
    step.value = 'pick'
    selectedInstance.value = null
    resolvedTenantShortuid.value = ''
    showManualApiUrl.value = false
    error.value = ''
  }
}

function backToChooser() {
  if (!showEntryChooser.value) return
  step.value = 'chooser'
  selectedInstance.value = null
  resolvedTenantShortuid.value = ''
  tenantIdInput.value = ''
  showManualApiUrl.value = false
  error.value = ''
  catalogError.value = ''
}

function chooseManageInstance() {
  error.value = ''
  catalogError.value = ''
  resolvedTenantShortuid.value = ''
  if (catalogInstances.value.length > 0) {
    step.value = 'pick'
    return
  }
  step.value = 'loading'
  void loadCatalog()
}

function clearTenantFocusTimers() {
  for (const t of tenantFocusTimers) clearTimeout(t)
  tenantFocusTimers = []
}

function unlockTenantCreds() {
  tenantCredsLocked.value = false
  clearTenantFocusTimers()
}

/** Autofill often focuses Email; bounce back while still locked. User click uses pointerdown → unlock. */
function onLockedCredFocus(e) {
  if (!tenantCredsLocked.value) return
  const t = e?.target
  if (t && typeof t.blur === 'function') t.blur()
  focusTenantIdField()
}

function focusTenantIdField() {
  tenantIdEl.value?.focus({ preventScroll: true })
}

/** Win the race with browser password-manager autofill focusing Email. */
function scheduleTenantIdFocus() {
  clearTenantFocusTimers()
  const tryFocus = () => {
    if (step.value !== 'tenant' || !tenantCredsLocked.value) return
    const active = typeof document !== 'undefined' ? document.activeElement : null
    if (active === tenantIdEl.value) return
    const id = active && 'id' in active ? String(active.id || '') : ''
    // Reclaim only if autofill jumped to creds (or nothing focused yet)
    if (!id || id === 'tenantEmail' || id === 'tenantPassword' || id === '') {
      focusTenantIdField()
    }
  }
  void nextTick(() => {
    focusTenantIdField()
    requestAnimationFrame(tryFocus)
  })
  for (const ms of [0, 50, 100, 200, 400]) {
    tenantFocusTimers.push(setTimeout(tryFocus, ms))
  }
}

function chooseSignInToTenant() {
  error.value = ''
  catalogError.value = ''
  selectedInstance.value = null
  resolvedTenantShortuid.value = ''
  showManualApiUrl.value = false
  tenantCredsLocked.value = true
  step.value = 'tenant'
  if (catalogInstances.value.length === 0 && directoryUrl) {
    void loadCatalog()
  }
  scheduleTenantIdFocus()
}

function chooseFleetConsole() {
  fleetUi.enterFleet('/')
  router.push({ name: 'fleet-tenants' })
}

function backFromCredentials() {
  backToChooser()
}

function changeTenantFromCredentials() {
  selectedInstance.value = null
  resolvedTenantShortuid.value = ''
  step.value = 'tenant'
}

/**
 * Single-step tenant door: resolve UID → node, login, require UID in allowed_clusters.
 */
async function signInToTenant() {
  error.value = ''
  if (!tenantHomeUrl) {
    error.value = 'Tenant directory is not configured for this SPA build.'
    return
  }
  const q = tenantIdInput.value.trim()
  if (!q) {
    error.value = 'Enter your tenant id (e.g. pb0wsk or pb0wsk.pbx3.com)'
    return
  }
  if (looksLikeEmail(q)) {
    error.value =
      'That looks like an email. Enter the tenant id in the first field, and your email below.'
    return
  }
  const em = email.value.trim()
  if (!em) {
    error.value = 'Email is required'
    return
  }
  if (!password.value) {
    error.value = 'Password is required'
    return
  }

  tenantResolveLoading.value = true
  loading.value = true
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(new Error('Tenant lookup timed out')), 15_000)
  try {
    if (catalogInstances.value.length === 0 && directoryUrl) {
      await loadCatalog()
    }
    const home = await fetchTenantHome(tenantHomeUrl, { signal: controller.signal })
    const row = findTenantHome(home.tenants, q)
    if (!row) {
      error.value = `Unknown tenant id “${q}” — not in catalog (hard-refresh if it was just registered)`
      return
    }
    const instance = findInstanceById(catalogInstances.value, row.instance_id)
    if (!instance?.api_base_url) {
      error.value = 'Tenant home instance is missing from the catalog'
      return
    }
    if ((instance.status ?? '').toLowerCase() === 'maintenance') {
      const ok = window.confirm(`${instance.label} is in maintenance. Sign in anyway?`)
      if (!ok) return
    } else {
      const avail = loginAvailabilityBadge(instance)
      if (avail.kind === 'down') {
        const ok = window.confirm(
          `${instance.label} looks unavailable (no recent probe). Sign in anyway?`
        )
        if (!ok) return
      }
    }

    const url = resolveApiBaseUrl(instance.api_base_url)
    const client = createApiClient(url, '')
    const res = await client.post(
      'auth/login',
      { email: em, password: password.value },
      { timeoutMs: 30_000 }
    )
    auth.setCredentials(url, res.accessToken)
    auth.setSelectedInstance(instance)
    pushInstanceRecent(instance)

    let user
    try {
      user = await getApiClient().get('auth/whoami')
    } catch {
      auth.clearCredentials()
      error.value = 'Signed in but could not load your account (whoami failed)'
      return
    }

    if (!userMayAccessTenantShortuid(user, row.shortuid)) {
      auth.clearCredentials()
      error.value = `No access to tenant ${row.shortuid} for this account`
      return
    }

    auth.setUser(user, { requireTenantShortuid: row.shortuid })
    resolvedTenantShortuid.value = row.shortuid
    router.push('/')
  } catch (err) {
    if (err?.status === 401) {
      error.value = 'Invalid email or password'
    } else if (err?.name === 'AbortError' || /timed out/i.test(String(err?.message || ''))) {
      error.value = err?.message || 'Tenant lookup timed out'
    } else if (err?.message && !err?.status) {
      error.value = err.message
    } else {
      const url = selectedInstance.value?.api_base_url || ''
      error.value = loginNetworkErrorMessage(err, url)
    }
  } finally {
    clearTimeout(timer)
    tenantResolveLoading.value = false
    loading.value = false
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
    const activeIds = new Set(catalog.instances.map((i) => i.id))
    recents.value = recents.value.filter((r) => activeIds.has(r.id))

    const queryId = typeof route.query.instance === 'string' ? route.query.instance : ''
    const fromQuery = queryId ? findInstanceById(catalog.instances, queryId) : null

    if (fromQuery) {
      goToCredentials(fromQuery)
      return
    }

    if (catalog.instances.length === 0) {
      catalogError.value = 'Catalog has no instances. Enter an API URL below or fix the index file.'
      showManualApiUrl.value = true
      if (step.value !== 'chooser') {
        step.value = 'credentials'
      }
      return
    }

    // S10.8: stay on chooser while preloading; only advance when already loading for Manage.
    if (step.value === 'loading') {
      step.value = 'pick'
    }
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
    if (step.value === 'loading') {
      step.value = recents.value.length ? 'pick' : 'credentials'
    }
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
  if (directoryEnabled) {
    // Preload catalog (chooser stays put; Manage uses pick when ready).
    void loadCatalog()
  } else if (getDefaultApiBaseUrl()) {
    baseUrl.value = resolveApiBaseUrl(getDefaultApiBaseUrl())
  }
})

async function onSubmit(e) {
  e.preventDefault()
  if (step.value === 'tenant') {
    await signInToTenant()
    return
  }
  error.value = ''
  const url = resolvedLoginApiUrl.value
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
      error.value = loginNetworkErrorMessage(err, url)
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

      <p v-if="step === 'chooser'" class="subtitle">How do you want to work?</p>
      <p v-else-if="step === 'loading'" class="subtitle">Loading instance catalog…</p>
      <p v-else-if="step === 'pick'" class="subtitle">
        {{ catalogInstances.length === 1 ? 'Select your PBX instance' : 'Choose a PBX instance' }}
      </p>
      <p v-else-if="step === 'tenant'" class="subtitle">Sign in with your tenant</p>
      <p v-else-if="selectedInstance" class="subtitle">
        Sign in to {{ selectedInstance.label }}
      </p>
      <p v-else class="subtitle">Sign in to your PBX3 instance</p>

      <p v-if="catalogError && step !== 'chooser'" class="catalog-warning" role="status">
        {{ catalogError }}
      </p>

      <!-- S10.8 login chooser + B′ tenant door -->
      <section v-if="step === 'chooser'" class="chooser-section">
        <p class="chooser-hint">
          <strong>Sign in to tenant</strong> — tenant id + email + password (customers).
          <strong>Manage instance</strong> — MSP node login.
          <strong>Fleet console</strong> — control-plane fleet account (not the same password).
        </p>
        <button
          type="button"
          class="chooser-btn"
          :disabled="!tenantHomeEnabled"
          @click="chooseSignInToTenant"
        >
          <span class="chooser-btn-title">Sign in to tenant</span>
          <span class="chooser-btn-meta">Tenant id, email, and password</span>
        </button>
        <button type="button" class="chooser-btn" @click="chooseManageInstance">
          <span class="chooser-btn-title">Manage instance</span>
          <span class="chooser-btn-meta">Tenants, extensions, trunks on one node</span>
        </button>
        <button type="button" class="chooser-btn chooser-btn--fleet" @click="chooseFleetConsole">
          <span class="chooser-btn-title">Fleet console</span>
          <span class="chooser-btn-meta">Catalog, DIDs, moves, edge — gatekeeper only</span>
        </button>
      </section>

      <!-- Tenant door: one form — UID + email + password -->
      <section v-if="step === 'tenant'" class="tenant-section">
        <button
          v-if="showEntryChooser"
          type="button"
          class="btn-link"
          @click="backToChooser"
        >
          ← Back to choices
        </button>
        <label for="tenantId">Tenant id</label>
        <input
          id="tenantId"
          ref="tenantIdEl"
          v-model="tenantIdInput"
          type="text"
          name="tenant_id"
          autocomplete="off"
          placeholder="e.g. pb0wsk or pb0wsk.pbx3.com"
          required
          @input="unlockTenantCreds"
          @keydown="unlockTenantCreds"
        />
        <label for="tenantEmail">Email</label>
        <input
          id="tenantEmail"
          v-model="email"
          type="email"
          name="email"
          placeholder="you@example.com"
          required
          autocomplete="username"
          :readonly="tenantCredsLocked"
          @pointerdown="unlockTenantCreds"
          @focus="onLockedCredFocus"
        />
        <label for="tenantPassword">Password</label>
        <input
          id="tenantPassword"
          v-model="password"
          type="password"
          name="password"
          placeholder="Password"
          required
          autocomplete="current-password"
          :readonly="tenantCredsLocked"
          @pointerdown="unlockTenantCreds"
          @focus="onLockedCredFocus"
        />
        <p v-if="error && step === 'tenant'" class="error" role="alert">{{ error }}</p>
        <button
          type="submit"
          class="btn-primary"
          :disabled="tenantResolveLoading || loading"
        >
          {{ tenantResolveLoading || loading ? 'Signing in…' : 'Sign in' }}
        </button>
      </section>

      <!-- Fleet picker -->
      <section v-if="step === 'pick'" class="instance-section">
        <button
          v-if="showEntryChooser"
          type="button"
          class="btn-link"
          @click="backToChooser"
        >
          ← Back to choices
        </button>
        <p v-if="catalogInstances.length === 1" class="pick-hint">
          Click the instance below, then enter your credentials.
        </p>
        <ul class="instance-list" role="listbox" aria-label="Instances">
          <li v-for="inst in catalogInstances" :key="inst.id">
            <button type="button" class="instance-row" @click="pickInstance(inst)">
              <span class="instance-row-label">{{ inst.label }}</span>
              <span class="instance-row-meta">{{ inst.fqdn }}</span>
              <span class="instance-row-badges">
                <span v-if="inst.environment" class="badge">{{ inst.environment }}</span>
                <span
                  :class="availabilityClass(availabilityBits(inst).kind)"
                >
                  {{ availabilityBits(inst).label }}
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
        <button
          v-if="showEntryChooser"
          type="button"
          class="btn-link"
          @click="backFromCredentials"
        >
          ← Back
        </button>
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
            v-if="resolvedTenantShortuid"
            type="button"
            class="btn-link-inline"
            @click="changeTenantFromCredentials"
          >
            Change tenant
          </button>
          <button
            v-else-if="directoryEnabled && catalogInstances.length > 0"
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
          v-if="directoryEnabled && !showManualApiUrl && catalogInstances.length !== 0"
          type="button"
          class="btn-link"
          @click="showManualApiUrl = true"
        >
          Use a different API URL
        </button>

        <p v-if="isDev && resolvedLoginApiUrl" class="dev-api-hint" role="status">
          Dev API:
          <span class="mono">{{ resolvedLoginApiUrl }}</span>
          <span v-if="loginUsesDevProxy && viteProxyTarget"> → {{ viteProxyTarget }}</span>
          <span v-else-if="!loginUsesDevProxy"> (direct — not via Vite proxy)</span>
        </p>

        <label for="email">Email</label>
        <input
          id="email"
          v-model="email"
          type="email"
          placeholder="admin@pbx3.com"
          required
          autocomplete="username"
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

        <button type="submit" class="btn-primary" :disabled="loading">
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
.dev-api-hint {
  font-size: 0.75rem;
  color: #64748b;
  margin: 0 0 0.75rem;
  line-height: 1.4;
}
.dev-api-hint .mono {
  font-family: ui-monospace, monospace;
  word-break: break-all;
}
.instance-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.chooser-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 0.25rem;
}
.tenant-section {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}
.chooser-hint {
  margin: 0;
  font-size: 0.85rem;
  color: #64748b;
  line-height: 1.45;
}
.chooser-btn {
  width: 100%;
  text-align: left;
  padding: 0.85rem 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  background: #fff;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.chooser-btn:hover {
  border-color: #3b82f6;
  background: #f8fafc;
}
.chooser-btn--fleet {
  border-color: #bfdbfe;
  background: #f8fbff;
}
.chooser-btn-title {
  font-size: 1rem;
  font-weight: 600;
  color: #0f172a;
}
.chooser-btn-meta {
  font-size: 0.8rem;
  color: #64748b;
  line-height: 1.35;
}
.btn-primary {
  margin-top: 0.25rem;
  padding: 0.5rem 1rem;
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
}
.btn-primary:hover:not(:disabled) {
  background: #1d4ed8;
}
.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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
.badge--ok {
  background: #dcfce7;
  color: #166534;
}
.badge--down {
  background: #fee2e2;
  color: #991b1b;
}
.badge--muted {
  background: #f1f5f9;
  color: #64748b;
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
