import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createApiClient } from './api/client'
import { useAuthStore } from './stores/auth'
import App from './App.vue'
import router from './router'
import './assets/main.css'

// In dev, expose for console testing: createApiClient(baseUrl, token).get('auth/whoami'); useAuthStore().setCredentials(...)
if (import.meta.env.DEV) {
  window.createApiClient = createApiClient
  window.useAuthStore = useAuthStore
}

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
