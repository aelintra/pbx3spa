import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUnsavedFormStore } from '@/stores/unsavedForm'

describe('useUnsavedFormStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('starts clean', () => {
    expect(useUnsavedFormStore().dirty).toBe(false)
  })

  it('tracks dirty and clear', () => {
    const store = useUnsavedFormStore()
    store.setDirty(true)
    expect(store.dirty).toBe(true)
    store.clear()
    expect(store.dirty).toBe(false)
  })
})
