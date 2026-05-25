import type {User} from './user';

export type PostType = 'article' | 'poll' | 'video' | 'embed' | 'link' | 'gallery';

export interface Post {
  id: string;
  user_id: string;
  user: User;
  category_id: number;
  title: string;
  body: string;
  post_type: PostType;
  metadata: Record<string, unknown> | null;
  like_count: number;
  comment_count: number;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  user: User;
  parent_id: string | null;
  body: string;
  like_count: number;
  created_at: string;
}
