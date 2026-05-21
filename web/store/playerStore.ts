import { create } from 'zustand'
import type { Track } from '@/types'

interface PlayerState {
  isPlaying: boolean
  currentTrack: Track | null
  queue: Track[]
  volume: number
  progress: number
  isShuffle: boolean
  isRepeat: boolean
  play: (track?: Track) => void
  pause: () => void
  togglePlay: () => void
  setVolume: (volume: number) => void
  setProgress: (progress: number) => void
  setTrack: (track: Track) => void
  setQueue: (queue: Track[]) => void
  next: () => void
  prev: () => void
  toggleShuffle: () => void
  toggleRepeat: () => void
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  isPlaying: false,
  currentTrack: null,
  queue: [],
  volume: 0.8,
  progress: 0,
  isShuffle: false,
  isRepeat: false,

  play: (track) => {
    if (track) set({ currentTrack: track, isPlaying: true, progress: 0 })
    else set({ isPlaying: true })
  },
  pause: () => set({ isPlaying: false }),
  togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying })),
  setVolume: (volume) => set({ volume }),
  setProgress: (progress) => set({ progress }),
  setTrack: (track) => set({ currentTrack: track, progress: 0 }),
  setQueue: (queue) => set({ queue }),

  next: () => {
    const { queue, currentTrack, isShuffle } = get()
    if (!queue.length) return
    const idx = queue.findIndex((t) => t.id === currentTrack?.id)
    let next: Track
    if (isShuffle) {
      next = queue[Math.floor(Math.random() * queue.length)]
    } else {
      next = queue[(idx + 1) % queue.length]
    }
    set({ currentTrack: next, progress: 0, isPlaying: true })
  },

  prev: () => {
    const { queue, currentTrack } = get()
    if (!queue.length) return
    const idx = queue.findIndex((t) => t.id === currentTrack?.id)
    const prev = queue[(idx - 1 + queue.length) % queue.length]
    set({ currentTrack: prev, progress: 0, isPlaying: true })
  },

  toggleShuffle: () => set((s) => ({ isShuffle: !s.isShuffle })),
  toggleRepeat: () => set((s) => ({ isRepeat: !s.isRepeat })),
}))
