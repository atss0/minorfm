'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import PostCard from '@/components/post/PostCard'
import PostCardSkeleton from '@/components/post/PostCardSkeleton'
import api from '@/lib/api'
import type { Post } from '@/types'

export default function CollectionView() {
  const { user } = useAuthStore()

  const { data: posts, isLoading } = useQuery<Post[]>({
    queryKey: ['bookmarks'],
    queryFn: async () => {
      const res = await api.get('/api/me/bookmarks')
      return res.data
    },
    enabled: !!user,
  })

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-muted text-sm">
          Koleksiyonunu görmek için{' '}
          <a href="/login" className="text-accent hover:underline">
            giriş yapın
          </a>
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-lg font-bold text-text mb-6">Koleksiyonum</h1>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <PostCardSkeleton key={i} />
          ))}
        </div>
      ) : !posts || posts.length === 0 ? (
        <p className="text-sm text-muted text-center py-12">
          Henüz kaydedilmiş gönderi yok.
        </p>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  )
}
