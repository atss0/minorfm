import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from '@/store/authStore'
import type { User } from '@/types'

const mockUser: User = {
  id: 'u1',
  username: 'testuser',
  email: 'test@example.com',
  avatar_url: '',
  bio: '',
  role: 'user',
  created_at: new Date().toISOString(),
}

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, accessToken: null, refreshToken: null })
  })

  it('starts with no user', () => {
    const { user, accessToken } = useAuthStore.getState()
    expect(user).toBeNull()
    expect(accessToken).toBeNull()
  })

  it('setAuth stores user and tokens', () => {
    useAuthStore.getState().setAuth(mockUser, 'access-token', 'refresh-token')
    const { user, accessToken, refreshToken } = useAuthStore.getState()
    expect(user?.username).toBe('testuser')
    expect(accessToken).toBe('access-token')
    expect(refreshToken).toBe('refresh-token')
  })

  it('setAccessToken updates only the access token', () => {
    useAuthStore.getState().setAuth(mockUser, 'old-token', 'refresh-token')
    useAuthStore.getState().setAccessToken('new-token')
    expect(useAuthStore.getState().accessToken).toBe('new-token')
    expect(useAuthStore.getState().refreshToken).toBe('refresh-token')
  })

  it('logout clears all auth state', () => {
    useAuthStore.getState().setAuth(mockUser, 'access-token', 'refresh-token')
    useAuthStore.getState().logout()
    const { user, accessToken, refreshToken } = useAuthStore.getState()
    expect(user).toBeNull()
    expect(accessToken).toBeNull()
    expect(refreshToken).toBeNull()
  })
})
