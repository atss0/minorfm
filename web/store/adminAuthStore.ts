import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types'

// Shorter than the main site's 7-day session — admin sessions expire sooner for safety.
const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 24 // 24 hours in seconds

function setAdminCookie(role?: string) {
  if (typeof document === 'undefined') return
  document.cookie = `admin_logged_in=1; path=/; max-age=${ADMIN_COOKIE_MAX_AGE}; SameSite=Lax`
  if (role) {
    document.cookie = `admin_role=${role}; path=/; max-age=${ADMIN_COOKIE_MAX_AGE}; SameSite=Lax`
  }
}

function clearAdminCookie() {
  if (typeof document === 'undefined') return
  document.cookie = 'admin_logged_in=; path=/; max-age=0'
  document.cookie = 'admin_role=; path=/; max-age=0'
}

interface AdminAuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  setAuth: (user: User, accessToken: string, refreshToken: string) => void
  setAccessToken: (token: string) => void
  logout: () => void
}

export const useAdminAuthStore = create<AdminAuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setAuth: (user, accessToken, refreshToken) => {
        set({ user, accessToken, refreshToken })
        setAdminCookie(user.role)
      },
      setAccessToken: (accessToken) => {
        set({ accessToken })
        setAdminCookie(get().user?.role)
      },
      logout: () => {
        set({ user: null, accessToken: null, refreshToken: null })
        clearAdminCookie()
      },
    }),
    {
      name: 'minor-admin-auth',
      onRehydrateStorage: () => (state) => {
        if (state?.user) setAdminCookie(state.user.role)
      },
    }
  )
)
