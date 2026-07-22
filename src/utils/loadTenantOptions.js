import { getApiClient } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import { normalizeList } from '@/utils/listResponse'

/**
 * Tenant options for list/create pickers.
 * Admins: GET tenants. Tenant users: whoami clusters (GET tenants is admin-only).
 *
 * @returns {Promise<Array<Record<string, unknown>>>}
 */
export async function loadTenantOptions() {
  const auth = useAuthStore()
  if (auth.isAdmin) {
    try {
      const res = await getApiClient().get('tenants')
      return normalizeList(res, 'tenants')
    } catch {
      return []
    }
  }
  const details = auth.allowedClusterDetails || []
  return details.map((c) => ({
    id: c.id || c.shortuid,
    shortuid: c.shortuid,
    pkey: c.pkey || c.shortuid,
    name: c.label || c.pkey || c.shortuid
  }))
}
