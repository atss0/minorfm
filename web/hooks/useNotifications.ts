'use client'

import { useEffect, useRef } from 'react'
import axios from 'axios'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'

function getBase(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'
}

function getWsBase(): string {
  return getBase().replace(/^http/, 'ws')
}

function isExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return typeof payload.exp === 'number' && payload.exp < Date.now() / 1000 + 30
  } catch {
    return true
  }
}

const MAX_RETRIES = 8

export function useNotifications() {
  const { accessToken, refreshToken, setAccessToken, logout } = useAuthStore()
  const { setNotificationCount } = useUIStore()

  const mountedRef = useRef(true)
  const wsRef = useRef<WebSocket | null>(null)
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const attemptsRef = useRef(0)

  useEffect(() => {
    mountedRef.current = true
    attemptsRef.current = 0

    if (!accessToken) return

    async function connect() {
      if (!mountedRef.current || attemptsRef.current > MAX_RETRIES) return

      let token = accessToken!
      if (isExpired(token)) {
        if (!refreshToken) { logout(); return }
        try {
          const { data } = await axios.post(`${getBase()}/api/auth/refresh`, { refresh_token: refreshToken })
          setAccessToken(data.access_token)
          // [accessToken] dep change causes this effect to re-run with the fresh token
        } catch {
          logout()
        }
        return
      }

      const ws = new WebSocket(
        `${getWsBase()}/ws/notifications?token=${encodeURIComponent(token)}`,
      )
      wsRef.current = ws

      ws.onopen = () => {
        if (!mountedRef.current) { ws.close(); return }
        attemptsRef.current = 0
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as { type?: string; count?: number }
          if (data.type === 'notification') {
            setNotificationCount((prev) => prev + 1)
          } else if (typeof data.count === 'number') {
            setNotificationCount(data.count)
          }
        } catch {}
      }

      ws.onclose = () => {
        if (!mountedRef.current) return
        if (attemptsRef.current >= MAX_RETRIES) return
        const delay = Math.min(1000 * Math.pow(2, attemptsRef.current), 30_000)
        attemptsRef.current++
        retryRef.current = setTimeout(connect, delay)
      }

      ws.onerror = () => ws.close()
    }

    connect()

    return () => {
      mountedRef.current = false
      if (retryRef.current) clearTimeout(retryRef.current)
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [accessToken, refreshToken, setAccessToken, logout, setNotificationCount])
}
