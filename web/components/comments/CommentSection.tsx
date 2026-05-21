'use client'

import { useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useComments, useCreateComment } from '@/hooks/useComments'
import CommentItem from './CommentItem'

interface Props {
  postId: string
}

export default function CommentSection({ postId }: Props) {
  const { user } = useAuthStore()
  const { data: comments, isLoading } = useComments(postId)
  const createComment = useCreateComment(postId)
  const [body, setBody] = useState('')

  function submit() {
    if (!body.trim()) return
    createComment.mutate(
      { body: body.trim() },
      { onSuccess: () => setBody('') }
    )
  }

  return (
    <div className="mt-8">
      <h3 className="text-sm font-semibold text-text mb-4">
        Yorumlar {comments && comments.length > 0 && `(${comments.length})`}
      </h3>

      {user ? (
        <div className="flex gap-3 mb-6">
          <div className="w-7 h-7 rounded-full bg-surface flex-shrink-0 overflow-hidden">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="flex items-center justify-center h-full text-xs text-muted">
                {user.username[0].toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1 flex gap-2">
            <input
              className="flex-1 bg-surface border border-border rounded px-3 py-2 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent"
              placeholder="Yorum yaz…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
            />
            <button
              className="px-3 py-2 bg-accent text-white text-sm rounded hover:opacity-90 transition-opacity disabled:opacity-50"
              onClick={submit}
              disabled={createComment.isPending || !body.trim()}
            >
              Gönder
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted mb-6">
          Yorum yapmak için{' '}
          <a href="/login" className="text-accent hover:underline">
            giriş yapın
          </a>
        </p>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-7 h-7 rounded-full bg-surface" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-surface rounded w-24" />
                <div className="h-3 bg-surface rounded w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : comments && comments.length > 0 ? (
        <div className="divide-y divide-border">
          {comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} postId={postId} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted text-center py-8">Henüz yorum yok.</p>
      )}
    </div>
  )
}
