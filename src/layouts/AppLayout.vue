<script setup>
import { ref, onMounted, onBeforeUnmount, watch, computed, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useHelp } from '@/composables/useHelp'
import { getApiClient } from '@/api/client'
import CommitButton from '@/components/CommitButton.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

/** Panels that do NOT show the Commit button (no config commit applies). */
const COMMIT_HIDDEN_PATH_PREFIXES = [
  '/backup',
  '/certificates',
  '/devices',
  '/firewall',
  '/help-messages',
  '/ip-settings',
  '/logs',
  '/users'
]

const showCommitButton = computed(() => {
  if (!auth.can('admin')) return false
  const path = route.path.replace(/\/$/, '') || '/'
  return !COMMIT_HIDDEN_PATH_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix + '/'))
})

const navGroups = [
  { id: 'tenancy', heading: 'Tenancy', links: [{ to: '/tenants', label: 'Tenants' }] },
  { id: 'endpoints', heading: 'Endpoints', links: [{ to: '/extensions', label: 'Extensions' }, { to: '/conferences', label: 'Conferences' }] },
  { id: 'inbound', heading: 'Inbound', links: [{ to: '/inbound-routes', label: 'DID routes' }] },
  { id: 'outbound', heading: 'Outbound', links: [{ to: '/trunks', label: 'Trunks' }, { to: '/routes', label: 'Routes' }] },
  { id: 'acd', heading: 'ACD', links: [{ to: '/queues', label: 'Queues / Ring groups' }, { to: '/ivrs', label: 'IVRs' }, { to: '/greetings', label: 'Greetings' }, { to: '/agents', label: 'Agents' }] },
  { id: 'schedules', heading: 'Schedules & policy', links: [{ to: '/daytimers', label: 'Day timers' }, { to: '/holidaytimers', label: 'Holiday timers' }, { to: '/cosrules', label: 'Class of Service' }] },
  { id: 'system', heading: 'System', links: [{ to: '/asterisk-files', label: 'Asterisk Files' }, { to: '/backup', label: 'Backup' }, { to: '/certificates', label: 'Certificates' }, { to: '/customapps', label: 'Custom Apps' }, { to: '/devices', label: 'Devices' }, { to: '/firewall', label: 'Firewall' }, { to: '/help-messages', label: 'Help messages' }, { to: '/logs', label: 'Logs' }, { to: '/ip-settings', label: 'Network' }, { to: '/sysglobals', label: 'System Globals' }, { to: '/users', label: 'Users' }] }
]

const expanded = ref({})

/** Scroll position of the left nav (sidebar) — survives refresh and keeps position after route changes + DOM updates. */
const sidebarRef = ref(null)
const SIDEBAR_SCROLL_KEY = 'pbx3spa-sidebar-scroll'
let sidebarScrollSaveRaf = null

function persistSidebarScroll() {
  const el = sidebarRef.value
  if (!el) return
  try {
    sessionStorage.setItem(SIDEBAR_SCROLL_KEY, String(el.scrollTop))
  } catch {
    // private mode / quota
  }
}

function onSidebarScroll() {
  if (sidebarScrollSaveRaf != null) return
  sidebarScrollSaveRaf = requestAnimationFrame(() => {
    sidebarScrollSaveRaf = null
    persistSidebarScroll()
  })
}

function restoreSidebarScroll() {
  const el = sidebarRef.value
  if (!el) return
  try {
    const raw = sessionStorage.getItem(SIDEBAR_SCROLL_KEY)
    if (raw == null || raw === '') return
    const y = Number.parseInt(raw, 10)
    if (!Number.isFinite(y) || y < 0) return
    el.scrollTop = y
  } catch {
    // ignore
  }
}

function groupIdForPath(path) {
  const p = path.replace(/\/$/, '') || '/'
  const g = navGroups.find((gr) => gr.links.some((l) => l.to === p || (l.to !== '/' && p.startsWith(l.to + '/'))))
  return g?.id ?? null
}

function ensureCurrentGroupOpen() {
  const id = groupIdForPath(route.path)
  const next = {}
  navGroups.forEach((g) => { next[g.id] = g.id === id })
  expanded.value = next
}

function toggle(id) {
  const willBeOpen = !expanded.value[id]
  const next = {}
  navGroups.forEach((g) => { next[g.id] = g.id === id ? willBeOpen : false })
  expanded.value = next
}

onMounted(async () => {
  ensureCurrentGroupOpen()
  if (auth.can('admin')) {
    const { ensureFetched } = useHelp()
    await ensureFetched()
  }
  if (auth.isLoggedIn && !auth.user) {
    try {
      const user = await getApiClient().get('auth/whoami')
      auth.setUser(user)
    } catch {
      // token may be expired; leave user null
    }
  }
  await nextTick()
  restoreSidebarScroll()
})

watch(
  () => route.path,
  async () => {
    ensureCurrentGroupOpen()
    await nextTick()
    restoreSidebarScroll()
  }
)

onBeforeUnmount(() => {
  persistSidebarScroll()
  if (sidebarScrollSaveRaf != null) {
    cancelAnimationFrame(sidebarScrollSaveRaf)
    sidebarScrollSaveRaf = null
  }
})

async function logout() {
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
  <div class="app-layout">
    <aside ref="sidebarRef" class="sidebar" @scroll.passive="onSidebarScroll">
      <nav class="nav">
        <template v-if="auth.can('admin')">
          <router-link to="/" class="nav-link" active-class="active" exact-active-class="active">Home</router-link>

          <div v-for="group in navGroups" :key="group.id" class="nav-group">
            <button
              type="button"
              class="nav-heading nav-heading-btn"
              :aria-expanded="expanded[group.id]"
              :aria-controls="'nav-group-' + group.id"
              :id="'nav-heading-' + group.id"
              @click="toggle(group.id)"
            >
              <span class="nav-heading-text">{{ group.heading }}</span>
              <span class="nav-heading-chevron" :class="{ open: expanded[group.id] }" aria-hidden="true">▼</span>
            </button>
            <div :id="'nav-group-' + group.id" class="nav-group-links" role="region" :aria-labelledby="'nav-heading-' + group.id" v-show="expanded[group.id]">
              <router-link v-for="link in group.links" :key="link.to" :to="link.to" class="nav-link" active-class="active">{{ link.label }}</router-link>
            </div>
          </div>
        </template>
        <template v-else>
          <router-link to="/" class="nav-link" active-class="active" exact-active-class="active">Home</router-link>
        </template>
      </nav>
    </aside>
    <div class="main">
      <header class="topbar">
        <h1 class="logo">PBX3 Admin</h1>
        <div class="topbar-right">
          <CommitButton v-if="showCommitButton" />
          <span v-if="auth.user" class="user">Logged in as {{ auth.user.name || auth.user.email }}</span>
          <button type="button" class="logout-btn" @click="logout">Logout</button>
        </div>
      </header>
      <main class="content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}
.sidebar {
  width: 12rem;
  flex-shrink: 0;
  height: 100vh;
  overflow-y: auto;
  background: #1e293b;
  color: #f8fafc;
}
.nav {
  display: flex;
  flex-direction: column;
  padding: 1rem 0;
}
.nav-group {
  display: flex;
  flex-direction: column;
  margin-top: 0.75rem;
}
.nav-group:first-of-type {
  margin-top: 0.5rem;
}
.nav-heading {
  padding: 0.5rem 1rem 0.35rem;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #e2e8f0;
}
.nav-heading-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  margin: 0;
  border: none;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
  text-align: left;
}
.nav-heading-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #f8fafc;
}
.nav-heading-text {
  flex: 1;
}
.nav-heading-chevron {
  font-size: 0.5rem;
  opacity: 0.8;
  transform: rotate(-90deg);
  transition: transform 0.15s ease;
}
.nav-heading-chevron.open {
  transform: rotate(0deg);
}
.nav-group-links {
  display: flex;
  flex-direction: column;
  padding-left: 1rem;
}
.nav-link {
  padding: 0.5rem 1rem;
  color: #cbd5e1;
  text-decoration: none;
  font-size: 0.9375rem;
}
.nav-link:hover {
  color: #f8fafc;
  background: rgba(255, 255, 255, 0.05);
}
.nav-link.active {
  color: #f8fafc;
  background: rgba(255, 255, 255, 0.1);
  font-weight: 500;
}
.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100vh;
  overflow: hidden;
}
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.5rem;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  position: sticky;
  top: 0;
  z-index: 10;
}
.logo {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
  color: #0f172a;
}
.topbar-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.user {
  font-size: 0.875rem;
  color: #64748b;
}
.logout-btn {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
  color: #64748b;
  background: transparent;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  cursor: pointer;
}
.logout-btn:hover {
  color: #0f172a;
  background: #f1f5f9;
}
.content {
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
  min-height: 0;
}
</style>
