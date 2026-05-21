import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import PostCard from '@/components/post/PostCard'
import type { Post } from '@/types'

vi.mock('@/store/authStore', () => ({
  useAuthStore: () => ({ user: null }),
}))

// next/link and next/image stubs
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))
vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}))

const mockPost: Post = {
  id: '1',
  user_id: 'u1',
  user: { id: 'u1', username: 'testuser', email: 't@t.com', avatar_url: '', bio: '', role: 'user', created_at: '' },
  category_id: 1,
  category: { id: 1, name: 'Müzik', slug: 'muzik', icon: '🎵', description: '', order: 1 },
  title: 'Test Başlığı',
  body: 'Test içeriği',
  post_type: 'article',
  metadata: {},
  like_count: 5,
  comment_count: 2,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('PostCard', () => {
  it('renders the post title', () => {
    render(<PostCard post={mockPost} />, { wrapper: Wrapper })
    expect(screen.getByText('Test Başlığı')).toBeInTheDocument()
  })

  it('renders the author username', () => {
    render(<PostCard post={mockPost} />, { wrapper: Wrapper })
    expect(screen.getByText('testuser')).toBeInTheDocument()
  })

  it('renders the like count', () => {
    render(<PostCard post={mockPost} />, { wrapper: Wrapper })
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('renders the comment count', () => {
    render(<PostCard post={mockPost} />, { wrapper: Wrapper })
    expect(screen.getByText('2')).toBeInTheDocument()
  })
})
