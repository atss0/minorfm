import {create} from 'zustand';

interface DMRoom {
  id: string;
  name: string;
  type: 'dm' | 'group';
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

interface DMMessage {
  id: string;
  roomId: string;
  userId: string;
  user: {username: string; avatar_url: string};
  body: string;
  createdAt: string;
}

interface DMState {
  rooms: DMRoom[];
  activeRoomId: string | null;
  messages: DMMessage[];
  isConnected: boolean;
  setRooms: (rooms: DMRoom[]) => void;
  setActiveRoom: (roomId: string) => void;
  addMessage: (message: DMMessage) => void;
  setMessages: (messages: DMMessage[]) => void;
  setConnected: (isConnected: boolean) => void;
}

export const useDMStore = create<DMState>(set => ({
  rooms: [],
  activeRoomId: null,
  messages: [],
  isConnected: false,
  setRooms: rooms => set({rooms}),
  setActiveRoom: activeRoomId => set({activeRoomId, messages: []}),
  addMessage: message =>
    set(state => ({messages: [...state.messages, message]})),
  setMessages: messages => set({messages}),
  setConnected: isConnected => set({isConnected}),
}));
