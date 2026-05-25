import {apiClient} from './client';

export const notificationsApi = {
  getList: () => apiClient.get('/notifications'),
  markRead: (id: string) => apiClient.put(`/notifications/${id}/read`),
  markAllRead: () => apiClient.put('/notifications/read-all'),
};
