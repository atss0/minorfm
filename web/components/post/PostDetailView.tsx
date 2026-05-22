'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import api from '@/lib/api'
import { relativeTime } from '@/lib/time'
import PostActions from './PostActions'
import CommentSection from '@/components/comments/CommentSection'
import type { Post } from '@/types'

interface Props {
  postId: string
}

function GalleryLightbox({ images, initial, onClose }: { images: string[]; initial: number; onClose: () => void }) {
  const [idx, setIdx] = useState(initial)
  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 text-white/70 hover:text-white"
        onClick={onClose}
        aria-label="Kapat"
      >
        <X size={28} />
      </button>
      <button
        className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-3xl px-3 py-2 disabled:opacity-20"
        disabled={idx === 0}
        onClick={(e) => { e.stopPropagation(); setIdx((i) => i - 1) }}
      >‹</button>
      <div className="relative max-w-4xl max-h-[85vh] mx-16" onClick={(e) => e.stopPropagation()}>
        <Image
          src={images[idx]}
          alt={`Fotoğraf ${idx + 1}`}
          width={900}
          height={600}
          className="object-contain max-h-[85vh] rounded-lg"
          unoptimized
        />
        <p className="text-center text-white/50 text-sm mt-2">{idx + 1} / {images.length}</p>
      </div>
      <button
        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-3xl px-3 py-2 disabled:opacity-20"
        disabled={idx === images.length - 1}
        onClick={(e) => { e.stopPropagation(); setIdx((i) => i + 1) }}
      >›</button>
    </div>
  )
}

export default function PostDetailView({ postId }: Props) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)

  const { data: post, isLoading } = useQuery<Post>({
    queryKey: ['post', postId],
    queryFn: async () => {
      const res = await api.get(`/api/posts/${postId}`)
      return res.data
    },
  })

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 animate-pulse space-y-4">
        <div className="h-6 bg-surface rounded w-3/4" />
        <div className="h-4 bg-surface rounded w-1/4" />
        <div className="space-y-2 mt-6">
          {[...Array(5)].map((_, i) => <div key={i} className="h-4 bg-surface rounded" />)}
        </div>
      </div>
    )
  }

  if (!post) {
    return <div className="max-w-2xl mx-auto px-4 py-16 text-center text-muted">Gönderi bulunamadı.</div>
  }

  const meta = post.metadata as Record<string, unknown>
  const coverUrl = meta?.cover_url as string | undefined
  const galleryImages = (meta?.images as string[]) ?? []
  const embedUrl = meta?.embed_url as string | undefined

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {lightboxIdx !== null ? (
        <GalleryLightbox
          images={galleryImages}
          initial={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
        />
      ) : null}

      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        {/* Cover photo for articles */}
        {coverUrl && post.post_type === 'article' ? (
          <div className="w-full flex justify-center items-center bg-surface max-h-[500px] overflow-hidden">
            <Image
              src={coverUrl}
              alt={post.title}
              width={900}
              height={600}
              className="w-auto h-auto max-h-[500px] object-contain"
              unoptimized
            />
          </div>
        ) : null}

        <div className="px-6 pt-5 pb-4">
          {/* Author / meta */}
          <div className="flex items-center gap-2.5 mb-4">
            <Link href={`/profile/${post.user?.username}`} className="shrink-0">
              {post.user?.avatar_url ? (
                <Image
                  src={post.user.avatar_url}
                  alt={post.user.username}
                  width={32}
                  height={32}
                  className="rounded-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-border flex items-center justify-center text-xs font-bold text-muted">
                  {post.user?.username?.[0]?.toUpperCase() ?? '?'}
                </div>
              )}
            </Link>
            <div className="flex-1 min-w-0 flex items-center gap-2 text-xs text-muted">
              <Link href={`/profile/${post.user?.username}`} className="font-semibold text-white hover:text-primary transition-colors">
                {post.user?.username ?? 'anonim'}
              </Link>
              {post.category && (
                <>
                  <span>·</span>
                  <Link href={`/category/${post.category.slug}`} className="text-primary hover:underline">
                    {post.category.name}
                  </Link>
                </>
              )}
              <span>·</span>
              <span className="shrink-0">{relativeTime(post.created_at)}</span>
            </div>
          </div>

          <h1 className="text-xl font-bold text-white mb-4">{post.title}</h1>

          {/* Embed / video */}
          {post.post_type === 'embed' && embedUrl ? (
            <div className="mb-4 rounded-lg overflow-hidden bg-bg max-w-[640px] mx-auto" style={{ aspectRatio: '16/9' }}>
              <iframe
                src={embedUrl}
                className="w-full h-full"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                title={post.title}
              />
            </div>
          ) : null}

          {post.post_type === 'gallery' && galleryImages.length > 0 ? (
            <div
              className={`grid gap-1 rounded-lg overflow-hidden mb-4 ${
                galleryImages.length === 1
                  ? 'grid-cols-1'
                  : galleryImages.length === 2
                  ? 'grid-cols-2'
                  : galleryImages.length === 3
                  ? 'grid-cols-3'
                  : 'grid-cols-2 md:grid-cols-3'
              }`}
            >
              {galleryImages.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setLightboxIdx(i)}
                  className={`relative bg-border overflow-hidden hover:opacity-90 transition-opacity ${
                    galleryImages.length === 1 ? 'aspect-[16/9]' : 'aspect-square'
                  }`}
                >
                  <Image
                    src={src}
                    alt={`${post.title} — ${i + 1}`}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </button>
              ))}
            </div>
          ) : null}

          {post.body ? (
            <div className="prose prose-invert prose-sm max-w-none text-white/90">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.body}</ReactMarkdown>
            </div>
          ) : null}

          {post.post_type === 'link' && meta?.url ? (
            <a
              href={String(meta.url)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center gap-2 p-3 bg-bg rounded-lg border border-border hover:border-primary/50 transition-colors text-sm text-primary truncate"
            >
              {String(meta.url)}
            </a>
          ) : null}
        </div>

        <PostActions post={post} />
      </div>

      <CommentSection postId={postId} />
    </div>
  )
}
