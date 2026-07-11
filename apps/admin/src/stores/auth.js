import { defineStore } from 'pinia'
import { api } from 'boot/axios'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    // Access token lives in memory only — never localStorage — so it can't
    // survive an XSS payload beyond the current page lifetime.
    accessToken: null,
    user: null,
    initialized: false,
  }),

  getters: {
    isAuthenticated: (state) => Boolean(state.accessToken && state.user),
    isAdmin: (state) => state.user?.role === 'ADMIN',
  },

  actions: {
    async login(email, password) {
      const { data } = await api.post('/auth/login', { email, password })
      this.accessToken = data.accessToken
      await this.fetchMe()
    },

    async fetchMe() {
      const { data } = await api.get('/auth/me')
      this.user = data
    },

    async refresh() {
      const { data } = await api.post('/auth/refresh')
      this.accessToken = data.accessToken
      await this.fetchMe()
    },

    async logout() {
      try {
        await api.post('/auth/logout')
      } finally {
        this.clearSession()
      }
    },

    clearSession() {
      this.accessToken = null
      this.user = null
    },

    // Silent refresh-cookie check, run once on app boot so a page reload
    // doesn't force a re-login if the refresh cookie is still valid.
    async initialize() {
      if (this.initialized) return
      try {
        await this.refresh()
      } catch {
        this.clearSession()
      } finally {
        this.initialized = true
      }
    },
  },
})
