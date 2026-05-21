'use client'

import { useEffect, useRef } from 'react'
import { usePlayerStore } from '@/store/playerStore'

export default function AudioPlayer() {
  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const volume = usePlayerStore((s) => s.volume)
  const progress = usePlayerStore((s) => s.progress)
  const isRepeat = usePlayerStore((s) => s.isRepeat)
  const setProgress = usePlayerStore((s) => s.setProgress)
  const next = usePlayerStore((s) => s.next)

  const audioRef = useRef<HTMLAudioElement>(null)

  // Load new track when it changes
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !currentTrack?.stream_url) return
    audio.src = currentTrack.stream_url
    audio.load()
    if (isPlaying) {
      audio.play().catch(() => {
        usePlayerStore.getState().pause()
      })
    }
  }, [currentTrack?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync play / pause
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.play().catch(() => {
        // Autoplay blocked (no user gesture yet) — reset UI to paused so user can click manually
        usePlayerStore.getState().pause()
      })
    } else {
      audio.pause()
    }
  }, [isPlaying])

  // Sync volume
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  // Seek when user drags the progress bar (large delta = user-initiated seek)
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (Math.abs(audio.currentTime - progress) > 2) {
      audio.currentTime = progress
    }
  }, [progress])

  return (
    <audio
      ref={audioRef}
      className="hidden"
      onTimeUpdate={() => {
        if (audioRef.current) setProgress(audioRef.current.currentTime)
      }}
      onEnded={() => {
        if (isRepeat && audioRef.current) {
          audioRef.current.currentTime = 0
          audioRef.current.play().catch(() => {})
        } else {
          next()
        }
      }}
    />
  )
}
