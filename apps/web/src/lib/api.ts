import axios from 'axios';

import { authStore } from '../stores/auth-store';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3002/api';
const apiOrigin = getApiOrigin(apiBaseUrl);

export const api = axios.create({
  baseURL: apiBaseUrl,
});

export function resolveApiAssetUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }

  return new URL(pathOrUrl, apiOrigin).toString();
}

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
    const requestUrl =
      typeof originalRequest?.url === 'string' ? originalRequest.url : String(originalRequest?.url);
    const shouldAttemptRefresh =
      error.response?.status === 401 &&
      !originalRequest?._retry &&
      !requestUrl.includes('/auth/refresh');

    if (shouldAttemptRefresh) {
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

function getApiOrigin(baseUrl: string): string {
  try {
    return new URL(baseUrl).origin;
  } catch {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }

    return 'http://localhost:3002';
  }
}
