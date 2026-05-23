'use client'

import { useEffect } from 'react'
import axios from 'axios'
import { useUIStore } from '@/store/uiStore'
import { useChatStore } from '@/store/chatStore'
import { useChat } from '@/hooks/useChat'
import { useRadio } from '@/hooks/useRadio'
import { useNotifications } from '@/hooks/useNotifications'
import { useAuthStore } from '@/store/authStore'
import { globalLogout } from '@/store/globalLogout'
import AudioPlayer from '@/components/player/AudioPlayer'
import Header from './Header'
import LeftSidebar from './LeftSidebar'
import RightSidebar from './RightSidebar'

function isExpiringSoon(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return typeof payload.exp === 'number' && payload.exp < Date.now() / 1000 + 300
  } catch {
    return false
  }
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { sidebarOpen, chatOpen } = useUIStore()
  const activeRoom = useChatStore((s) => s.activeRoom)

  useChat(activeRoom)
  useRadio()
  useNotifications()

  // Proactively refresh the access token 5 minutes before expiry
  useEffect(() => {
    const interval = setInterval(async () => {
      const { accessToken, refreshToken, setAccessToken } = useAuthStore.getState()
      if (!accessToken || !refreshToken) return
      if (!isExpiringSoon(accessToken)) return
      try {
        const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'
        const { data } = await axios.post(`${base}/api/auth/refresh`, { refresh_token: refreshToken })
        setAccessToken(data.access_token)
      } catch {
        globalLogout()
      }
    }, 60_000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <AudioPlayer />
      <Header />

      <div className="flex flex-1 overflow-hidden">
        {sidebarOpen && (
          <aside className="w-52 shrink-0 border-r border-border overflow-y-auto">
            <LeftSidebar />
          </aside>
        )}

        <main className="flex-1 overflow-y-auto bg-bg">{children}</main>

        {chatOpen && (
          <aside className="w-72 shrink-0 border-l border-border overflow-hidden flex flex-col">
            <RightSidebar />
          </aside>
        )}
      </div>
    </div>
  )
}
