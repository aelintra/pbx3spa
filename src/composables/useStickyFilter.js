/**
 * Sticky list filter: persist filter text in sessionStorage so it survives navigation
 * within a short window (e.g. filter → edit row → back to list keeps the filter).
 * Stored value expires after EXPIRY_MS unless the panel is re-entered while still
 * valid; each time we load a non-expired filter we refresh the timestamp, so the
 * filter persists as long as you're active on the panel and dies after 5 minutes away.
 *
 * Usage: const { filterText } = useStickyFilter('devices')
 * Use a stable listId per panel: devices, extensions, tenants, trunks, queues, agents,
 * routes, customapps, ivrs, inbound-routes, users.
 *
 * Rollout: Used on all list panels that have a filter (tenants, extensions, trunks, queues, conferences, agents, routes, customapps, ivrs, inbound-routes, devices, asterisk-files).
 *
 * TODO: Sticky sort — consider useStickySort(listId) that persists sortKey + sortOrder
 * in sessionStorage the same way, so column sort survives navigation. Decide after
 * sticky filter rollout. Document in workingdocs/STICKY_LIST_UI.md.
 */

import { ref, watch } from 'vue'

const STORAGE_PREFIX = 'pbx3spa-list-filter-'

/** Filter persists for 5 minutes; after that, entering the list shows no filter. */
const EXPIRY_MS = 5 * 60 * 1000

/** Legacy key used by Devices list before composable; keep for backward compatibility. */
const LEGACY_DEVICES_KEY = 'pbx3spa-devices-list-filter'

function getStorageKey(listId) {
  if (listId === 'devices') return LEGACY_DEVICES_KEY
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
