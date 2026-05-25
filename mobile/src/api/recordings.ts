import {apiClient} from './client';

export const recordingsApi = {
  getList: (page = 1) => apiClient.get('/recordings', {params: {page}}),

  uploadAudio: (filePath: string, duration: number, title?: string) => {
    const formData = new FormData();
    formData.append('audio', {
      uri: filePath,
      type: 'audio/mp4',
      name: 'recording.mp4',
    } as unknown as Blob);
    formData.append('duration', String(Math.round(duration)));
    if (title) {
      formData.append('title', title);
    }
    return apiClient.post('/recordings', formData, {
      headers: {'Content-Type': 'multipart/form-data'},
    });
  },

  delete: (id: string) => apiClient.delete(`/recordings/${id}`),
};
