import type {User} from './user';

export interface ChatRoom {
  id: string;
  name: string;
  slug: string;
  type: 'global' | 'category' | 'dm' | 'group';
  created_at: string;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  user_id: string;
  user: User;
  body: string;
  created_at: string;
}

// Yayın chati — mevcut radyo yayınına bağlı oda
export interface BroadcastChat {
  room: ChatRoom;
  messages: ChatMessage[];
  isConnected: boolean;
}

// DM odası — 1:1 veya grup
export interface DMRoom {
  id: string;
  name: string;
  type: 'dm' | 'group';
  members: User[];
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
  created_at: string;
}

export interface DMMessage {
  id: string;
  room_id: string;
  user_id: string;
  user: User;
  body: string;
  created_at: string;
}
