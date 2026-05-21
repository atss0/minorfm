'use client'

import { useEffect, useRef } from 'react'
import { usePlayerStore } from '@/store/playerStore'
import api from '@/lib/api'
import type { Track } from '@/types'

interface RadioState {
  track: Track | null
  started_at: string
  is_playing: boolean
}

function getWsBase(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'
  // WS endpoint is at root (not under /api), so strip the /api suffix
  return apiUrl.replace(/\/api\/?$/, '').replace(/^http/, 'ws')
}

function applyState(state: RadioState, store: ReturnType<typeof usePlayerStore.getState>) {
  if (!state.track) {
    store.pause()
    return
  }
  // Calculate current position from server's started_at timestamp
  const pos = Math.max(0, Math.floor((Date.now() - new Date(state.started_at).getTime()) / 1000))

  if (store.currentTrack?.id !== state.track.id) {
    store.setTrack(state.track)
    store.setProgress(pos)
  }

  if (state.is_playing) store.play()
  else store.pause()
}

export function useRadio() {
  const mountedRef = useRef(true)
  const wsRef = useRef<WebSocket | null>(null)
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const attemptsRef = useRef(0)

  useEffect(() => {
    mountedRef.current = true

    // Fetch initial state via REST as fast fallback before WS connects
    api
      .get('/api/radio/current')
      .then((res) => {
        if (!mountedRef.current) return
        applyState(res.data as RadioState, usePlayerStore.getState())
      })
      .catch(() => {})

    function connect() {
      if (!mountedRef.current) return
      const ws = new WebSocket(`${getWsBase()}/ws/radio`)
      wsRef.current = ws

      ws.onmessage = (event) => {
        try {
          applyState(JSON.parse(event.data) as RadioState, usePlayerStore.getState())
        } catch {}
      }

      ws.onclose = () => {
        if (!mountedRef.current) return
        const delay = Math.min(1000 * Math.pow(2, attemptsRef.current), 30000)
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
  }, [])
}
