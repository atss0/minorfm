import {apiClient} from './client';

export const radioApi = {
  getCurrent: () => apiClient.get('/radio/current'),
  getQueue: () => apiClient.get('/radio/queue'),
  superlike: () => apiClient.post('/radio/superlike'),
  getLiveStats: () => apiClient.get<{hearts: number; claps: number; listeners: number}>('/stream/stats/live'),
};
