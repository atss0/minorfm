import {apiClient} from './client';

export const dmApi = {
  getRooms: () => apiClient.get('/dm/rooms'),
  createRoom: (memberIds: string[]) =>
    apiClient.post('/dm/rooms', {member_ids: memberIds}),
  getMessages: (roomId: string, before?: string) =>
    apiClient.get(`/chat/rooms/${roomId}/messages`, {params: {before}}),
};
