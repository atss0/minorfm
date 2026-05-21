export interface User {
  id: string
  username: string
  email: string
  avatar_url: string
  bio: string
  role: 'user' | 'moderator' | 'admin'
  created_at: string
  post_count?: number
  follower_count?: number
  following_count?: number
  banned_at?: string
  ban_expires_at?: string
  ban_reason?: string
}

export interface Comment {
  id: string
  post_id: string
  user_id: string
  user: User
  parent_id?: string
  replies?: Comment[]
  body: string
  like_count: number
  created_at: string
}

export interface Category {
  id: number
  name: string
  slug: string
  icon: string
  description: string
  order: number
}

export type PostType = 'article' | 'poll' | 'video' | 'embed' | 'link' | 'gallery'

export interface Post {
  id: string
  user_id: string
  user: User
  category_id: number
  category: Category
  title: string
  body: string
  post_type: PostType
  metadata: Record<string, unknown>
  like_count: number
  comment_count: number
  pinned?: boolean
  pinned_at?: string
  created_at: string
  updated_at: string
}

export interface Track {
  id: string
  title: string
  artist: string
  cover_url: string
  stream_url: string
  duration: number
  order?: number
}

export interface ChatMessage {
  id: string
  room_id: string
  user_id: string
  username: string
  avatar_url: string
  body: string
  badge?: number
  created_at: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}
