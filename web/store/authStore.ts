import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types'

// 7-day cookie — matches refresh token TTL.
// Middleware only checks presence, not value; real auth is Bearer token on API calls.
function setLoggedInCookie(role?: string) {
  if (typeof document === 'undefined') return
  document.cookie = 'logged_in=1; path=/; max-age=604800; SameSite=Lax'
  if (role) {
    document.cookie = `user_role=${role}; path=/; max-age=604800; SameSite=Lax`
  }
}

function clearLoggedInCookie() {
  if (typeof document === 'undefined') return
  document.cookie = 'logged_in=; path=/; max-age=0'
  document.cookie = 'user_role=; path=/; max-age=0'
}

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  setAuth: (user: User, accessToken: string, refreshToken: string) => void
  setAccessToken: (token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setAuth: (user, accessToken, refreshToken) => {
        set({ user, accessToken, refreshToken })
        setLoggedInCookie(user.role)
      },
      setAccessToken: (accessToken) => {
        set({ accessToken })
        // Re-set role cookie so middleware keeps allowing /admin after token refresh
        setLoggedInCookie(get().user?.role)
      },
      logout: () => {
        set({ user: null, accessToken: null, refreshToken: null })
        clearLoggedInCookie()
      },
    }),
    {
      name: 'minor-auth',
      // Re-set cookies after hydration from localStorage so the role cookie
      // is always present for existing sessions (e.g. logged in before role cookie was added).
      onRehydrateStorage: () => (state) => {
        if (state?.user) setLoggedInCookie(state.user.role)
      },
    }
  )
)
