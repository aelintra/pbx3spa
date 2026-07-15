<script setup>
/**
 * Fleet mode shell — gatekeeper-only nav. Does not mount tenant AppLayout.
 * Design: TENANT_MOBILITY_FLEET_CONSOLE_DESIGN.md §2.5
 */
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useFleetModeStore } from '@/stores/fleetMode'
import NavIcon from '@/components/NavIcon.vue'
import { getApiClient } from '@/api/client'

const router = useRouter()
const auth = useAuthStore()
const fleetMode = useFleetModeStore()

const navLinks = [
  { to: '/fleet/instances', label: 'Instances', icon: 'layers' },
  { to: '/fleet/tenants', label: 'Tenants', icon: 'building2' },
  { to: '/fleet/dids', label: 'DIDs', icon: 'phone' },
  { to: '/fleet/jobs', label: 'Jobs', icon: 'list-ordered' },
  { to: '/fleet/reconcile', label: 'Reconcile', icon: 'git-branch' },
  { to: '/fleet/users', label: 'Users', icon: 'users' }
]

async function exitFleet() {
  // Leave UI mode immediately so a slow/hanging revoke never traps the operator.
  const path = fleetMode.returnPath || '/'
  fleetMode.mode = 'tenant'
  fleetMode.persist()
  try {
    await fleetMode.exitFleet()
  } catch {
    // exitFleet already clears token best-effort; navigate anyway
  }
  router.push(path && !String(path).startsWith('/fleet') ? path : '/')
}

async function logout() {
  await fleetMode.reset()
  try {
    await getApiClient().get('auth/logout')
  } catch {
    // still clear and redirect
  }
  auth.clearCredentials()
  router.push('/login')
}
</script>

<template>
  <div class="fleet-layout">
    <aside class="sidebar">
      <div class="sidebar-top-spacer" aria-hidden="true" />
      <nav class="nav">
        <p class="nav-mode-label">Fleet console</p>
        <router-link
          v-for="link in navLinks"
          :key="link.to"
          :to="link.to"
          class="nav-link"
          active-class="active"
        >
          <NavIcon :name="link.icon" />
          <span class="nav-link-label">{{ link.label }}</span>
        </router-link>
        <button type="button" class="exit-fleet-nav" @click="exitFleet">
          Exit Fleet
        </button>
      </nav>
      <footer class="sidebar-footer" role="contentinfo">© Aelintra Telecom</footer>
    </aside>
    <div class="main">
      <header class="topbar">
        <div class="topbar-left">
          <h1 class="logo">PBX3 Fleet</h1>
        </div>
        <div class="topbar-center">
          <span class="fleet-chip">Fleet mode</span>
        </div>
        <div class="topbar-right">
          <button type="button" class="exit-fleet-btn" @click="exitFleet">
            Exit Fleet
          </button>
          <span v-if="auth.user" class="user"
            >Logged in as {{ auth.user.name || auth.user.email }}</span
          >
          <button type="button" class="logout-btn" @click="logout">Logout</button>
        </div>
      </header>
      <main class="content">
        <router-view />
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
.sidebar-top-spacer {
  flex: 0 0 auto;
  box-sizing: border-box;
  min-height: calc(0.75rem * 2 + 2rem * 1.25);
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
