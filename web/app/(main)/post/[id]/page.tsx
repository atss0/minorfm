import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import PostDetailView from '@/components/post/PostDetailView'

interface Props {
  params: Promise<{ id: string }>
}

async function fetchPost(id: string) {
  try {
    const apiUrl = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'
    const res = await fetch(`${apiUrl}/api/posts/${id}`, { next: { revalidate: 60 } })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const post = await fetchPost(id)
  if (!post) return { title: 'Gönderi — MINOR.fm' }
  const description = post.body ? (post.body as string).slice(0, 160).replace(/[#*`>\n]/g, ' ').trim() : undefined
  return {
    title: `${post.title} — MINOR.fm`,
    description,
    openGraph: {
      title: post.title,
      description,
      type: 'article',
    },
  }
}

export default async function PostPage({ params }: Props) {
  const { id } = await params
  const post = await fetchPost(id)
  if (!post) notFound()
  return <PostDetailView postId={id} />
}
