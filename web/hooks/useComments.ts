'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { showError } from '@/lib/toast'
import type { Comment } from '@/types'

export function useComments(postId: string) {
  return useQuery<Comment[]>({
    queryKey: ['comments', postId],
    queryFn: async () => {
      const res = await api.get(`/api/posts/${postId}/comments`)
      return res.data
    },
  })
}

export function useCreateComment(postId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { body: string; parent_id?: string }) =>
      api.post(`/api/posts/${postId}/comments`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comments', postId] })
      qc.invalidateQueries({ queryKey: ['posts'] })
    },
    onError: () => showError('Yorum gönderilemedi. Lütfen tekrar deneyin.'),
  })
}

export function useDeleteComment(postId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (commentId: string) =>
      api.delete(`/api/posts/${postId}/comments/${commentId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comments', postId] })
      // Feed'deki comment_count sayacını da güncelle
      qc.invalidateQueries({ queryKey: ['posts-feed'] })
    },
    onError: () => showError('Yorum silinemedi. Lütfen tekrar deneyin.'),
  })
}

export function useLikeComment(postId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (commentId: string) =>
      api.post(`/api/posts/${postId}/comments/${commentId}/like`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comments', postId] })
    },
  })
}
