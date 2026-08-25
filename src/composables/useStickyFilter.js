/**
 * Sticky list filter: persist filter text in sessionStorage so it survives navigation
 * within a short window (e.g. filter → edit row → back to list keeps the filter).
 * Stored value expires after EXPIRY_MS unless the panel is re-entered while still
 * valid; each time we load a non-expired filter we refresh the timestamp, so the
 * filter persists as long as you're active on the panel and dies after 5 minutes away.
 *
 * Usage: const { filterText } = useStickyFilter('extensions')
 * Use a stable listId per panel: extensions, tenants, trunks, queues, agents,
 * routes, customapps, ivrs, inbound-routes, users.
 *
 * Rollout: Used on all list panels that have a filter.
 *
 * **Sticky sort:** `useStickySort(listId, options)` — same sessionStorage + 5‑minute expiry
 * pattern; persists `sortKey` and `sortOrder`. See **workingdocs/STICKY_LIST_UI.md**.
 */

import { ref, watch } from 'vue'

const STORAGE_PREFIX = 'pbx3spa-list-filter-'

/** Filter persists for 5 minutes; after that, entering the list shows no filter. */
const EXPIRY_MS = 5 * 60 * 1000

function getStorageKey(listId) {
  return STORAGE_PREFIX + listId
}

function getStored(listId) {
  try {
    const raw = sessionStorage.getItem(getStorageKey(listId))
    if (!raw) return ''
    const data = JSON.parse(raw)
    if (data == null || typeof data.storedAt !== 'number') return ''
    if (Date.now() - data.storedAt > EXPIRY_MS) return ''
    const value = typeof data.value === 'string' ? data.value : ''
    setStored(listId, value) // refresh timestamp so it persists while we're active
    return value
  } catch {
    return ''
  }
}

function setStored(listId, value) {
  try {
    sessionStorage.setItem(
      getStorageKey(listId),
      JSON.stringify({ value: value ?? '', storedAt: Date.now() })
    )
  } catch {
    // ignore (e.g. private mode)
  }
}

/**
 * @param {string} listId - Unique id for this list (e.g. 'devices', 'extensions')
 * @returns {{ filterText: import('vue').Ref<string> }}
 */
export function useStickyFilter(listId) {
  const filterText = ref(getStored(listId))

  watch(filterText, (val) => {
    setStored(listId, val)
  })

  return { filterText }
}

const SORT_STORAGE_PREFIX = 'pbx3spa-list-sort-'

function getSortStored(listId, defaultKey, defaultOrder) {
  try {
    const raw = sessionStorage.getItem(SORT_STORAGE_PREFIX + listId)
    if (!raw) return { sortKey: defaultKey, sortOrder: defaultOrder }
    const data = JSON.parse(raw)
    if (data == null || typeof data.storedAt !== 'number') {
      return { sortKey: defaultKey, sortOrder: defaultOrder }
    }
    if (Date.now() - data.storedAt > EXPIRY_MS) {
      return { sortKey: defaultKey, sortOrder: defaultOrder }
    }
    const sk = typeof data.sortKey === 'string' && data.sortKey !== '' ? data.sortKey : defaultKey
    const so = data.sortOrder === 'desc' ? 'desc' : 'asc'
    setSortStored(listId, sk, so)
    return { sortKey: sk, sortOrder: so }
  } catch {
    return { sortKey: defaultKey, sortOrder: defaultOrder }
  }
}

function setSortStored(listId, sortKey, sortOrder) {
  try {
    sessionStorage.setItem(
      SORT_STORAGE_PREFIX + listId,
      JSON.stringify({ sortKey, sortOrder, storedAt: Date.now() })
    )
  } catch {
    // ignore
  }
}

/**
 * Sticky column sort for list views (same expiry semantics as useStickyFilter).
 * @param {string} listId - Stable id per list (match useStickyFilter where both apply).
 * @param {{ defaultKey?: string, defaultOrder?: 'asc'|'desc' }} [options]
 * @returns {{ sortKey: import('vue').Ref<string>, sortOrder: import('vue').Ref<'asc'|'desc'> }}
 */
export function useStickySort(listId, options = {}) {
  const defaultKey = options.defaultKey ?? 'pkey'
  const defaultOrder = options.defaultOrder === 'desc' ? 'desc' : 'asc'
  const initial = getSortStored(listId, defaultKey, defaultOrder)
  const sortKey = ref(initial.sortKey)
  const sortOrder = ref(initial.sortOrder)

  watch([sortKey, sortOrder], ([sk, so]) => {
    setSortStored(listId, sk, so === 'desc' ? 'desc' : 'asc')
  })

  return { sortKey, sortOrder }
}
