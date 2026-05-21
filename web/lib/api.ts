import axios from 'axios'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
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
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        // Lazy import avoids circular dependency; .getState() works outside React
        const { useAuthStore } = await import('@/store/authStore')
        const { refreshToken, setAccessToken, logout } = useAuthStore.getState()
        if (!refreshToken) {
          logout()
          if (typeof window !== 'undefined') window.location.href = '/login'
          return Promise.reject(error)
        }

        const { data } = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/auth/refresh`,
          { refresh_token: refreshToken }
        )

        // Update the Zustand store — persist middleware syncs localStorage and
        // the [accessToken] dep in WS hooks causes them to reconnect automatically.
        setAccessToken(data.access_token)

        original.headers.Authorization = `Bearer ${data.access_token}`
        return api(original)
      } catch {
        const { useAuthStore } = await import('@/store/authStore')
        useAuthStore.getState().logout()
        if (typeof window !== 'undefined') window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
