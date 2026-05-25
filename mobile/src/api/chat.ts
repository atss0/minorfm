import {apiClient} from './client';

export const chatApi = {
  getRooms: () => apiClient.get('/chat/rooms'),
  getMessages: (roomId: string, before?: string) =>
    apiClient.get(`/chat/rooms/${roomId}/messages`, {params: {before}}),
  createRoom: (data: {name?: string; type: 'dm' | 'group'; memberIds: string[]}) =>
    apiClient.post('/chat/rooms', data),
};
