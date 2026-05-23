'use client'

import { useEffect, useRef } from 'react'
import { usePlayerStore } from '@/store/playerStore'
import { WS_BASE } from '@/lib/config'
import api from '@/lib/api'
import type { Track } from '@/types'

interface RadioState {
  track: Track | null
  started_at: string
  is_playing: boolean
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

// Radio WebSocket retries indefinitely — it is the app's primary feature and
// must always attempt to reconnect. Chat/Notifications cap at MAX_RETRIES = 8
// to preserve battery on mobile; radio does not have that constraint because
// the user explicitly chose to listen and expects continuous playback.
const MAX_RETRIES = Infinity

export function useRadio() {
  const mountedRef = useRef(true)
  const wsRef = useRef<WebSocket | null>(null)
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const attemptsRef = useRef(0)

  useEffect(() => {
    mountedRef.current = true
    attemptsRef.current = 0

    // Fetch initial state via REST as fast fallback before WS connects
    api
      .get('/api/radio/current')
      .then((res) => {
        if (!mountedRef.current) return
        applyState(res.data as RadioState, usePlayerStore.getState())
      })
      .catch(() => {})

    function connect() {
      if (!mountedRef.current || attemptsRef.current > MAX_RETRIES) return
      const ws = new WebSocket(`${WS_BASE}/ws/radio`)
      wsRef.current = ws

      ws.onopen = () => {
        if (!mountedRef.current) { ws.close(); return }
        attemptsRef.current = 0
      }

      ws.onmessage = (event) => {
        try {
          applyState(JSON.parse(event.data) as RadioState, usePlayerStore.getState())
        } catch {}
      }

      ws.onclose = () => {
        if (!mountedRef.current) return
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
  }, [])
}
