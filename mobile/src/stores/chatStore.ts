import {create} from 'zustand';

interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  user: {username: string; avatar_url: string};
  body: string;
  createdAt: string;
}

export interface HeartTapEvent {
  userId: string;
  username: string;
  avatarUrl: string;
  effect: 'heart' | 'clap';
  seq: number;
}

export interface OnlineUser {
  id: string;
  username: string;
  avatar_url?: string | null;
}

interface ChatState {
  messages: ChatMessage[];
  broadcastRoomId: string | null;
  isConnected: boolean;
  lastHeartTap: HeartTapEvent | null;
  _heartTapSeq: number;
  onlineUsers: OnlineUser[];
  addMessage: (message: ChatMessage) => void;
  setMessages: (messages: ChatMessage[]) => void;
  setRoomId: (roomId: string) => void;
  setConnected: (isConnected: boolean) => void;
  addHeartTap: (event: Omit<HeartTapEvent, 'seq'>) => void;
  setOnlineUsers: (users: OnlineUser[]) => void;
  upsertOnlineUser: (user: OnlineUser) => void;
  removeOnlineUser: (userId: string) => void;
  reset: () => void;
}

export const useChatStore = create<ChatState>(set => ({
  messages: [],
  broadcastRoomId: null,
  isConnected: false,
  lastHeartTap: null,
  _heartTapSeq: 0,
  onlineUsers: [],
  addMessage: message =>
    set(state =>
      state.messages.some(m => m.id === message.id)
        ? state
        : {messages: [...state.messages, message]},
    ),
  setMessages: messages => set({messages}),
  setRoomId: broadcastRoomId => set({broadcastRoomId}),
  setConnected: isConnected => set({isConnected}),
  addHeartTap: event =>
    set(state => ({
      lastHeartTap: {...event, seq: state._heartTapSeq + 1},
      _heartTapSeq: state._heartTapSeq + 1,
    })),
  setOnlineUsers: users => set({onlineUsers: users}),
  upsertOnlineUser: user =>
    set(state => {
      const exists = state.onlineUsers.some(u => u.id === user.id);
      if (exists) return state;
      return {onlineUsers: [...state.onlineUsers, user]};
    }),
  removeOnlineUser: userId =>
    set(state => ({
      onlineUsers: state.onlineUsers.filter(u => u.id !== userId),
    })),
  reset: () =>
    set({
      messages: [],
      broadcastRoomId: null,
      isConnected: false,
      lastHeartTap: null,
      _heartTapSeq: 0,
      onlineUsers: [],
    }),
}));
