'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  Volume2,
  VolumeX,
  Bell,
  User,
  Menu,
  MessageCircle,
  LogOut,
  Settings,
} from 'lucide-react'
import { usePlayerStore } from '@/store/playerStore'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { globalLogout } from '@/store/globalLogout'
import api from '@/lib/api'

function EqBar({ delay }: { delay: number }) {
  return (
    <div
      className="w-[3px] rounded-full bg-primary"
      style={{
        height: '100%',
        transformOrigin: 'bottom',
        animation: `wave 0.85s ease-in-out ${delay}s infinite`,
      }}
    />
  )
}

export default function Header() {
  const { volume, setVolume, currentTrack, isPlaying, autoplayBlocked } = usePlayerStore()
  const { user } = useAuthStore()
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
    globalLogout()
    router.push('/login')
  }

  const isMuted = volume === 0
  const toggleMute = () => setVolume(isMuted ? 0.8 : 0)

  // Bars animate when radio is live and audio is actually playing
  const isAnimating = isPlaying && !autoplayBlocked

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

      {/* ── Center: live radio bar ────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center min-w-0 px-2">
        <div className="flex items-center gap-2.5 bg-bg border border-border rounded-full px-4 py-2 w-full max-w-[400px]">

          {/* LIVE badge */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[9px] font-black tracking-[0.15em] text-primary uppercase select-none">
              Canlı
            </span>
          </div>

          {/* Separator */}
          <div className="w-px h-3 bg-border shrink-0" />

          {/* Equalizer bars */}
          <div className="flex items-end gap-[3px] h-3 shrink-0">
            {isAnimating ? (
              <>
                <EqBar delay={0} />
                <EqBar delay={0.17} />
                <EqBar delay={0.34} />
                <EqBar delay={0.51} />
              </>
            ) : (
              <>
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="w-[3px] rounded-full bg-muted/40"
                    style={{ height: '35%', transformOrigin: 'bottom' }}
                  />
                ))}
              </>
            )}
          </div>

          {/* Track info */}
          <div className="flex-1 min-w-0">
            {autoplayBlocked ? (
              <p className="text-[11px] text-muted truncate">Dinlemek için tıkla…</p>
            ) : currentTrack ? (
              <p className="text-[11px] truncate">
                <span className="text-muted">{currentTrack.artist}</span>
                <span className="text-border mx-1">·</span>
                <span className="text-white">{currentTrack.title}</span>
              </p>
            ) : (
              <p className="text-[11px] text-muted truncate">Yayın bekleniyor…</p>
            )}
          </div>

          {/* Volume control */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={toggleMute}
              className="text-muted hover:text-white transition-colors"
              aria-label={isMuted ? 'Sesi aç' : 'Sesi kapat'}
            >
              {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.02}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-16"
              aria-label="Ses seviyesi"
            />
          </div>
        </div>
      </div>

      {/* ── Right: chat + notifications + user ────────────────────────────── */}
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
