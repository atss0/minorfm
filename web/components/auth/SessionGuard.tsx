'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { useAuthStore } from '@/store/authStore'

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
    const { accessToken, refreshToken, setAccessToken, logout } = useAuthStore.getState()

    async function validate() {
      if (accessToken && !isExpired(accessToken)) {
        setReady(true)
        return
      }

      if (refreshToken) {
        try {
          const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'
          const { data } = await axios.post(`${base}/api/auth/refresh`, {
            refresh_token: refreshToken,
          })
          setAccessToken(data.access_token)
          setReady(true)
          return
        } catch {}
      }

      logout()
      router.replace('/login')
    }

    validate()
  }, [router])

  if (!ready) return null

  return <>{children}</>
}
