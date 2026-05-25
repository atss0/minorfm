import {apiClient} from './client';

export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post('/auth/login', {email, password}),
  register: (username: string, email: string, password: string, invite_code: string) =>
    apiClient.post('/auth/register', {username, email, password, invite_code}),
  refresh: (refreshToken: string) =>
    apiClient.post('/auth/refresh', {refresh_token: refreshToken}),
  logout: () => apiClient.post('/auth/logout'),
  forgotPassword: (email: string) =>
    apiClient.post('/auth/forgot-password', {email}),
  resetPassword: (token: string, password: string) =>
    apiClient.post('/auth/reset-password', {token, password}),
};
