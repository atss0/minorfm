import axios from 'axios'
import { API_BASE } from '@/lib/config'

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem('minor-auth')
    if (raw) {
      try {
        const state = JSON.parse(raw)
        const token = state?.state?.accessToken
        if (token) config.headers.Authorization = `Bearer ${token}`
      } catch {}
    }
    // CSRF token for state-mutating requests — read from the csrf_ cookie set by the backend
    const method = config.method?.toUpperCase()
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method ?? '')) {
      const csrf = document.cookie.match(/(?:^|; )csrf_=([^;]*)/)?.[1]
        ?? document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content
      if (csrf) config.headers['X-CSRF-Token'] = csrf
    }
  }
  return config
})

// Global kilit: eş zamanlı 401 yanıtlarının her biri ayrı refresh denemesi
// başlatmasını önler. İlk istek promise'i oluşturur, diğerleri onu bekler.
let refreshPromise: Promise<string | null> | null = null

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true

      if (!refreshPromise) {
        refreshPromise = (async () => {
          try {
            // Lazy import avoids circular dependency; .getState() works outside React
            const { useAuthStore } = await import('@/store/authStore')
            const { refreshToken, setAccessToken, logout } = useAuthStore.getState()
            if (!refreshToken) {
              logout()
              if (typeof window !== 'undefined') window.location.href = '/login'
              return null
            }

            const { data } = await axios.post(
              `${API_BASE}/api/auth/refresh`,
              { refresh_token: refreshToken }
            )

            // Update the Zustand store — persist middleware syncs localStorage and
            // the [accessToken] dep in WS hooks causes them to reconnect automatically.
            setAccessToken(data.access_token)
            return data.access_token as string
          } catch {
            const { useAuthStore } = await import('@/store/authStore')
            useAuthStore.getState().logout()
            if (typeof window !== 'undefined') window.location.href = '/login'
            return null
          } finally {
            refreshPromise = null
          }
        })()
      }

      const newToken = await refreshPromise
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)
      }
    }
    return Promise.reject(error)
  }
)

export default api
