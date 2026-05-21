'use client'

import { useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useCreateComment, useDeleteComment, useLikeComment } from '@/hooks/useComments'
import type { Comment } from '@/types'
import { formatDistanceToNow } from 'date-fns'

interface Props {
  comment: Comment
  postId: string
  depth?: number
}

export default function CommentItem({ comment, postId, depth = 0 }: Props) {
  const { user } = useAuthStore()
  const [replying, setReplying] = useState(false)
  const [replyBody, setReplyBody] = useState('')

  const createComment = useCreateComment(postId)
  const deleteComment = useDeleteComment(postId)
  const likeComment = useLikeComment(postId)

  function submitReply() {
    if (!replyBody.trim()) return
    createComment.mutate(
      { body: replyBody.trim(), parent_id: comment.id },
      {
        onSuccess: () => {
          setReplyBody('')
          setReplying(false)
        },
      }
    )
  }

  return (
    <div className={depth > 0 ? 'ml-8 border-l border-border pl-4' : ''}>
      <div className="flex gap-3 py-3">
        <div className="w-7 h-7 rounded-full bg-surface flex-shrink-0 overflow-hidden">
          {comment.user.avatar_url ? (
            <img src={comment.user.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="flex items-center justify-center h-full text-xs text-muted">
              {comment.user.username[0].toUpperCase()}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-medium text-text">{comment.user.username}</span>
            <span className="text-xs text-muted">
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
            </span>
          </div>
          <p className="text-sm text-text mt-0.5 break-words">{comment.body}</p>

          <div className="flex items-center gap-4 mt-1">
            <button
              className="text-xs text-muted hover:text-text transition-colors"
              onClick={() => likeComment.mutate(comment.id)}
            >
              {comment.like_count > 0 ? `${comment.like_count} beğeni` : 'Beğen'}
            </button>

            {user && depth === 0 && (
              <button
                className="text-xs text-muted hover:text-text transition-colors"
                onClick={() => setReplying((v) => !v)}
              >
                Yanıtla
              </button>
            )}

            {user && (user.id === comment.user_id || user.role === 'admin' || user.role === 'moderator') && (
              <button
                className="text-xs text-muted hover:text-red-500 transition-colors"
                onClick={() => deleteComment.mutate(comment.id)}
              >
                Sil
              </button>
            )}
          </div>

          {replying && (
            <div className="mt-2 flex gap-2">
              <input
                className="flex-1 bg-surface border border-border rounded px-2 py-1 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent"
                placeholder="Yanıtınızı yazın…"
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitReply()}
              />
              <button
                className="text-xs px-2 py-1 bg-accent text-white rounded hover:opacity-90 transition-opacity"
                onClick={submitReply}
              >
                Gönder
              </button>
            </div>
          )}
        </div>
      </div>

      {comment.replies?.map((reply) => (
        <CommentItem key={reply.id} comment={reply} postId={postId} depth={depth + 1} />
      ))}
    </div>
  )
}
