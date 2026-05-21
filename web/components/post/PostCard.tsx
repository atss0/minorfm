import Link from 'next/link'
import Image from 'next/image'
import PostCardArticle from './PostCardArticle'
import PostCardEmbed from './PostCardEmbed'
import PostCardGallery from './PostCardGallery'
import PostCardPoll from './PostCardPoll'
import PostCardLink from './PostCardLink'
import PostActions from './PostActions'
import { relativeTime } from '@/lib/time'
import type { Post } from '@/types'

export default function PostCard({ post, priority }: { post: Post; priority?: boolean }) {
  return (
    <article className="bg-surface rounded-xl border border-border overflow-hidden">
      <div className="px-4 pt-3 pb-2 flex items-center gap-2.5">
        <Link href={`/profile/${post.user?.username}`} className="shrink-0">
          {post.user?.avatar_url ? (
            <Image
              src={post.user.avatar_url}
              alt={post.user.username}
              width={28}
              height={28}
              className="rounded-full object-cover"
              unoptimized
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-border flex items-center justify-center text-xs font-bold text-muted">
              {post.user?.username?.[0]?.toUpperCase() ?? '?'}
            </div>
          )}
        </Link>
        <div className="flex-1 min-w-0 flex items-center gap-2 text-xs text-muted">
          <Link href={`/profile/${post.user?.username}`} className="font-semibold text-white hover:text-primary transition-colors truncate">
            {post.user?.username ?? 'anonim'}
          </Link>
          {post.category && (
            <>
              <span>·</span>
              <Link
                href={`/category/${post.category.slug}`}
                className="text-primary hover:underline truncate"
              >
                {post.category.name}
              </Link>
            </>
          )}
          <span>·</span>
          <span className="shrink-0">{relativeTime(post.created_at)}</span>
        </div>
      </div>

      <div className="px-4 pb-3">
        {post.post_type === 'article' && <PostCardArticle post={post} priority={priority} />}
        {(post.post_type === 'embed' || post.post_type === 'video') && <PostCardEmbed post={post} />}
        {post.post_type === 'gallery' && <PostCardGallery post={post} />}
        {post.post_type === 'poll' && <PostCardPoll post={post} />}
        {post.post_type === 'link' && <PostCardLink post={post} />}
      </div>

      <PostActions post={post} />
    </article>
  )
}
