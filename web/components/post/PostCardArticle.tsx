import Link from 'next/link'
import Image from 'next/image'
import type { Post } from '@/types'

interface ArticleMeta {
  cover_url?: string
}

export default function PostCardArticle({ post, priority }: { post: Post; priority?: boolean }) {
  const meta = post.metadata as unknown as ArticleMeta
  const cover = meta?.cover_url
  const preview = post.body?.slice(0, 200)

  return (
    <Link href={`/post/${post.id}`} className="block group">
      {cover && (
        <div className="relative w-full aspect-[4/5] sm:aspect-[3/4] max-h-[500px] rounded-lg overflow-hidden mb-3 bg-border">
          <Image
            src={cover}
            alt={post.title}
            fill
            className="object-cover group-hover:opacity-90 transition-opacity rounded-lg"
            unoptimized
            priority={priority}
          />
        </div>
      )}
      <h2 className="text-base font-bold text-white group-hover:text-primary transition-colors leading-snug mb-2">
        {post.title}
      </h2>
      {preview && (
        <p className="text-sm text-muted line-clamp-3 leading-relaxed">{preview}</p>
      )}
    </Link>
  )
}