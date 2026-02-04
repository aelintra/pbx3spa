<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getApiClient } from '@/api/client'

const router = useRouter()
const auth = useAuthStore()

onMounted(async () => {
  if (auth.isLoggedIn && !auth.user) {
    try {
      const user = await getApiClient().get('auth/whoami')
      auth.setUser(user)
    } catch {
      // token may be expired; leave user null
    }
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
      <nav class="nav">
        <router-link to="/" class="nav-link" active-class="active" exact-active-class="active">Home</router-link>
        <router-link to="/tenants" class="nav-link" active-class="active">Tenants</router-link>
        <router-link to="/extensions" class="nav-link" active-class="active">Extensions</router-link>
        <router-link to="/trunks" class="nav-link" active-class="active">Trunks</router-link>
        <router-link to="/queues" class="nav-link" active-class="active">Queues</router-link>
        <router-link to="/agents" class="nav-link" active-class="active">Agents</router-link>
        <router-link to="/routes" class="nav-link" active-class="active">Routes</router-link>
        <router-link to="/ivrs" class="nav-link" active-class="active">IVRs</router-link>
        <router-link to="/inbound-routes" class="nav-link" active-class="active">Inbound routes</router-link>
      </nav>
    </aside>
    <div class="main">
      <header class="topbar">
        <h1 class="logo">PBX3 Admin</h1>
        <div class="topbar-right">
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
  min-height: 100vh;
}
.sidebar {
  width: 12rem;
  flex-shrink: 0;
  background: #1e293b;
  color: #f8fafc;
}
.nav {
  display: flex;
  flex-direction: column;
  padding: 1rem 0;
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
}
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.5rem;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
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
  overflow: auto;
}
</style>
