'use client'

import { useRef, useCallback } from 'react'
import AnnouncementBanner from './AnnouncementBanner'
import FeedTabs from './FeedTabs'
import PostCard from '@/components/post/PostCard'
import PostCardSkeleton from '@/components/post/PostCardSkeleton'
import { usePostsFeed } from '@/hooks/usePosts'
import type { PostType } from '@/types'

interface FeedViewProps {
  categorySlug?: string
  userId?: string
  showBanner?: boolean
  allowedTypes?: PostType[]
}

export default function FeedView({ categorySlug, userId, showBanner, allowedTypes }: FeedViewProps) {
  const observerRef = useRef<IntersectionObserver | null>(null)

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = usePostsFeed({
    category: categorySlug,
    user_id: userId,
  })

  const loadMoreRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) observerRef.current.disconnect()
      if (!node) return
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      })
      observerRef.current.observe(node)
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage],
  )

  const posts = data?.pages.flatMap((p) => p.data) ?? []
  const filtered = allowedTypes ? posts.filter((p) => allowedTypes.includes(p.post_type)) : posts

  return (
    <div className="space-y-3">
      {showBanner && <AnnouncementBanner />}
      <FeedTabs />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <PostCardSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted text-center py-12">Henüz içerik yok.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((post, i) => (
            <PostCard key={post.id} post={post} priority={i === 0} />
          ))}
        </div>
      )}

      <div ref={loadMoreRef} className="h-4" />

      {isFetchingNextPage && (
        <div className="space-y-3">
          <PostCardSkeleton />
          <PostCardSkeleton />
        </div>
      )}
    </div>
  )
}
