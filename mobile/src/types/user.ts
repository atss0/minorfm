export type UserRole = 'user' | 'moderator' | 'admin';

export interface User {
  id: string;
  username: string;
  email: string;
  avatar_url: string;
  bio: string;
  role: UserRole;
  created_at: string;
}
