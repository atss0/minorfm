import axios, {AxiosError} from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useAuthStore} from '../stores/authStore';

const BASE_URL = 'https://api.minor.fm/api';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {'Content-Type': 'application/json'},
});

// Request interceptor: access token'ı header'a ekle
apiClient.interceptors.request.use(config => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: 401 → refresh token dene → başarısız → logout
let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(err: unknown, token: string | null) {
  pendingQueue.forEach(p => (err ? p.reject(err) : p.resolve(token!)));
  pendingQueue = [];
}

apiClient.interceptors.response.use(
  res => res,
  async (error: AxiosError) => {
    const original = error.config as typeof error.config & {_retry?: boolean};

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({
          resolve: token => {
            original.headers!.Authorization = `Bearer ${token}`;
            resolve(apiClient(original));
          },
          reject,
        });
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = useAuthStore.getState().refreshToken;
      if (!refreshToken) throw new Error('no refresh token');

      const {data} = await axios.post(`${BASE_URL}/auth/refresh`, {
        refresh_token: refreshToken,
      });

      const {access_token, refresh_token: newRefresh} = data;

      // Store güncelle + AsyncStorage'a yaz
      const {user} = useAuthStore.getState();
      useAuthStore.getState().setAuth(user!, access_token, newRefresh);
      await AsyncStorage.setItem('accessToken', access_token);
      await AsyncStorage.setItem('refreshToken', newRefresh);

      apiClient.defaults.headers.common.Authorization = `Bearer ${access_token}`;
      processQueue(null, access_token);

      original.headers!.Authorization = `Bearer ${access_token}`;
      return apiClient(original);
    } catch (err) {
      processQueue(err, null);
      useAuthStore.getState().logout();
      await AsyncStorage.removeItem('accessToken');
      await AsyncStorage.removeItem('refreshToken');
      return Promise.reject(err);
    } finally {
      isRefreshing = false;
    }
  },
);
