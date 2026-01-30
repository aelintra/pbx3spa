import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AppLayout from '../layouts/AppLayout.vue'
import LoginView from '../views/LoginView.vue'
import TenantsListView from '../views/TenantsListView.vue'
import TenantDetailView from '../views/TenantDetailView.vue'
import ExtensionsListView from '../views/ExtensionsListView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView
    },
    {
      path: '/',
      component: AppLayout,
      children: [
        { path: '', redirect: '/tenants' },
        { path: 'tenants', name: 'tenants', component: TenantsListView },
        { path: 'tenants/:pkey', name: 'tenant-detail', component: TenantDetailView },
        { path: 'extensions', name: 'extensions', component: ExtensionsListView }
      ]
    }
  ]
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.path !== '/login' && !auth.isLoggedIn) {
    return { path: '/login' }
  }
})

export default router
