import {apiClient} from './client';

export const mediaApi = {
  uploadAvatar: (formData: FormData) =>
    apiClient.post('/media/avatar', formData, {
      headers: {'Content-Type': 'multipart/form-data'},
    }),
  uploadFile: (formData: FormData) =>
    apiClient.post('/media/upload', formData, {
      headers: {'Content-Type': 'multipart/form-data'},
    }),
};
