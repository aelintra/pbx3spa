/**
 * Schema metadata for admin panels: read_only, updateable, defaults from GET /schemas.
 * Fetches on first use; caches in module-level ref so subsequent calls reuse (no Pinia).
 *
 * @see pbx3spa/workingdocs/FIELD_MUTABILITY_API_PLAN.md
 */

import { ref, readonly } from 'vue'
import { getApiClient } from '@/api/client'

// Module-level cache: one fetch per session
let schemaCache = ref(null)
let loading = ref(false)
let error = ref(null)
let fetchPromise = null

/**
 * Composable: schema metadata for detail/create views.
 * @returns {{
 *   schema: import('vue').Ref<Record<string, { read_only: string[], updateable: string[], defaults: Record<string, unknown> }> | null>,
 *   getSchema: (resource: string) => { read_only: string[], updateable: string[], defaults: Record<string, unknown> } | null,
 *   loading: import('vue').Ref<boolean>,
 *   error: import('vue').Ref<string | null>
 * }}
 */
export function useSchema() {
  async function ensureFetched() {
    if (schemaCache.value != null) return
    if (fetchPromise) {
      await fetchPromise
      return
    }
    loading.value = true
    error.value = null
    fetchPromise = getApiClient()
      .get('schemas')
      .then((data) => {
        schemaCache.value = data
        loading.value = false
        fetchPromise = null
      })
      .catch((e) => {
        error.value = e?.message ?? String(e)
        loading.value = false
        fetchPromise = null
      })
    await fetchPromise
  }

  /**
   * Get schema for one resource (e.g. 'extensions', 'queues'). Returns null if not loaded or resource missing.
   */
  function getSchema(resource) {
    const data = schemaCache.value
    if (!data || typeof data !== 'object') return null
    return data[resource] ?? null
  }

  /**
   * Apply schema.defaults to form refs (Create views). Only sets when defaults[key] is not null/undefined.
   * @param {string} resource - e.g. 'extensions', 'queues'
   * @param {Record<string, { value: unknown }>} refsByKey - map schema key → ref (e.g. { cluster: clusterRef, active: activeRef })
   */
  function applySchemaDefaults(resource, refsByKey) {
    const s = getSchema(resource)
    const defaults = s?.defaults
    if (!defaults || typeof defaults !== 'object') return
    for (const [key, ref] of Object.entries(refsByKey)) {
      if (ref == null) continue
      const val = defaults[key]
      if (val === undefined || val === null || val === '') continue
      ref.value = typeof val === 'number' ? String(val) : String(val)
    }
  }

  return {
    /** Full schema object (readonly). Null until first fetch completes. */
    schema: readonly(schemaCache),
    getSchema,
    /** True while the first fetch is in progress. */
    loading: readonly(loading),
    /** Error message if fetch failed. */
    error: readonly(error),
    /** Call before using schema if you need to ensure it's loaded (e.g. in onMounted). */
    ensureFetched,
    /** Apply getSchema(resource).defaults to refs (Create views). Pass { schemaKey: ref } for each field to preset. */
    applySchemaDefaults
  }
}
