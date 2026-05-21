import { create } from 'zustand'
import type { ChatMessage } from '@/types'

interface ChatState {
  messages: ChatMessage[]
  activeRoom: string
  isConnected: boolean
  socket: WebSocket | null
  addMessage: (message: ChatMessage) => void
  setRoom: (roomId: string) => void
  setConnected: (connected: boolean) => void
  setSocket: (socket: WebSocket | null) => void
  clearMessages: () => void
  sendMessage: (body: string) => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  activeRoom: 'global',
  isConnected: false,
  socket: null,
  addMessage: (message) =>
    set((s) => {
      if (s.messages.some((m) => m.id === message.id)) return s
      return { messages: [...s.messages.slice(-199), message] }
    }),
  setRoom: (activeRoom) => set({ activeRoom, messages: [] }),
  setConnected: (isConnected) => set({ isConnected }),
  setSocket: (socket) => set({ socket }),
  clearMessages: () => set({ messages: [] }),
  sendMessage: (body: string) => {
    const { socket } = get()
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ body }))
    }
  },
}))
