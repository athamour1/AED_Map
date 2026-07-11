import { defineBoot } from '#q-app/wrappers'
import axios from 'axios'
import { useAuthStore } from 'stores/auth'

const api = axios.create({ baseURL: '/api', withCredentials: true })

export default defineBoot(({ app, router }) => {
  api.interceptors.request.use((config) => {
    const auth = useAuthStore()
    if (auth.accessToken) {
      config.headers.Authorization = `Bearer ${auth.accessToken}`
    }
    return config
  })

  let refreshPromise = null

  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config
      const isAuthEndpoint = originalRequest?.url?.startsWith('/auth/')

      if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
        originalRequest._retry = true
        const auth = useAuthStore()
        try {
          refreshPromise = refreshPromise ?? auth.refresh()
          await refreshPromise
          refreshPromise = null
          originalRequest.headers.Authorization = `Bearer ${auth.accessToken}`
          return api(originalRequest)
        } catch {
          refreshPromise = null
          auth.clearSession()
          router.push({ name: 'login' })
        }
      }

      return Promise.reject(error)
    },
  )

  app.config.globalProperties.$api = api
})

export { api }
