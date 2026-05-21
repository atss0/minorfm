'use client'

import { usePathname, useRouter } from 'next/navigation'
import Image from 'next/image'
import { ChevronRight, LogOut } from 'lucide-react'
import { useAdminAuthStore } from '@/store/adminAuthStore'

const LABELS: Record<string, string> = {
  admin:      'Dashboard',
  users:      'Kullanıcılar',
  posts:      'İçerikler',
  comments:   'Yorumlar',
  categories: 'Kategoriler',
  radio:      'Radyo',
  invites:    'Davetler',
}

export default function AdminTopBar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAdminAuthStore()

  const segments = pathname.split('/').filter(Boolean)
  const crumbs = segments.map((seg) => LABELS[seg] ?? seg)

  const handleLogout = () => {
    logout()
    router.replace('/admin/login')
  }

  return (
    <header className="h-14 shrink-0 flex items-center justify-between px-6 border-b border-border bg-surface">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm">
        {crumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight size={13} className="text-border" />}
            <span className={i === crumbs.length - 1 ? 'text-white font-semibold' : 'text-muted'}>
              {crumb}
            </span>
          </span>
        ))}
      </nav>

      {/* User + logout */}
      {user && (
        <div className="flex items-center gap-2.5">
          <span className="text-sm text-muted hidden sm:block">{user.username}</span>
          {user.avatar_url ? (
            <Image
              src={user.avatar_url}
              alt={user.username}
              width={28}
              height={28}
              className="rounded-full object-cover"
              unoptimized
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-border flex items-center justify-center text-xs font-bold text-white">
              {user.username[0]?.toUpperCase()}
            </div>
          )}
          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
            user.role === 'admin' ? 'bg-primary/20 text-primary' : 'bg-border text-muted'
          }`}>
            {user.role === 'admin' ? 'Admin' : 'Mod'}
          </span>
          <button
            onClick={handleLogout}
            title="Çıkış Yap"
            className="p-1.5 rounded-md text-muted hover:text-white hover:bg-border transition-colors"
          >
            <LogOut size={15} />
          </button>
        </div>
      )}
    </header>
  )
}
