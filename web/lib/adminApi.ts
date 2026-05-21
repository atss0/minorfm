import axios from 'axios'

const adminApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
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
  }
  return config
})

adminApi.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const { useAdminAuthStore } = await import('@/store/adminAuthStore')
        const { refreshToken, setAccessToken, logout } = useAdminAuthStore.getState()
        if (!refreshToken) {
          logout()
          if (typeof window !== 'undefined') window.location.href = '/admin/login'
          return Promise.reject(error)
        }
        const { data } = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/auth/refresh`,
          { refresh_token: refreshToken }
        )
        setAccessToken(data.access_token)
        original.headers.Authorization = `Bearer ${data.access_token}`
        return adminApi(original)
      } catch {
        const { useAdminAuthStore } = await import('@/store/adminAuthStore')
        useAdminAuthStore.getState().logout()
        if (typeof window !== 'undefined') window.location.href = '/admin/login'
      }
    }
    return Promise.reject(error)
  }
)

export default adminApi
