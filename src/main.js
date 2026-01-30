import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createApiClient, getApiClient } from './api/client'
import { useAuthStore } from './stores/auth'
import App from './App.vue'
import router from './router'
import './assets/main.css'

// In dev, expose for console testing: useAuthStore().setCredentials(...); getApiClient().get('auth/whoami')
if (import.meta.env.DEV) {
  window.createApiClient = createApiClient
  window.getApiClient = getApiClient
  window.useAuthStore = useAuthStore
}

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
