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

export default function Header() {
  const { volume, setVolume } = usePlayerStore()
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

      {/* ── Center: volume control ────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className="p-1.5 text-muted hover:text-white transition-colors"
            aria-label={isMuted ? 'Sesi aç' : 'Sesi kapat'}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="w-24"
            aria-label="Ses seviyesi"
          />
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
