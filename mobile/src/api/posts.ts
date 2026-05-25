import {apiClient} from './client';

export const postsApi = {
  getFeed: (params: {page?: number; sort?: 'new' | 'top' | 'curated'; category?: string}) =>
    apiClient.get('/posts', {params}),
  getPost: (id: string) => apiClient.get(`/posts/${id}`),
  createPost: (data: Record<string, unknown>) => apiClient.post('/posts', data),
  updatePost: (id: string, data: Record<string, unknown>) =>
    apiClient.put(`/posts/${id}`, data),
  deletePost: (id: string) => apiClient.delete(`/posts/${id}`),
  likePost: (id: string) => apiClient.post(`/posts/${id}/like`),
  bookmarkPost: (id: string) => apiClient.post(`/posts/${id}/bookmark`),
  getComments: (id: string) => apiClient.get(`/posts/${id}/comments`),
  createComment: (id: string, body: string, parentId?: string) =>
    apiClient.post(`/posts/${id}/comments`, {body, parent_id: parentId}),
  deleteComment: (postId: string, commentId: string) =>
    apiClient.delete(`/posts/${postId}/comments/${commentId}`),
  likeComment: (postId: string, commentId: string) =>
    apiClient.post(`/posts/${postId}/comments/${commentId}/like`),
};
