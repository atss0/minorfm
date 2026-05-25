import type {User} from './user';

export interface Recording {
  id: string;
  user_id: string;
  user: User;
  audio_url: string;
  duration: number;
  title: string | null;
  created_at: string;
}
