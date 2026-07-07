<script setup>
import { ref, onMounted, onBeforeUnmount, watch, computed, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useHelp } from '@/composables/useHelp'
import { getApiClient } from '@/api/client'
import CommitButton from '@/components/CommitButton.vue'
import NavIcon from '@/components/NavIcon.vue'
import SessionContextChips from '@/components/SessionContextChips.vue'

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
  '/recordings',
  '/users'
]

const showCommitButton = computed(() => {
  if (!auth.can('admin')) return false
  const path = route.path.replace(/\/$/, '') || '/'
  return !COMMIT_HIDDEN_PATH_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(prefix + '/')
  )
})

const navGroups = [
  {
    id: 'tenancy',
    heading: 'Tenancy',
    icon: 'building2',
    links: [{ to: '/tenants', label: 'Tenants', icon: 'building2' }]
  },
  {
    id: 'endpoints',
    heading: 'Endpoints',
    icon: 'phone',
    links: [
      { to: '/extensions', label: 'Extensions', icon: 'phone' },
      { to: '/conferences', label: 'Conferences', icon: 'users' }
    ]
  },
  {
    id: 'inbound',
    heading: 'Inbound',
    icon: 'phone-incoming',
    links: [{ to: '/inbound-routes', label: 'DID routes', icon: 'phone-incoming' }]
  },
  {
    id: 'outbound',
    heading: 'Outbound',
    icon: 'link',
    links: [
      { to: '/trunks', label: 'Trunks', icon: 'link' },
      { to: '/routes', label: 'Routes', icon: 'route' }
    ]
  },
  {
    id: 'acd',
    heading: 'ACD',
    icon: 'list-ordered',
    links: [
      { to: '/queues', label: 'Queues / Ring groups', icon: 'list-ordered' },
      { to: '/ivrs', label: 'IVRs', icon: 'git-branch' },
      { to: '/greetings', label: 'Greetings', icon: 'volume2' },
      { to: '/agents', label: 'Agents', icon: 'headset' },
      { to: '/recordings', label: 'Recordings', icon: 'mic' }
    ]
  },
  {
    id: 'schedules',
    heading: 'Schedules & policy',
    icon: 'clock',
    links: [
      { to: '/daytimers', label: 'Day timers', icon: 'clock' },
      { to: '/holidaytimers', label: 'Holiday timers', icon: 'calendar' },
      { to: '/cosrules', label: 'Class of Service', icon: 'shield' }
    ]
  },
  {
    id: 'system',
    heading: 'System',
    icon: 'layers',
    links: [
      { to: '/asterisk-files', label: 'Asterisk Files', icon: 'file-code' },
      { to: '/backup', label: 'Backup', icon: 'database' },
      { to: '/certificates', label: 'Certificates', icon: 'lock' },
      { to: '/customapps', label: 'Custom Apps', icon: 'package' },
      { to: '/devices', label: 'Devices', icon: 'smartphone' },
      { to: '/firewall', label: 'Firewall', icon: 'shield-alert' },
      { to: '/help-messages', label: 'Help messages', icon: 'help-circle' },
      { to: '/sysglobals', label: 'Instance Globals', icon: 'sliders' },
      { to: '/logs', label: 'Logs', icon: 'scroll-text' },
      { to: '/ip-settings', label: 'Network', icon: 'wifi' },
      { to: '/users', label: 'Users', icon: 'user-cog' }
    ]
  }
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

/** Keep the current route’s nav link visible inside the scrollable sidebar (SPA_SHELL_ROADMAP). */
function scrollActiveNavIntoView() {
  const nav = sidebarRef.value
  if (!nav) return
  const active = nav.querySelector('a.nav-link.active')
  if (!active || !(active instanceof HTMLElement)) return
  active.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' })
}

function groupIdForPath(path) {
  const p = path.replace(/\/$/, '') || '/'
  const g = navGroups.find((gr) =>
    gr.links.some((l) => l.to === p || (l.to !== '/' && p.startsWith(l.to + '/')))
  )
  return g?.id ?? null
}

function ensureCurrentGroupOpen() {
  const id = groupIdForPath(route.path)
  const next = {}
  navGroups.forEach((g) => {
    next[g.id] = g.id === id
  })
  expanded.value = next
}

async function toggle(id) {
  const willBeOpen = !expanded.value[id]
  const next = {}
  navGroups.forEach((g) => {
    next[g.id] = g.id === id ? willBeOpen : false
  })
  expanded.value = next
  await nextTick()
  scrollActiveNavIntoView()
}

/** Instance chip uses `sysglobals.fqdn`; keep in sync after login and when any view loads globals. */
async function refreshGlobalsFqdnForTopBar() {
  if (!auth.isLoggedIn) return
  try {
    const g = await getApiClient().get('sysglobals')
    auth.setGlobalsFqdnFromSysglobal(g)
  } catch {
    auth.setGlobalsFqdn('')
  }
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
  if (auth.isLoggedIn) {
    await refreshGlobalsFqdnForTopBar()
  }
  await nextTick()
  restoreSidebarScroll()
  requestAnimationFrame(() => scrollActiveNavIntoView())
})

watch(
  () => auth.isLoggedIn,
  (loggedIn) => {
    if (loggedIn) refreshGlobalsFqdnForTopBar()
  }
)

watch(
  () => route.path,
  async () => {
    ensureCurrentGroupOpen()
    await nextTick()
    restoreSidebarScroll()
    requestAnimationFrame(() => scrollActiveNavIntoView())
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
    <aside class="sidebar">
      <div class="sidebar-top-spacer" aria-hidden="true" />
      <nav ref="sidebarRef" class="nav" @scroll.passive="onSidebarScroll">
        <template v-if="auth.can('admin')">
          <router-link to="/" class="nav-link" active-class="active" exact-active-class="active">
            <NavIcon name="home" />
            <span class="nav-link-label">Home</span>
          </router-link>

          <div v-for="group in navGroups" :key="group.id" class="nav-group">
            <button
              :id="'nav-heading-' + group.id"
              type="button"
              class="nav-heading nav-heading-btn"
              :aria-expanded="expanded[group.id]"
              :aria-controls="'nav-group-' + group.id"
              @click="toggle(group.id)"
            >
              <span class="nav-heading-leading">
                <NavIcon :name="group.icon" />
                <span class="nav-heading-text">{{ group.heading }}</span>
              </span>
              <span
                class="nav-heading-chevron"
                :class="{ open: expanded[group.id] }"
                aria-hidden="true"
                >▼</span
              >
            </button>
            <div
              v-show="expanded[group.id]"
              :id="'nav-group-' + group.id"
              class="nav-group-links"
              role="region"
              :aria-labelledby="'nav-heading-' + group.id"
            >
              <router-link
                v-for="link in group.links"
                :key="link.to"
                :to="link.to"
                class="nav-link"
                active-class="active"
              >
                <NavIcon :name="link.icon" />
                <span class="nav-link-label">{{ link.label }}</span>
              </router-link>
            </div>
          </div>
        </template>
        <template v-else>
          <router-link to="/" class="nav-link" active-class="active" exact-active-class="active">
            <NavIcon name="home" />
            <span class="nav-link-label">Home</span>
          </router-link>
        </template>
      </nav>
      <footer class="sidebar-footer" role="contentinfo">© Aelintra Telecom</footer>
    </aside>
    <div class="main">
      <header class="topbar">
        <div class="topbar-left">
          <h1 class="logo">PBX3 Admin</h1>
        </div>
        <div class="topbar-center">
          <SessionContextChips />
        </div>
        <div class="topbar-right">
          <CommitButton v-if="showCommitButton" />
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
.app-layout {
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
/* Same vertical offset as former sidebar PBX³ block: pad + 2rem × 1.25 line */
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
}
.sidebar-footer {
  flex: 0 0 auto;
  padding: 0.65rem 0.5rem;
  font-size: 0.6875rem;
  line-height: 1.35;
  color: var(--pbx-sidebar-link);
  text-align: center;
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
  padding: 0.5rem 0.75rem 0.35rem 0.65rem;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: var(--pbx-sidebar-heading);
}
.nav-heading-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.35rem;
  width: 100%;
  margin: 0;
  border: none;
  border-radius: 0.375rem;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
  text-align: left;
}
.nav-heading-btn:hover {
  background: var(--pbx-sidebar-hover-bg);
  color: var(--pbx-sidebar-fg);
}
.nav-heading-leading {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 0;
  flex: 1;
}
.nav-heading-text {
  flex: 1;
  min-width: 0;
}
.nav-heading-btn :deep(.nav-icon) {
  opacity: 0.85;
  flex-shrink: 0;
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
  padding-left: 0.5rem;
  gap: 0.125rem;
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
.nav-link :deep(.nav-icon) {
  opacity: 0.88;
}
.nav-link.active :deep(.nav-icon) {
  opacity: 1;
}
.nav-link-label {
  min-width: 0;
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
/* Equal flex wings (absolute center is out of flow, so each wing spans ~half the bar) */
.topbar-left {
  position: relative;
  z-index: 1;
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-start;
  gap: 0.65rem 1rem;
}
/* Center on viewport, not on .main only (sidebar shifts main’s geometric center right) */
.topbar-center {
  position: absolute;
  left: 50%;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  max-width: min(42rem, calc(100% - 2rem));
  transform: translateX(calc(-50% - var(--pbx-shell-sidebar-width) / 2));
}
.logo {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
  color: var(--pbx-text);
  flex-shrink: 0;
}
.topbar-right {
  position: relative;
  z-index: 1;
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
/* Absorbs extra vertical space when route content is short (same surface as .main). */
.main-tail {
  flex: 1 1 0;
  min-height: 0;
  min-width: 0;
}
</style>
