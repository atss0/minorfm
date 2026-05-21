import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import type { Post } from '@/types'

interface LinkMeta {
  url?: string
  link_title?: string
  link_description?: string
  link_domain?: string
  link_image?: string
}

export default function PostCardLink({ post }: { post: Post }) {
  const meta = post.metadata as unknown as LinkMeta

  return (
    <div className="space-y-2">
      <Link href={`/post/${post.id}`} className="group">
        <h2 className="text-base font-bold text-white group-hover:text-primary transition-colors leading-snug mb-2">
          {post.title}
        </h2>
      </Link>

      {meta.url && (
        <a
          href={meta.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex gap-3 p-3 rounded-lg border border-border hover:border-muted/50 bg-bg transition-colors group"
        >
          <div className="flex-1 min-w-0 space-y-1">
            {meta.link_title && (
              <p className="text-sm font-semibold text-white line-clamp-1 group-hover:text-primary transition-colors">
                {meta.link_title}
              </p>
            )}
            {meta.link_description && (
              <p className="text-xs text-muted line-clamp-2">{meta.link_description}</p>
            )}
            {meta.link_domain && (
              <div className="flex items-center gap-1 text-xs text-muted/70">
                <ExternalLink size={10} />
                <span>{meta.link_domain}</span>
              </div>
            )}
          </div>
        </a>
      )}
    </div>
  )
}
