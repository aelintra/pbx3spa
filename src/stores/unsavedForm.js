import { defineStore } from 'pinia'

/**
 * Tracks whether the open create/edit panel has local edits not yet Saved.
 * Commit reads this so we can warn before applying GenAst from the DB only.
 */
export const useUnsavedFormStore = defineStore('unsavedForm', {
  state: () => ({
    dirty: false
  }),

  actions: {
    setDirty(dirty) {
      this.dirty = !!dirty
    },

    clear() {
      this.dirty = false
    }
  }
})
