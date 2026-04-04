import { useAuthStore } from '@/stores/auth'

/**
 * Set or clear tenant signpost in the top bar (e.g. from Tenant detail, or clear on Tenants list).
 */
export function useSessionContext() {
  const auth = useAuthStore()
  return {
    setTenantContext: (pkey, label) => auth.setTenantContext(pkey, label),
    clearTenantContext: () => auth.clearTenantContext()
  }
}
