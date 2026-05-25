import {apiClient} from './client';

export const radioApi = {
  getCurrent: () => apiClient.get('/radio/current'),
  getQueue: () => apiClient.get('/radio/queue'),
};
