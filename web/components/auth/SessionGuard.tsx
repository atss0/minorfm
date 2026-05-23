'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { useAuthStore } from '@/store/authStore'
import { globalLogout } from '@/store/globalLogout'

function isExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return typeof payload.exp !== 'number' || payload.exp < Date.now() / 1000 + 30
  } catch {
    return true
  }
}

export default function SessionGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    async function validate() {
      const { accessToken, refreshToken, setAccessToken } = useAuthStore.getState()
      try {
        if (accessToken && !isExpired(accessToken)) {
          setReady(true)
          return
        }

        if (refreshToken) {
          const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'
          const { data } = await axios.post(
            `${base}/api/auth/refresh`,
            { refresh_token: refreshToken },
            { signal: controller.signal }
          )
          setAccessToken(data.access_token)
          setReady(true)
          return
        }
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Session validation failed:', error.message)
        }
      } finally {
        clearTimeout(timeout)
      }

      globalLogout()
      router.replace('/login')
    }

    validate()
    return () => {
      controller.abort()
      clearTimeout(timeout)
    }
  }, [router])

  if (!ready) return null

  return <>{children}</>
}
