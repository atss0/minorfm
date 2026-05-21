'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  SkipBack,
  SkipForward,
  Play,
  Pause,
  Shuffle,
  Repeat,
  Volume2,
  Bell,
  User,
  Menu,
  Heart,
  MessageCircle,
  LogOut,
  Settings,
} from 'lucide-react'
import { usePlayerStore } from '@/store/playerStore'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import api from '@/lib/api'

function fmt(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function Header() {
  const {
    isPlaying,
    currentTrack,
    volume,
    progress,
    isShuffle,
    isRepeat,
    togglePlay,
    prev,
    next,
    setVolume,
    setProgress,
    toggleShuffle,
    toggleRepeat,
  } = usePlayerStore()

  const { user, logout } = useAuthStore()
  const { toggleSidebar, toggleChat, notificationCount } = useUIStore()
  const router = useRouter()

  const [showUserMenu, setShowUserMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = async () => {
    setShowUserMenu(false)
    try { await api.post('/api/auth/logout') } catch {}
    logout()
    router.push('/login')
  }

  const duration = currentTrack?.duration ?? 0
  const pct = duration > 0 ? (progress / duration) * 100 : 0

  return (
    <header className="h-14 bg-surface border-b border-border flex items-center px-4 gap-2 shrink-0">

      {/* ── Left: menu + logo ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={toggleSidebar}
          className="p-1.5 text-muted hover:text-white transition-colors"
          aria-label="Menü"
        >
          <Menu size={18} />
        </button>
        <Link href="/" className="shrink-0 select-none flex items-center">
          <img src="/logo.svg" alt="MINOR.fm" className="h-7 w-auto" />
        </Link>
      </div>

      {/* ── Center: player (takes all remaining space) ────────────────────── */}
      <div className="flex-1 min-w-0 flex items-center gap-2 overflow-hidden">

        {/* Transport controls */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={prev}
            className="p-1.5 text-muted hover:text-white transition-colors"
            aria-label="Önceki"
          >
            <SkipBack size={15} />
          </button>
          <button
            onClick={togglePlay}
            disabled={!currentTrack}
            className="p-1.5 text-white hover:text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label={isPlaying ? 'Durdur' : 'Oynat'}
          >
            {isPlaying ? <Pause size={19} /> : <Play size={19} fill="currentColor" />}
          </button>
          <button
            onClick={next}
            className="p-1.5 text-muted hover:text-white transition-colors"
            aria-label="Sonraki"
          >
            <SkipForward size={15} />
          </button>
          <button
            onClick={toggleShuffle}
            className={`p-1.5 transition-colors hidden sm:block ${isShuffle ? 'text-primary' : 'text-muted hover:text-white'}`}
            aria-label="Karıştır"
          >
            <Shuffle size={13} />
          </button>
          <button
            onClick={toggleRepeat}
            className={`p-1.5 transition-colors hidden sm:block ${isRepeat ? 'text-primary' : 'text-muted hover:text-white'}`}
            aria-label="Tekrar"
          >
            <Repeat size={13} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="flex-1 min-w-0 flex items-center gap-1.5">
          <span className="text-xs text-muted shrink-0 tabular-nums w-8 text-right">
            {fmt(progress)}
          </span>
          <div className="relative flex-1 h-1 bg-border rounded-full min-w-0">
            <div
              className="absolute inset-y-0 left-0 bg-primary rounded-full pointer-events-none"
              style={{ width: `${pct}%` }}
            />
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              className="absolute inset-0 w-full opacity-0 cursor-pointer"
              aria-label="Süre"
            />
          </div>
          <span className="text-xs text-muted shrink-0 tabular-nums w-8">
            {fmt(duration)}
          </span>
        </div>

        {/* Volume — fixed narrow width so thumb never overlaps right icons */}
        <div className="hidden md:flex items-center gap-1 shrink-0 w-[52px]">
          <Volume2 size={13} className="text-muted shrink-0" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="w-full"
            style={{ maxWidth: 36 }}
            aria-label="Ses"
          />
        </div>

        {/* Track info */}
        {currentTrack && (
          <div className="hidden lg:flex items-center gap-2 shrink-0 max-w-[150px]">
            {currentTrack.cover_url && (
              <Image
                src={currentTrack.cover_url}
                alt={currentTrack.title}
                width={26}
                height={26}
                className="rounded shrink-0 object-cover"
              />
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold truncate leading-tight">{currentTrack.artist}</p>
              <p className="text-xs text-muted truncate leading-tight">{currentTrack.title}</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Right: chat + actions ─────────────────────────────────────────── */}
      <div className="flex items-center gap-0.5 shrink-0">
        <button
          onClick={toggleChat}
          className="p-1.5 text-muted hover:text-white transition-colors"
          aria-label="Sohbet"
        >
          <MessageCircle size={16} />
        </button>
        <div className="relative">
          <button
            className="p-1.5 text-muted hover:text-white transition-colors"
            aria-label="Bildirimler"
          >
            <Bell size={16} />
          </button>
          {notificationCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary rounded-full text-[9px] flex items-center justify-center font-bold pointer-events-none">
              {notificationCount > 9 ? '9+' : notificationCount}
            </span>
          )}
        </div>
        {user ? (
          <div ref={menuRef} className="relative ml-1">
            <button
              onClick={() => setShowUserMenu((v) => !v)}
              className="flex items-center"
              aria-label="Kullanıcı menüsü"
            >
              <div className="w-7 h-7 rounded-full bg-border overflow-hidden flex items-center justify-center shrink-0">
                {user.avatar_url ? (
                  <Image
                    src={user.avatar_url}
                    alt={user.username}
                    width={28}
                    height={28}
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <User size={14} className="text-muted" />
                )}
              </div>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 top-full mt-2 w-44 bg-surface border border-border rounded-xl shadow-2xl z-50 py-1 overflow-hidden">
                <Link
                  href={`/profile/${user.username}`}
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-white hover:bg-border/60 transition-colors"
                >
                  <User size={14} className="shrink-0" />
                  <span>Profil</span>
                </Link>
                <Link
                  href="/settings"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-white hover:bg-border/60 transition-colors"
                >
                  <Settings size={14} className="shrink-0" />
                  <span>Ayarlar</span>
                </Link>
                <div className="border-t border-border my-1" />
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:bg-border/60 transition-colors w-full text-left"
                >
                  <LogOut size={14} className="shrink-0" />
                  <span>Çıkış Yap</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link
            href="/login"
            className="ml-1 px-3 py-1 text-xs bg-primary hover:bg-primary/90 text-white rounded transition-colors"
          >
            Giriş Yap
          </Link>
        )}
      </div>
    </header>
  )
}
