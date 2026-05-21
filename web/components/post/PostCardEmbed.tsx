'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Play } from 'lucide-react'
import type { Post } from '@/types'

interface EmbedMeta {
  url?: string
  embed_url?: string
  video_id?: string
}

function getVideoId(meta: EmbedMeta): string | null {
  if (meta.video_id) return meta.video_id
  const src = meta.embed_url ?? meta.url ?? ''
  const m = src.match(/(?:youtube\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([^?&/\s]+)/)
  return m?.[1] ?? null
}

export default function PostCardEmbed({ post }: { post: Post }) {
  // Videonun oynatılıp oynatılmadığını takip eden state
  const [isPlaying, setIsPlaying] = useState(false)
  
  const meta = post.metadata as unknown as EmbedMeta
  const videoId = getVideoId(meta)
  const thumbnail = videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null

  // Oynatıcı URL'sini oluşturuyoruz. Tıklandığında direkt başlaması için autoplay=1 ekliyoruz.
  const embedSrc = videoId 
    ? `https://www.youtube.com/embed/${videoId}?autoplay=1` 
    : meta.embed_url || meta.url

  return (
    <div className="space-y-2 mt-2">
      {/* Başlık hala detaya gidiyor, bu arama motorları ve kullanıcı alışkanlığı için iyi */}
      <Link href={`/post/${post.id}`} className="group block">
        <h2 className="text-[15px] font-bold text-white group-hover:text-primary transition-colors leading-snug">
          {post.title}
        </h2>
      </Link>

      <div 
        className="relative block w-max-720 overflow-hidden rounded-xl bg-border border border-border"
        style={{ aspectRatio: '16/9', maxHeight: 405 }}
      >
        {isPlaying && embedSrc ? (
          /* OYNATILIYORSA: YouTube Iframe'i yükle */
          <iframe
            src={embedSrc}
            title={post.title}
            className="absolute inset-0 w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          /* OYNATILMIYORSA: Kapak fotoğrafı ve Play butonu göster */
          <button
            type="button"
            onClick={() => setIsPlaying(true)}
            className="absolute inset-0 w-full h-full group cursor-pointer"
            aria-label="Videoyu oynat"
          >
            {thumbnail ? (
              <Image
                src={thumbnail}
                alt={post.title}
                fill
                className="object-cover group-hover:opacity-80 transition-opacity"
                unoptimized
              />
            ) : (
              <div className="absolute inset-0 bg-surface flex items-center justify-center">
                <Play size={32} className="text-muted" />
              </div>
            )}
            
            {/* Merkezdeki Play İkonu */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-black/70 flex items-center justify-center group-hover:bg-primary transition-colors shadow-lg backdrop-blur-sm">
                <Play size={24} className="text-white ml-1" fill="currentColor" />
              </div>
            </div>
          </button>
        )}
      </div>
    </div>
  )
}