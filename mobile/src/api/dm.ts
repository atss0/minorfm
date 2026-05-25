import {apiClient} from './client';

export const dmApi = {
  getRooms: () => apiClient.get('/chat/rooms', {params: {type: 'dm'}}),
  createRoom: (memberIds: string[], name?: string) =>
    apiClient.post('/chat/rooms', {
      type: memberIds.length === 1 ? 'dm' : 'group',
      member_ids: memberIds,
      name,
    }),
  getMessages: (roomId: string, before?: string) =>
    apiClient.get(`/chat/rooms/${roomId}/messages`, {params: {before}}),
};
