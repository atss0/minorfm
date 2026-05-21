import { create } from 'zustand'

interface UIState {
  sidebarOpen: boolean
  chatOpen: boolean
  notificationCount: number
  setSidebarOpen: (open: boolean) => void
  setChatOpen: (open: boolean) => void
  toggleChat: () => void
  toggleSidebar: () => void
  setNotificationCount: (count: number | ((prev: number) => number)) => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  chatOpen: true,
  notificationCount: 0,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setChatOpen: (chatOpen) => set({ chatOpen }),
  toggleChat: () => set((s) => ({ chatOpen: !s.chatOpen })),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setNotificationCount: (count) =>
    set((s) => ({ notificationCount: typeof count === 'function' ? count(s.notificationCount) : count })),
}))
