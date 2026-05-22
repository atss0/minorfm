'use client'

import Image from 'next/image'
import Link from 'next/link'
import { X, Send, Smile, ChevronDown, User } from 'lucide-react'
import { useUIStore } from '@/store/uiStore'
import { useChatStore } from '@/store/chatStore'
import { useAuthStore } from '@/store/authStore'
import { useState, useRef, useEffect } from 'react'
import api from '@/lib/api'
import type { ChatMessage as ChatMessageType } from '@/types'

interface Room {
  id: string
  name: string
  slug: string
}

function ConnectionDot({ connected }: { connected: boolean }) {
  return (
    <span className="relative flex h-2 w-2 shrink-0">
      {connected && (
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
      )}
      <span
        className={`relative inline-flex rounded-full h-2 w-2 ${
          connected ? 'bg-green-400' : 'bg-muted/40'
        }`}
      />
    </span>
  )
}

function MessageRow({ msg }: { msg: ChatMessageType }) {
  return (
    <div className="flex items-start gap-2">
      <Link href={`/profile/${msg.username}`} className="shrink-0 mt-0.5">
        <div className="w-6 h-6 rounded-full bg-border overflow-hidden flex items-center justify-center">
          {msg.avatar_url ? (
            <Image
              src={msg.avatar_url}
              alt={msg.username}
              width={24}
              height={24}
              className="object-cover"
              unoptimized
            />
          ) : (
            <User size={12} className="text-muted" />
          )}
        </div>
      </Link>
      <div className="min-w-0">
        <Link href={`/profile/${msg.username}`} className="text-xs font-semibold text-primary hover:underline">
          @{msg.username}
        </Link>
        {msg.badge != null && (
          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1 py-0.5 rounded bg-primary text-white ml-1">
            👑 #{msg.badge}
          </span>
        )}
        <p className="text-xs text-white/80 mt-0.5 break-words">{msg.body}</p>
      </div>
    </div>
  )
}

export default function RightSidebar() {
  const { setChatOpen } = useUIStore()
  const { messages, isConnected, activeRoom, setRoom, sendMessage } = useChatStore()
  const { user } = useAuthStore()

  const [input, setInput] = useState('')
  const [rooms, setRooms] = useState<Room[]>([])
  const [roomPickerOpen, setRoomPickerOpen] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    api
      .get('/api/chat/rooms')
      .then((res) => setRooms(res.data?.data ?? []))
      .catch(() => {})
  }, [])

  const activeRoomLabel =
    rooms.find((r) => r.slug === activeRoom || r.id === activeRoom)?.name ??
    (activeRoom === 'global' ? 'Popüler sohbet' : activeRoom)

  const handleSend = () => {
    const body = input.trim()
    if (!body || !user) return
    sendMessage(body)
    setInput('')
  }

  const handleRoomSelect = (room: Room) => {
    setRoom(room.slug ?? room.id)
    setRoomPickerOpen(false)
  }

  return (
    <div className="flex flex-col h-full bg-surface text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <ConnectionDot connected={isConnected} />

          <div className="relative">
            <button
              onClick={() => setRoomPickerOpen((v) => !v)}
              className="text-xs font-semibold flex items-center gap-1 text-white hover:text-primary transition-colors"
            >
              <span className="max-w-[100px] truncate">{activeRoomLabel}</span>
              <ChevronDown size={12} className="shrink-0" />
            </button>

            {roomPickerOpen && rooms.length > 0 && (
              <div className="absolute top-full left-0 mt-1 bg-surface border border-border rounded-lg shadow-xl z-50 min-w-[160px]">
                {rooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => handleRoomSelect(room)}
                    className="block w-full text-left px-3 py-2 text-xs text-white/80 hover:bg-border hover:text-white transition-colors first:rounded-t-lg last:rounded-b-lg"
                  >
                    {room.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/30 flex items-center gap-0.5 whitespace-nowrap">
            🌟 En Etkin
          </span>
        </div>

        <button
          onClick={() => setChatOpen(false)}
          className="text-muted hover:text-white transition-colors ml-2 shrink-0"
          aria-label="Sohbeti kapat"
        >
          <X size={16} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
        {messages.length === 0 ? (
          <p className="text-xs text-muted text-center pt-8">
            {isConnected ? 'Henüz mesaj yok.' : 'Bağlanılıyor…'}
          </p>
        ) : (
          messages.map((msg) => <MessageRow key={msg.id} msg={msg} />)
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-2 border-t border-border shrink-0">
        {user ? (
          <div className="flex items-center gap-1.5 bg-bg rounded-lg px-3 py-1.5 border border-border">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={isConnected ? 'Sohbet...' : 'Bağlanılıyor…'}
              disabled={!isConnected}
              className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-muted disabled:cursor-not-allowed disabled:opacity-60"
            />
            <button className="text-muted hover:text-muted/60 transition-colors" aria-label="Emoji">
              <Smile size={16} />
            </button>
            <button
              onClick={handleSend}
              disabled={!input.trim() || !isConnected}
              className="text-muted hover:text-primary transition-colors disabled:opacity-40"
              aria-label="Gönder"
            >
              <Send size={16} />
            </button>
          </div>
        ) : (
          <p className="text-xs text-muted text-center py-1">
            Sohbete katılmak için{' '}
            <Link href="/login" className="text-primary hover:underline font-semibold">
              giriş yap
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}
