import axios from 'axios';

import { authStore } from '../stores/auth-store';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3002/api';

export const api = axios.create({
  baseURL: apiBaseUrl,
});

api.interceptors.request.use((config) => {
  const token = authStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest?._retry) {
      originalRequest._retry = true;
      const refreshed = await authStore.getState().refresh();
      if (refreshed && authStore.getState().accessToken) {
        originalRequest.headers.Authorization = `Bearer ${authStore.getState().accessToken}`;
        return api(originalRequest);
      }
      authStore.getState().logout();
    }

    return Promise.reject(error);
  },
);
