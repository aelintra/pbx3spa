import { ref, nextTick, onBeforeUnmount } from 'vue'
import { useUnsavedFormStore } from '@/stores/unsavedForm'

/**
 * Register the current panel as having (or not) unsaved form edits.
 * Suppresses dirty while hydrating from the API / initial defaults.
 *
 * Usage:
 *   const { markDirty, beginHydrate, markClean } = useUnsavedForm()
 *   // on load start: beginHydrate(); … bind fields … await markClean()
 *   // on form root: @input="markDirty" @change="markDirty"
 */
export function useUnsavedForm() {
  const store = useUnsavedFormStore()
  const suppress = ref(true)

  function markDirty() {
    if (suppress.value) return
    store.setDirty(true)
  }

  function beginHydrate() {
    suppress.value = true
  }

  async function markClean() {
    // Two ticks: first for v-model binds, second for dependent selects/options settling.
    await nextTick()
    await nextTick()
    store.clear()
    suppress.value = false
  }

  function clearDirty() {
    store.clear()
  }

  onBeforeUnmount(() => {
    store.clear()
  })

  return { markDirty, beginHydrate, markClean, clearDirty }
}
