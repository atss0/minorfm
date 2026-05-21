import { describe, it, expect, beforeEach } from 'vitest'
import { useUIStore } from '@/store/uiStore'

describe('uiStore', () => {
  beforeEach(() => {
    useUIStore.setState({ sidebarOpen: true, chatOpen: true, notificationCount: 0 })
  })

  it('toggleSidebar flips sidebarOpen', () => {
    expect(useUIStore.getState().sidebarOpen).toBe(true)
    useUIStore.getState().toggleSidebar()
    expect(useUIStore.getState().sidebarOpen).toBe(false)
    useUIStore.getState().toggleSidebar()
    expect(useUIStore.getState().sidebarOpen).toBe(true)
  })

  it('toggleChat flips chatOpen', () => {
    expect(useUIStore.getState().chatOpen).toBe(true)
    useUIStore.getState().toggleChat()
    expect(useUIStore.getState().chatOpen).toBe(false)
  })

  it('setNotificationCount updates count', () => {
    useUIStore.getState().setNotificationCount(7)
    expect(useUIStore.getState().notificationCount).toBe(7)
  })

  it('setChatOpen sets directly', () => {
    useUIStore.getState().setChatOpen(false)
    expect(useUIStore.getState().chatOpen).toBe(false)
  })
})
