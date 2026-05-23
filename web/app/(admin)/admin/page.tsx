'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Users, FileText, MessageSquare, Ticket } from 'lucide-react'
import Image from 'next/image'
import api from '@/lib/adminApi'
import StatCard from '@/components/admin/StatCard'
import { relativeTime } from '@/lib/time'
import type { User, Post } from '@/types'

interface StatsResponse {
  totals: { users: number; posts: number; comments: number; active_invites: number }
  last_7_days: { new_users: number; new_posts: number }
  last_30_days: { new_users: number; new_posts: number }
  recent_users: User[]
  recent_posts: Post[]
}

function Skeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-surface border border-border rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-60 bg-surface border border-border rounded-xl" />
        <div className="h-60 bg-surface border border-border rounded-xl" />
      </div>
    </div>
  )
}

export default function AdminDashboardPage() {
  const [period, setPeriod] = useState<7 | 30>(7)

  const { data, isLoading, isError, refetch } = useQuery<StatsResponse>({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/api/admin/stats').then(r => r.data),
  })

  if (isError) return (
    <div className="text-center py-20">
      <p className="text-muted">İstatistikler yüklenemedi.</p>
      <button onClick={() => refetch()} className="mt-4 text-primary underline text-sm">
        Tekrar Dene
      </button>
    </div>
  )

  if (isLoading || !data) return <Skeleton />

  const delta = period === 7 ? data.last_7_days : data.last_30_days

  return (
    <div className="space-y-8">
      {/* Stat cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">Genel Bakış</h2>
          <div className="flex items-center gap-1 bg-surface border border-border rounded-lg p-1">
            {([7, 30] as const).map(n => (
              <button
                key={n}
                onClick={() => setPeriod(n)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  period === n ? 'bg-primary/20 text-primary' : 'text-muted hover:text-white'
                }`}
              >
                {n} gün
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Users}
            label="Kullanıcılar"
            value={data.totals.users}
            delta={delta.new_users}
            deltaLabel={`son ${period} günde`}
          />
          <StatCard
            icon={FileText}
            label="İçerikler"
            value={data.totals.posts}
            delta={delta.new_posts}
            deltaLabel={`son ${period} günde`}
          />
          <StatCard icon={MessageSquare} label="Yorumlar" value={data.totals.comments} />
          <StatCard icon={Ticket} label="Aktif Davetler" value={data.totals.active_invites} />
        </div>
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface border border-border rounded-xl p-5">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">
            Son Kayıt Olan Kullanıcılar
          </p>
          <div className="space-y-3">
            {data.recent_users.map(user => (
              <div key={user.id} className="flex items-center gap-3">
                {user.avatar_url ? (
                  <Image
                    src={user.avatar_url}
                    alt={user.username}
                    width={28}
                    height={28}
                    className="rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-border flex items-center justify-center text-xs font-bold text-white shrink-0">
                    {user.username[0]?.toUpperCase()}
                  </div>
                )}
                <span className="flex-1 text-sm text-white font-medium">{user.username}</span>
                <span className="text-xs text-muted">{relativeTime(user.created_at)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-5">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">
            Son Eklenen İçerikler
          </p>
          <div className="space-y-3">
            {data.recent_posts.map(post => (
              <div key={post.id} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium truncate">{post.title}</p>
                  <p className="text-xs text-muted">{post.user?.username ?? '—'}</p>
                </div>
                <span className="text-xs text-muted shrink-0">{relativeTime(post.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
