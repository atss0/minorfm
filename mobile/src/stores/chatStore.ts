import {create} from 'zustand';

interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  user: {username: string; avatar_url: string};
  body: string;
  createdAt: string;
}

interface ChatState {
  messages: ChatMessage[];
  broadcastRoomId: string | null;
  isConnected: boolean;
  addMessage: (message: ChatMessage) => void;
  setMessages: (messages: ChatMessage[]) => void;
  setRoomId: (roomId: string) => void;
  setConnected: (isConnected: boolean) => void;
  reset: () => void;
}

export const useChatStore = create<ChatState>(set => ({
  messages: [],
  broadcastRoomId: null,
  isConnected: false,
  addMessage: message =>
    set(state => ({messages: [...state.messages, message]})),
  setMessages: messages => set({messages}),
  setRoomId: broadcastRoomId => set({broadcastRoomId}),
  setConnected: isConnected => set({isConnected}),
  reset: () => set({messages: [], broadcastRoomId: null, isConnected: false}),
}));
