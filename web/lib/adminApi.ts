import axios from 'axios'
import { API_BASE } from '@/lib/config'

const adminApi = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
})

adminApi.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem('minor-admin-auth')
    if (raw) {
      try {
        const token = JSON.parse(raw)?.state?.accessToken
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

// Global kilit: admin için eş zamanlı 401 yanıtlarının her biri ayrı refresh
// denemesi başlatmasını önler.
let adminRefreshPromise: Promise<string | null> | null = null

adminApi.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true

      if (!adminRefreshPromise) {
        adminRefreshPromise = (async () => {
          try {
            const { useAdminAuthStore } = await import('@/store/adminAuthStore')
            const { refreshToken, setAccessToken, logout } = useAdminAuthStore.getState()
            if (!refreshToken) {
              logout()
              if (typeof window !== 'undefined') window.location.href = '/admin/login'
              return null
            }
            const { data } = await axios.post(
              `${API_BASE}/api/auth/refresh`,
              { refresh_token: refreshToken }
            )
            setAccessToken(data.access_token)
            return data.access_token as string
          } catch {
            const { useAdminAuthStore } = await import('@/store/adminAuthStore')
            useAdminAuthStore.getState().logout()
            if (typeof window !== 'undefined') window.location.href = '/admin/login'
            return null
          } finally {
            adminRefreshPromise = null
          }
        })()
      }

      const newToken = await adminRefreshPromise
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`
        return adminApi(original)
      }
    }
    return Promise.reject(error)
  }
)

export default adminApi
