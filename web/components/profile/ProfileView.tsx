'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import FeedView from '@/components/feed/FeedView'
import type { User } from '@/types'

interface Props {
  username: string
}

export default function ProfileView({ username }: Props) {
  // Zustand store'undan user bilgisini ve (eğer yazdıysan) logout fonksiyonunu alıyoruz
  const { user: me, logout: clearClientAuth } = useAuthStore() as any 
  const qc = useQueryClient()
  const router = useRouter()

  const { data: profile, isLoading } = useQuery<User>({
    queryKey: ['profile', username],
    queryFn: async () => {
      const res = await api.get(`/api/users/${username}`)
      return res.data
    },
  })

  const followMutation = useMutation({
    mutationFn: () => api.post(`/api/users/${profile?.id}/follow`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile', username] })
    },
  })

  // Çıkış yapma işlemi için mutation
  const logoutMutation = useMutation({
    mutationFn: () => api.post('/api/auth/logout'), // Kendi endpoint'ine göre yolu uyarla
    onSuccess: () => {
      // 1. İstemci tarafındaki kullanıcı state'ini temizle
      if (clearClientAuth) clearClientAuth() 
      // 2. Başka kullanıcının verisi kalmasın diye React Query önbelleğini temizle
      qc.clear() 
      // 3. Login sayfasına yönlendir
      router.push('/login')
    },
  })

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 animate-pulse">
        <div className="flex gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-surface" />
          <div className="flex-1 space-y-2 pt-2">
            <div className="h-5 bg-surface rounded w-32" />
            <div className="h-4 bg-surface rounded w-48" />
          </div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center text-muted">
        Kullanıcı bulunamadı.
      </div>
    )
  }

  const isOwnProfile = me?.id === profile.id

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="bg-surface rounded-xl border border-border p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-bg overflow-hidden shrink-0">
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={profile.username}
                width={64}
                height={64}
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-muted">
                {profile.username[0].toUpperCase()}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h1 className="text-lg font-bold text-text">{profile.username}</h1>
              {!isOwnProfile && me && (
                <button
                  className="px-3 py-1 text-xs rounded border border-border hover:border-accent text-muted hover:text-accent transition-colors"
                  onClick={() => followMutation.mutate()}
                  disabled={followMutation.isPending}
                >
                  Takip Et
                </button>
              )}
              {isOwnProfile && (
                <div className="flex gap-2">
                  <a
                    href="/settings"
                    className="px-3 py-1 text-xs rounded border border-border hover:border-accent text-muted hover:text-accent transition-colors"
                  >
                    Profili Düzenle
                  </a>
                  <button
                    onClick={() => logoutMutation.mutate()}
                    disabled={logoutMutation.isPending}
                    className="px-3 py-1 text-xs rounded border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                  >
                    {logoutMutation.isPending ? '...' : 'Çıkış Yap'}
                  </button>
                </div>
              )}
            </div>

            {profile.bio && (
              <p className="text-sm text-muted mt-1">{profile.bio}</p>
            )}

            <div className="flex gap-4 mt-3 text-xs text-muted">
              <span>
                <span className="text-text font-semibold">{profile.post_count ?? 0}</span>{' '}
                gönderi
              </span>
              <span>
                <span className="text-text font-semibold">{profile.follower_count ?? 0}</span>{' '}
                takipçi
              </span>
              <span>
                <span className="text-text font-semibold">{profile.following_count ?? 0}</span>{' '}
                takip
              </span>
            </div>
          </div>
        </div>
      </div>

      <FeedView userId={profile.id} />
    </div>
  )
}