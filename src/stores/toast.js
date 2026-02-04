import { defineStore } from 'pinia'

const TOAST_TTL_MS = 1000

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
      // Auto-dismiss after 1 second (TOAST_TTL_MS)
      setTimeout(() => this.dismiss(id), 1000)
    },

    dismiss(id) {
      this.toasts = this.toasts.filter((t) => t.id !== id)
    }
  }
})
