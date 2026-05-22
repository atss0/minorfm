'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { User, Mail } from 'lucide-react'
import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import type { Category, User as UserType } from '@/types'

const SEED_CATEGORIES: Category[] = [
  { id: 1, name: 'hiperfokus', slug: 'hiperfokus', icon: '👁', description: '', order: 1 },
  { id: 2, name: 'dipses',     slug: 'dipses',     icon: '🎧', description: '', order: 2 },
  { id: 3, name: 'sinemaskop', slug: 'sinemaskop', icon: '🎬', description: '', order: 3 },
  { id: 4, name: 'okuryazar',  slug: 'okuryazar',  icon: '✏️', description: '', order: 4 },
  { id: 5, name: 'sualite',    slug: 'sualite',    icon: '⚡', description: '', order: 5 },
  { id: 6, name: 'hemfikir',   slug: 'hemfikir',   icon: '🙌', description: '', order: 6 },
  { id: 7, name: 'sinedump',   slug: 'sinedump',   icon: '🎞', description: '', order: 7 },
  { id: 8, name: 'koleksiyon', slug: 'koleksiyon', icon: '✨', description: '', order: 8 },
]

export default function LeftSidebar() {
  const pathname = usePathname()
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin' || user?.role === 'moderator'

  const { data: rawCategories } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => api.get('/api/categories').then((r) => r.data),
    staleTime: 5 * 60_000,
    retry: false,
  })

  const categories =
    rawCategories && rawCategories.length > 0 ? rawCategories : SEED_CATEGORIES

  const { data: following = [] } = useQuery<UserType[]>({
    queryKey: ['following', user?.id],
    queryFn: () => api.get(`/api/users/${user!.id}/following`).then((r) => r.data),
    enabled: !!user,
    staleTime: 60_000,
  })

  const { data: onlineUsers = [] } = useQuery<UserType[]>({
    queryKey: ['online-users'],
    queryFn: () => api.get('/api/users/online').then((r) => r.data),
    enabled: !!user && following.length > 0,
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: false,
  })

  const onlineIds = new Set(onlineUsers.map((u) => u.id))

  return (
    <nav className="py-4 px-3 space-y-5 bg-bg h-full">
      {/* Ana akış */}
      <div>
        <Link
          href="/"
          className={`block text-sm font-semibold mb-3 transition-colors ${
            pathname === '/' ? 'text-white' : 'text-muted hover:text-white'
          }`}
        >
          akış
        </Link>

        {/* Kategoriler */}
        <ul className="space-y-0.5">
          {categories.map((cat) => {
            const isActive = pathname === `/category/${cat.slug}`
            return (
              <li key={cat.id}>
                <Link
                  href={`/category/${cat.slug}`}
                  className={`flex items-center gap-2.5 px-2 py-1.5 rounded text-sm transition-colors ${
                    isActive
                      ? 'text-white font-semibold bg-surface'
                      : 'text-muted hover:text-white hover:bg-surface/50'
                  }`}
                >
                  <span className="text-base leading-none w-5 text-center">{cat.icon}</span>
                  <span>{cat.name}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>

      {/* Takip edilenler — sadece giriş yapılmışsa ve liste doluysa */}
      {user && following.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2 px-2">
            Takip edilenler
          </p>
          <ul className="space-y-0.5">
            {following.map((u) => (
              <li key={u.id}>
                <Link
                  href={`/profile/${u.username}`}
                  className="flex items-center gap-2.5 px-2 py-1.5 rounded text-sm text-muted hover:text-white hover:bg-surface/50 transition-colors"
                >
                  <div className="relative w-6 h-6 shrink-0">
                    <div className="w-6 h-6 rounded-full bg-border overflow-hidden flex items-center justify-center">
                      {u.avatar_url ? (
                        <Image
                          src={u.avatar_url}
                          alt={u.username}
                          width={24}
                          height={24}
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <User size={12} className="text-muted" />
                      )}
                    </div>
                    {onlineIds.has(u.id) && (
                      <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-green-400 border border-bg" />
                    )}
                  </div>
                  <span className="truncate">{u.username}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Admin alanı */}
      {isAdmin && (
        <div>
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2 px-2">
            Yönetim
          </p>
          <Link
            href="/admin/invites"
            className={`flex items-center gap-2.5 px-2 py-1.5 rounded text-sm transition-colors ${
              pathname === '/admin/invites'
                ? 'text-white font-semibold bg-surface'
                : 'text-muted hover:text-white hover:bg-surface/50'
            }`}
          >
            <Mail size={14} />
            <span>Davetler</span>
          </Link>
        </div>
      )}
    </nav>
  )
}
