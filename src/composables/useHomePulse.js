import { ref, onMounted, onUnmounted } from 'vue'
import { getApiClient } from '@/api/client'
import { buildIncludeQuery } from '@/utils/homePulse'

/**
 * Fetch + poll GET /home/pulse.
 * @param {{ include?: string[], intervalMs?: number, immediate?: boolean }} [options]
 */
export function useHomePulse(options = {}) {
  const include = options.include
  const intervalMs = options.intervalMs ?? 35000
  const immediate = options.immediate !== false

  const pulse = ref(null)
  const loading = ref(false)
  const error = ref('')
  let timer = null

  async function load() {
    loading.value = pulse.value == null
    error.value = ''
    try {
      const params = {}
      const q = buildIncludeQuery(include)
      if (q) params.include = q
      pulse.value = await getApiClient().get('home/pulse', { params })
    } catch (err) {
      error.value = err.data?.message || err.message || 'Failed to load home pulse'
    } finally {
      loading.value = false
    }
  }

  function startPolling() {
    stopPolling()
    timer = setInterval(() => {
      void load()
    }, intervalMs)
  }

  function stopPolling() {
    if (timer != null) {
      clearInterval(timer)
      timer = null
    }
  }

  onMounted(() => {
    if (immediate) {
      void load().then(() => startPolling())
    }
  })

  onUnmounted(() => {
    stopPolling()
  })

  return {
    pulse,
    loading,
    error,
    load,
    startPolling,
    stopPolling
  }
}
