import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    baseUrl: '',
    token: '',
    user: null
  }),

  getters: {
    isLoggedIn(state) {
      return Boolean(state.token)
    }
  },

  actions: {
    setCredentials(baseUrl, token) {
      this.baseUrl = baseUrl ?? ''
      this.token = token ?? ''
    },

    setUser(user) {
      this.user = user
    },

    clearCredentials() {
      this.baseUrl = ''
      this.token = ''
      this.user = null
    }
  }
})
