import { defineStore } from 'pinia'

const TOAST_TTL_MS = 4000

export const useToastStore = defineStore('toast', {
  state: () => ({
    toasts: []
  }),

  actions: {
    /**
     * Show a toast message.
     * @param {string} message - Text to display (e.g. "Extension 1000 saved").
     * @param {string} [variant='success'] - 'success' | 'error' (affects styling).
     */
    show(message, variant = 'success') {
      const id = Date.now()
      this.toasts.push({ id, message, variant })
      setTimeout(() => this.dismiss(id), TOAST_TTL_MS)
    },

    dismiss(id) {
      this.toasts = this.toasts.filter((t) => t.id !== id)
    }
  }
})
