import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AppLayout from '../layouts/AppLayout.vue'
import LoginView from '../views/LoginView.vue'
import TenantsListView from '../views/TenantsListView.vue'
import TenantDetailView from '../views/TenantDetailView.vue'
import TenantCreateView from '../views/TenantCreateView.vue'
import ExtensionsListView from '../views/ExtensionsListView.vue'
import ExtensionCreateView from '../views/ExtensionCreateView.vue'
import ExtensionDetailView from '../views/ExtensionDetailView.vue'
import TrunksListView from '../views/TrunksListView.vue'
import TrunkDetailView from '../views/TrunkDetailView.vue'
import QueuesListView from '../views/QueuesListView.vue'
import QueueDetailView from '../views/QueueDetailView.vue'

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
        { path: 'tenants/new', name: 'tenant-create', component: TenantCreateView },
        { path: 'tenants/:pkey', name: 'tenant-detail', component: TenantDetailView },
        { path: 'extensions', name: 'extensions', component: ExtensionsListView },
        { path: 'extensions/new', name: 'extension-create', component: ExtensionCreateView },
        { path: 'extensions/:pkey', name: 'extension-detail', component: ExtensionDetailView },
        { path: 'trunks', name: 'trunks', component: TrunksListView },
        { path: 'trunks/:pkey', name: 'trunk-detail', component: TrunkDetailView },
        { path: 'queues', name: 'queues', component: QueuesListView },
        { path: 'queues/:pkey', name: 'queue-detail', component: QueueDetailView }
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
