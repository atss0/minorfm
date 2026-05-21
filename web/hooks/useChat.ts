'use client'

import { useEffect, useRef } from 'react'
import axios from 'axios'
import { useChatStore } from '@/store/chatStore'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'
import type { ChatMessage } from '@/types'

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

export function useChat(roomId: string) {
  const addMessage = useChatStore((s) => s.addMessage)
  const clearMessages = useChatStore((s) => s.clearMessages)
  const setConnected = useChatStore((s) => s.setConnected)
  const setSocket = useChatStore((s) => s.setSocket)
  const { accessToken, refreshToken, setAccessToken, logout } = useAuthStore()

  const mountedRef = useRef(true)
  const wsRef = useRef<WebSocket | null>(null)
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const attemptsRef = useRef(0)

  useEffect(() => {
    mountedRef.current = true
    attemptsRef.current = 0

    api
      .get(`/api/chat/rooms/${roomId}/messages`)
      .then((res) => {
        if (!mountedRef.current) return
        clearMessages()
        // REST API returns messages with a nested `user` object; WS returns flat fields.
        // Normalize to flat shape so MessageRow can use msg.username / msg.avatar_url.
        const msgs: ChatMessage[] = (res.data?.data ?? []).map((m: Record<string, unknown> & { user?: { username?: string; avatar_url?: string } }) => ({
          id: m.id,
          room_id: m.room_id,
          user_id: m.user_id,
          username: (m.username as string) || m.user?.username || '',
          avatar_url: (m.avatar_url as string) || m.user?.avatar_url || '',
          body: m.body,
          badge: m.badge,
          created_at: m.created_at,
        }))
        msgs.forEach(addMessage)
      })
      .catch(() => {})

    if (!accessToken) {
      return () => { mountedRef.current = false }
    }

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
        `${getWsBase()}/ws/chat/${roomId}?token=${encodeURIComponent(token)}`,
      )
      wsRef.current = ws

      ws.onopen = () => {
        if (!mountedRef.current) { ws.close(); return }
        attemptsRef.current = 0
        setConnected(true)
        setSocket(ws)
      }

      ws.onmessage = (event) => {
        try { addMessage(JSON.parse(event.data) as ChatMessage) } catch {}
      }

      ws.onclose = () => {
        if (!mountedRef.current) return
        setConnected(false)
        setSocket(null)
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
      setConnected(false)
      setSocket(null)
    }
  }, [roomId, accessToken, refreshToken, setAccessToken, logout, addMessage, clearMessages, setConnected, setSocket])
}
