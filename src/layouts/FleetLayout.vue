<script setup>
/**
 * Fleet mode shell — gatekeeper-only nav. Does not mount tenant AppLayout.
 * Design: TENANT_MOBILITY_FLEET_CONSOLE_DESIGN.md §2.5
 *
 * Exit Fleet vs Logout:
 * - Dual-hat (instance Sanctum present): Exit = revoke fleet, return to instance;
 *   Logout = revoke fleet + instance, → /login.
 * - Fleet-only (chooser → Fleet console): one Logout → /login (no Exit Fleet).
 *
 * Auth gate (S10.8): panel nav stays locked until gatekeeper Sign in — one login surface
 * in this layout (not per child route).
 */
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useFleetModeStore } from '@/stores/fleetMode'
import BrandMark from '@/components/BrandMark.vue'
import NavIcon from '@/components/NavIcon.vue'
import FleetTokenGate from '@/components/FleetTokenGate.vue'
import { useInactivityLogout } from '@/composables/useInactivityLogout'
import { getApiClient } from '@/api/client'
import { hasFleetGatekeeperToken } from '@/config/fleetGatekeeper'

const router = useRouter()
const auth = useAuthStore()
const fleetMode = useFleetModeStore()

/** Instance Sanctum session — dual-hat when true. */
const hasInstanceSession = computed(() => auth.isLoggedIn)

const fleetSignedIn = ref(hasFleetGatekeeperToken())
/** Bump to remount panel views after Sign in so onMounted reloads. */
const fleetSessionKey = ref(0)

function onFleetAuthSaved() {
  fleetSignedIn.value = true
  fleetSessionKey.value += 1
}

function onFleetAuthCleared() {
  fleetSignedIn.value = false
  fleetSessionKey.value += 1
}

function onNavClick(e) {
  if (!fleetSignedIn.value) {
    e.preventDefault()
  }
}

const navLinks = [
  { to: '/fleet/instances', label: 'Instances', icon: 'layers' },
  { to: '/fleet/tenants', label: 'Tenants', icon: 'building2' },
  { to: '/fleet/site-groups', label: 'Site Groups', icon: 'link' },
  { to: '/fleet/dids', label: 'DIDs', icon: 'phone' },
  { to: '/fleet/jobs', label: 'Jobs', icon: 'list-ordered' },
  { to: '/fleet/reconcile', label: 'Reconcile', icon: 'git-branch' },
  { to: '/fleet/edge', label: 'Edge HA', icon: 'shield' },
  { to: '/fleet/velocity', label: 'Velocity', icon: 'shield-alert' },
  { to: '/fleet/users', label: 'Users', icon: 'users' },
  { to: '/fleet/security', label: 'Fleet 2FA', icon: 'lock' }
]

async function exitFleet() {
  // Leave UI mode immediately so a slow/hanging revoke never traps the operator.
  const hadSanctum = auth.isLoggedIn
  const path = fleetMode.returnPath || '/'
  fleetMode.mode = 'tenant'
  fleetMode.persist()
  try {
    await fleetMode.exitFleet()
  } catch {
    // exitFleet already clears token best-effort; navigate anyway
  }
  fleetSignedIn.value = false
  if (hadSanctum) {
    router.push(path && !String(path).startsWith('/fleet') ? path : '/')
  } else {
    router.push('/login')
  }
}

async function logout() {
  const revokeFleet = fleetMode.reset()
  const revokeInstance = auth.isLoggedIn
    ? getApiClient()
        .get('auth/logout')
        .catch(() => undefined)
    : Promise.resolve()
  fleetSignedIn.value = false
  if (auth.isLoggedIn) {
    auth.clearCredentials()
  }
  void router.push('/login')
  await Promise.allSettled([revokeFleet, revokeInstance])
}

useInactivityLogout(logout, computed(() => fleetSignedIn.value || auth.isLoggedIn))
</script>

<template>
  <div class="fleet-layout">
    <aside class="sidebar">
      <BrandMark to="/fleet" />
      <nav class="nav" :class="{ 'nav--locked': !fleetSignedIn }" aria-label="Fleet">
        <p class="nav-mode-label">Fleet console</p>
        <p v-if="!fleetSignedIn" class="nav-lock-hint">Sign in to open panels</p>
        <router-link
          v-for="link in navLinks"
          :key="link.to"
          :to="link.to"
          class="nav-link"
          :class="{ 'nav-link--disabled': !fleetSignedIn }"
          active-class="active"
          :tabindex="fleetSignedIn ? 0 : -1"
          :aria-disabled="!fleetSignedIn ? 'true' : undefined"
          @click="onNavClick"
        >
          <NavIcon :name="link.icon" />
          <span class="nav-link-label">{{ link.label }}</span>
        </router-link>
        <button
          v-if="hasInstanceSession"
          type="button"
          class="exit-fleet-nav"
          @click="exitFleet"
        >
          Exit Fleet
        </button>
        <button v-else type="button" class="exit-fleet-nav" @click="logout">
          Logout
        </button>
      </nav>
      <footer class="sidebar-footer" role="contentinfo">© Aelintra Telecom</footer>
    </aside>
    <div class="main">
      <header class="topbar">
        <div class="topbar-left">
          <h1 class="logo">Fleet</h1>
        </div>
        <div class="topbar-center">
          <span class="fleet-chip">Fleet mode</span>
        </div>
        <div class="topbar-right">
          <template v-if="hasInstanceSession">
            <button type="button" class="exit-fleet-btn" @click="exitFleet">
              Exit Fleet
            </button>
            <span v-if="auth.user" class="user"
              >Logged in as {{ auth.user.name || auth.user.email }}</span
            >
            <button type="button" class="logout-btn" @click="logout">Logout</button>
          </template>
          <button v-else type="button" class="logout-btn" @click="logout">
            Logout
          </button>
        </div>
      </header>
      <main class="content">
        <FleetTokenGate @saved="onFleetAuthSaved" @cleared="onFleetAuthCleared" />
        <router-view v-if="fleetSignedIn" :key="fleetSessionKey" />
      </main>
      <div class="main-tail" aria-hidden="true" />
    </div>
  </div>
</template>

<style scoped>
.fleet-layout {
  --pbx-shell-sidebar-width: 15.75rem;
  display: flex;
  height: 100vh;
  overflow: hidden;
}
.sidebar {
  display: flex;
  flex-direction: column;
  width: var(--pbx-shell-sidebar-width);
  flex-shrink: 0;
  height: 100vh;
  min-height: 0;
  overflow: hidden;
  background: var(--pbx-sidebar-bg);
  color: var(--pbx-sidebar-fg);
  border-right: 1px solid var(--pbx-border);
}
.nav {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  padding: 0.65rem 0.375rem 1rem;
  gap: 0.125rem;
}
.nav-mode-label {
  margin: 0 0 0.75rem;
  padding: 0.35rem 0.65rem;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--pbx-sidebar-heading);
}
.nav-lock-hint {
  margin: -0.35rem 0 0.65rem;
  padding: 0 0.65rem;
  font-size: 0.75rem;
  color: var(--pbx-sidebar-link);
  opacity: 0.85;
}
.nav-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0.65rem;
  margin: 0.0625rem 0;
  border-radius: 0.375rem;
  color: var(--pbx-sidebar-link);
  text-decoration: none;
  font-size: 0.875rem;
  line-height: 1.35;
}
.nav-link:hover {
  color: var(--pbx-text);
  background: var(--pbx-sidebar-hover-bg);
}
.nav-link.active {
  color: var(--pbx-sidebar-active-color);
  background: var(--pbx-sidebar-active-bg);
  font-weight: 500;
}
.nav--locked .nav-link--disabled,
.nav-link--disabled {
  opacity: 0.45;
  pointer-events: none;
  cursor: not-allowed;
}
.exit-fleet-nav {
  margin-top: 1.25rem;
  padding: 0.5rem 0.65rem;
  border: 1px solid var(--pbx-border);
  border-radius: 0.375rem;
  background: transparent;
  color: var(--pbx-sidebar-link);
  font-size: 0.875rem;
  cursor: pointer;
  text-align: left;
}
.exit-fleet-nav:hover {
  color: var(--pbx-text);
  background: var(--pbx-sidebar-hover-bg);
}
.sidebar-footer {
  flex: 0 0 auto;
  padding: 0.65rem 0.5rem;
  font-size: 0.6875rem;
  line-height: 1.35;
  color: var(--pbx-sidebar-link);
  text-align: center;
}
.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100vh;
  overflow: hidden;
  background: var(--pbx-canvas);
  padding: 0;
}
.topbar {
  flex: 0 0 auto;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 1.25rem;
  padding: 0.75rem 1.5rem;
  background: var(--pbx-canvas);
  border-bottom: 1px solid var(--pbx-border);
  position: sticky;
  top: 0;
  z-index: 10;
}
.topbar-left {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  align-items: center;
}
.topbar-center {
  flex: 0 0 auto;
}
.fleet-chip {
  display: inline-block;
  padding: 0.25rem 0.65rem;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--pbx-accent, #1d4ed8);
  background: var(--pbx-surface-subtle, #f1f5f9);
  border: 1px solid var(--pbx-border);
  border-radius: 0.375rem;
}
.exit-fleet-btn {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--pbx-accent, #1d4ed8);
  background: transparent;
  border: 1px solid var(--pbx-accent, #1d4ed8);
  border-radius: 0.375rem;
  cursor: pointer;
}
.exit-fleet-btn:hover {
  background: var(--pbx-surface-subtle, #f1f5f9);
}
.logo {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
  color: var(--pbx-text);
}
.topbar-right {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 1rem;
}
.user {
  font-size: 0.875rem;
  color: var(--pbx-text-muted);
}
.logout-btn {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
  color: var(--pbx-text-muted);
  background: transparent;
  border: 1px solid var(--pbx-border);
  border-radius: 0.375rem;
  cursor: pointer;
}
.logout-btn:hover {
  color: var(--pbx-text);
  background: var(--pbx-surface-subtle);
}
.content {
  flex: 0 1 auto;
  align-self: stretch;
  margin: 0;
  padding: 1.25rem 1.5rem 1.5rem;
  min-height: 0;
  max-height: calc(100vh - var(--pbx-layout-topbar));
  max-height: calc(100dvh - var(--pbx-layout-topbar));
  overflow-y: auto;
  background: transparent;
}
.main-tail {
  flex: 1 1 0;
  min-height: 0;
  min-width: 0;
}
</style>
