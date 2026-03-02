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
import TrunkCreateView from '../views/TrunkCreateView.vue'
import TrunkDetailView from '../views/TrunkDetailView.vue'
import QueuesListView from '../views/QueuesListView.vue'
import QueueCreateView from '../views/QueueCreateView.vue'
import QueueDetailView from '../views/QueueDetailView.vue'
import AgentsListView from '../views/AgentsListView.vue'
import AgentCreateView from '../views/AgentCreateView.vue'
import AgentDetailView from '../views/AgentDetailView.vue'
import RoutesListView from '../views/RoutesListView.vue'
import RouteCreateView from '../views/RouteCreateView.vue'
import RouteDetailView from '../views/RouteDetailView.vue'
import CustomAppsListView from '../views/CustomAppsListView.vue'
import CustomAppCreateView from '../views/CustomAppCreateView.vue'
import CustomAppDetailView from '../views/CustomAppDetailView.vue'
import DevicesListView from '../views/DevicesListView.vue'
import DeviceCreateView from '../views/DeviceCreateView.vue'
import DeviceDetailView from '../views/DeviceDetailView.vue'
import HelpMessagesListView from '../views/HelpMessagesListView.vue'
import HelpMessageCreateView from '../views/HelpMessageCreateView.vue'
import HelpMessageDetailView from '../views/HelpMessageDetailView.vue'
import IvrsListView from '../views/IvrsListView.vue'
import IvrCreateView from '../views/IvrCreateView.vue'
import IvrDetailView from '../views/IvrDetailView.vue'
import InboundRoutesListView from '../views/InboundRoutesListView.vue'
import InboundRouteCreateView from '../views/InboundRouteCreateView.vue'
import InboundRouteDetailView from '../views/InboundRouteDetailView.vue'
import SysglobalsEditView from '../views/SysglobalsEditView.vue'
import FirewallView from '../views/FirewallView.vue'
import BackupView from '../views/BackupView.vue'
import AsteriskFilesListView from '../views/AsteriskFilesListView.vue'
import AsteriskFileDetailView from '../views/AsteriskFileDetailView.vue'
import LogsListView from '../views/LogsListView.vue'
import DashboardView from '../views/DashboardView.vue'
import NoAccessView from '../views/NoAccessView.vue'
import UsersListView from '../views/UsersListView.vue'
import UserCreateView from '../views/UserCreateView.vue'
import { getApiClient } from '@/api/client'

/** Routes that require neither login nor admin. Add e.g. '/register' here when adding self-service sign-up. */
const PUBLIC_ROUTES = ['/login']

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
        { path: '', name: 'dashboard', component: DashboardView },
        { path: 'no-access', name: 'no-access', component: NoAccessView },
        { path: 'tenants', name: 'tenants', component: TenantsListView },
        { path: 'tenants/new', name: 'tenant-create', component: TenantCreateView },
        { path: 'tenants/:pkey', name: 'tenant-detail', component: TenantDetailView },
        { path: 'extensions', name: 'extensions', component: ExtensionsListView },
        { path: 'extensions/new', name: 'extension-create', component: ExtensionCreateView },
        { path: 'extensions/:shortuid', name: 'extension-detail', component: ExtensionDetailView },
        { path: 'trunks', name: 'trunks', component: TrunksListView },
        { path: 'trunks/new', name: 'trunk-create', component: TrunkCreateView },
        { path: 'trunks/:shortuid', name: 'trunk-detail', component: TrunkDetailView },
        { path: 'queues', name: 'queues', component: QueuesListView },
        { path: 'queues/new', name: 'queue-create', component: QueueCreateView },
        { path: 'queues/:shortuid', name: 'queue-detail', component: QueueDetailView },
        { path: 'agents', name: 'agents', component: AgentsListView },
        { path: 'agents/new', name: 'agent-create', component: AgentCreateView },
        { path: 'agents/:shortuid', name: 'agent-detail', component: AgentDetailView },
        { path: 'routes', name: 'routes', component: RoutesListView },
        { path: 'routes/new', name: 'route-create', component: RouteCreateView },
        { path: 'routes/:shortuid', name: 'route-detail', component: RouteDetailView },
        { path: 'customapps', name: 'customapps', component: CustomAppsListView },
        { path: 'customapps/new', name: 'customapp-create', component: CustomAppCreateView },
        { path: 'customapps/:shortuid', name: 'customapp-detail', component: CustomAppDetailView },
        { path: 'devices', name: 'devices', component: DevicesListView },
        { path: 'devices/new', name: 'device-create', component: DeviceCreateView },
        { path: 'devices/:pkey', name: 'device-detail', component: DeviceDetailView },
        { path: 'help-messages', name: 'help-messages', component: HelpMessagesListView },
        { path: 'help-messages/new', name: 'help-message-create', component: HelpMessageCreateView },
        { path: 'help-messages/:pkey', name: 'help-message-detail', component: HelpMessageDetailView },
        { path: 'ivrs', name: 'ivrs', component: IvrsListView },
        { path: 'ivrs/new', name: 'ivr-create', component: IvrCreateView },
        { path: 'ivrs/:shortuid', name: 'ivr-detail', component: IvrDetailView },
        { path: 'inbound-routes', name: 'inbound-routes', component: InboundRoutesListView },
        { path: 'inbound-routes/new', name: 'inbound-route-create', component: InboundRouteCreateView },
        { path: 'inbound-routes/:shortuid', name: 'inbound-route-detail', component: InboundRouteDetailView },
        { path: 'users', name: 'users', component: UsersListView },
        { path: 'users/new', name: 'user-create', component: UserCreateView },
        { path: 'sysglobals', name: 'sysglobals', component: SysglobalsEditView },
        { path: 'firewall', name: 'firewall', component: FirewallView },
        { path: 'backup', name: 'backup', component: BackupView },
        { path: 'asterisk-files', name: 'asterisk-files', component: AsteriskFilesListView },
        { path: 'asterisk-files/:filename', name: 'asterisk-file-detail', component: AsteriskFileDetailView },
        { path: 'logs', name: 'logs', component: LogsListView }
      ]
    }
  ]
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  if (PUBLIC_ROUTES.includes(to.path)) {
    return
  }

  if (!auth.isLoggedIn) {
    return { path: '/login' }
  }

  if (to.path === '/no-access') {
    return
  }

  if (!auth.user) {
    try {
      const user = await getApiClient().get('auth/whoami')
      auth.setUser(user)
    } catch {
      auth.clearCredentials()
      return { path: '/login' }
    }
  }

  if (!auth.can('admin')) {
    return { name: 'no-access' }
  }
})

export default router
