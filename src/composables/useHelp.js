import { ref, shallowRef } from 'vue'
import { getApiClient } from '@/api/client'
import { normalizeList } from '@/utils/listResponse'

const helpMap = shallowRef(null)
const loading = ref(false)
const error = ref(null)

/**
 * Composable for tt_help_core contextual help. Fetches helpcore once and caches by pkey.
 * @returns {{ getHelp: (pkey: string) => { displayname?: string, htext?: string } | null, ensureFetched: () => Promise<void>, loading: Ref<boolean>, error: Ref<string|null> }}
 */
export function useHelp() {
  async function ensureFetched() {
    if (helpMap.value != null) return
    loading.value = true
    error.value = null
    try {
      const res = await getApiClient().get('helpcore')
      const list = normalizeList(res, 'helpcore')
      const map = new Map()
      for (const row of list) {
        if (row?.pkey != null) {
          map.set(String(row.pkey), {
            displayname: row.displayname ?? '',
            htext: row.htext ?? ''
          })
        }
      }
      helpMap.value = map
    } catch (err) {
      error.value = err?.message ?? 'Failed to load help'
      helpMap.value = new Map()
    } finally {
      loading.value = false
    }
  }

  function getHelp(pkey) {
    if (pkey == null || pkey === '') return null
    const map = helpMap.value
    if (!map) return null
    return map.get(String(pkey)) ?? null
  }

  return { getHelp, ensureFetched, loading, error }
}
