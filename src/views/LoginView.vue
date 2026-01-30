<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { createApiClient, getApiClient } from '@/api/client'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

const baseUrl = ref(import.meta.env.DEV ? 'http://localhost:5173/api' : '')
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function onSubmit(e) {
  e.preventDefault()
  error.value = ''
  loading.value = true
  try {
    const client = createApiClient(baseUrl.value.trim(), '')
    const res = await client.post('auth/login', {
      email: email.value.trim(),
      password: password.value
    })
    auth.setCredentials(baseUrl.value.trim(), res.accessToken)
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
      <p class="subtitle">Sign in to your PBX3 instance</p>

      <label for="baseUrl">API base URL</label>
      <input
        id="baseUrl"
        v-model="baseUrl"
        type="url"
        placeholder="https://host:port/api"
        required
      />

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
  max-width: 22rem;
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
.login-form button {
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
.login-form button:hover:not(:disabled) {
  background: #1d4ed8;
}
.login-form button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
</style>
