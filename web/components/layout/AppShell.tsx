'use client'

import { useUIStore } from '@/store/uiStore'
import { useChatStore } from '@/store/chatStore'
import { useChat } from '@/hooks/useChat'
import { useRadio } from '@/hooks/useRadio'
import { useNotifications } from '@/hooks/useNotifications'
import AudioPlayer from '@/components/player/AudioPlayer'
import Header from './Header'
import LeftSidebar from './LeftSidebar'
import RightSidebar from './RightSidebar'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { sidebarOpen, chatOpen } = useUIStore()
  const activeRoom = useChatStore((s) => s.activeRoom)

  // Persistent connections — survive sidebar open/close
  useChat(activeRoom)
  useRadio()
  useNotifications()

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Hidden audio element drives real playback */}
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
