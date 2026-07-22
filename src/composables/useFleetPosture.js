import { ref } from 'vue'
import { getApiClient } from '@/api/client'

const posture = ref(null)
const loading = ref(false)
const error = ref(null)

/**
 * Fleet node posture from GET /api/fleet-posture (Phase A).
 * @returns {{ posture: import('vue').Ref<object|null>, loading: import('vue').Ref<boolean>, error: import('vue').Ref<string|null>, loadFleetPosture: (opts?: { force?: boolean }) => Promise<object|null>, isFleetNode: () => boolean }}
 */
export function useFleetPosture() {
  async function loadFleetPosture(opts = {}) {
    const force = Boolean(opts?.force)
    if (posture.value !== null && !force) {
      return posture.value
    }
    loading.value = true
    error.value = null
    try {
      const data = await getApiClient().get('fleet-posture')
      posture.value = data
      return data
    } catch (e) {
      error.value = e?.message || 'Failed to load fleet posture'
      posture.value = { fleet: false, hide_route_paths: false }
      return posture.value
    } finally {
      loading.value = false
    }
  }

  function isFleetNode() {
    return Boolean(posture.value?.fleet)
  }

  function hideRoutePaths() {
    return Boolean(posture.value?.hide_route_paths)
  }

  return {
    posture,
    loading,
    error,
    loadFleetPosture,
    isFleetNode,
    hideRoutePaths
  }
}
