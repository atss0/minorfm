import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { showError } from '@/lib/toast'
import { MOCK_POSTS } from '@/lib/mockData'
import type { PaginatedResponse, Post } from '@/types'

interface PostsParams {
  sort?: string
  category?: string
  user_id?: string
}

async function fetchPosts(params: PostsParams & { page: number }): Promise<PaginatedResponse<Post>> {
  try {
    const res = await api.get<PaginatedResponse<Post>>('/api/posts', { params })
    return res.data
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[DEV] /api/posts başarısız, mock data kullanılıyor:', error)
      const filtered = params.category
        ? MOCK_POSTS.filter((p) => p.category.slug === params.category)
        : MOCK_POSTS
      return { data: filtered, total: filtered.length, page: params.page, limit: 20 }
    }
    throw error
  }
}

export function usePostsFeed(params: PostsParams) {
  return useInfiniteQuery({
    queryKey: ['posts-feed', params],
    queryFn: ({ pageParam }) => fetchPosts({ ...params, page: pageParam as number }),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page * last.limit < last.total ? last.page + 1 : undefined,
    staleTime: 5_000,
  })
}

export function useLikePost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post(`/api/posts/${id}/like`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['posts-feed'] }),
    onError: () => showError('Beğeni kaydedilemedi.'),
  })
}

export function useBookmarkPost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post(`/api/posts/${id}/bookmark`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['posts-feed'] }),
    onError: () => showError('Kaydetme işlemi başarısız.'),
  })
}
