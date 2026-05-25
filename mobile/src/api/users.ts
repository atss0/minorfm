import {apiClient} from './client';

export const usersApi = {
  getMe: () => apiClient.get('/me'),
  getProfile: (username: string) => apiClient.get(`/users/${username}`),
  updateMe: (data: Record<string, unknown>) => apiClient.put('/users/me', data),
  updatePassword: (data: {current_password: string; new_password: string}) =>
    apiClient.put('/users/me/password', data),
  follow: (id: string) => apiClient.post(`/users/${id}/follow`),
  unfollow: (id: string) => apiClient.delete(`/users/${id}/follow`),
  getFollowers: (id: string) => apiClient.get(`/users/${id}/followers`),
  getFollowing: (id: string) => apiClient.get(`/users/${id}/following`),
  getOnline: () => apiClient.get('/users/online'),
  updateDeviceToken: (token: string) => apiClient.put('/users/me', {device_token: token}),
  superlike: (id: string) => apiClient.post(`/users/${id}/superlike`),
};
