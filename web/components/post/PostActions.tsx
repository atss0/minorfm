'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Heart, MessageSquare, Bookmark, Share2 } from 'lucide-react'
import { useLikePost, useBookmarkPost } from '@/hooks/usePosts'
import { useAuthStore } from '@/store/authStore'
import type { Post } from '@/types'

export default function PostActions({ post }: { post: Post }) {
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(post.like_count)
  const [bookmarked, setBookmarked] = useState(false)
  const [copied, setCopied] = useState(false)

  const { user } = useAuthStore()
  const likeMutation = useLikePost()
  const bookmarkMutation = useBookmarkPost()

  const handleLike = async () => {
    if (!user) return
    const prev = liked
    const prevCount = likeCount
    setLiked(!prev)
    setLikeCount((c) => (prev ? c - 1 : c + 1))
    try {
      const result = await likeMutation.mutateAsync(post.id)
      // Sunucudan dönen gerçek sayıyı kullan; optimistik değerle sapma olmasın
      if (result?.data?.like_count !== undefined) {
        setLikeCount(result.data.like_count)
      }
    } catch {
      setLiked(prev)
      setLikeCount(prevCount)
    }
  }

  const handleBookmark = async () => {
    if (!user) return
    const prev = bookmarked
    setBookmarked(!prev)
    try {
      await bookmarkMutation.mutateAsync(post.id)
    } catch {
      setBookmarked(prev)
    }
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/post/${post.id}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch {}
  }

  return (
    <div className="flex items-center gap-4 px-4 pb-3 pt-2.5 border-t border-border/40">
      <button
        onClick={handleLike}
        title={user ? undefined : 'Beğenmek için giriş yapın'}
        className={`flex items-center gap-1.5 text-sm transition-colors ${
          liked ? 'text-primary' : 'text-muted hover:text-white'
        } ${!user ? 'opacity-50 cursor-default' : ''}`}
      >
        <Heart size={14} fill={liked ? 'currentColor' : 'none'} />
        <span>{likeCount}</span>
      </button>

      <Link
        href={`/post/${post.id}`}
        className="flex items-center gap-1.5 text-sm text-muted hover:text-white transition-colors"
      >
        <MessageSquare size={14} />
        <span>{post.comment_count}</span>
      </Link>

      <button
        onClick={handleBookmark}
        title={user ? undefined : 'Kaydetmek için giriş yapın'}
        className={`transition-colors ${
          bookmarked ? 'text-primary' : 'text-muted hover:text-white'
        } ${!user ? 'opacity-50 cursor-default' : ''}`}
      >
        <Bookmark size={14} fill={bookmarked ? 'currentColor' : 'none'} />
      </button>

      <button
        onClick={handleShare}
        className="text-muted hover:text-white transition-colors ml-auto"
        aria-label="Paylaş"
      >
        {copied ? (
          <span className="text-xs text-green-400">Kopyalandı!</span>
        ) : (
          <Share2 size={14} />
        )}
      </button>
    </div>
  )
}
