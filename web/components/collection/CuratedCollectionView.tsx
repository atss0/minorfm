'use client'

import { useRef, useCallback } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Bookmark } from 'lucide-react'
import api from '@/lib/api'
import PostCard from '@/components/post/PostCard'
import PostCardSkeleton from '@/components/post/PostCardSkeleton'
import type { PaginatedResponse, Post } from '@/types'

async function fetchCurated(page: number): Promise<PaginatedResponse<Post>> {
  const res = await api.get<PaginatedResponse<Post>>('/api/collections/curated', { params: { page } })
  return res.data
}

export default function CuratedCollectionView() {
  const observerRef = useRef<IntersectionObserver | null>(null)

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = useInfiniteQuery({
    queryKey: ['curated-collection'],
    queryFn: ({ pageParam }) => fetchCurated(pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.limit < last.total ? last.page + 1 : undefined),
    staleTime: 60_000,
  })

  const loadMoreRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) observerRef.current.disconnect()
      if (!node) return
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage()
      })
      observerRef.current.observe(node)
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage],
  )

  const posts = data?.pages.flatMap((p) => p.data) ?? []

  return (
    <div className="space-y-3">
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <PostCardSkeleton key={i} />)}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <Bookmark size={36} className="text-muted mx-auto" />
          <p className="text-sm text-muted">Henüz moderatör ceplemesi yok.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => <PostCard key={post.id} post={post} />)}
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
