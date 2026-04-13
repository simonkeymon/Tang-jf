import { create } from 'zustand';

import { api } from '../lib/api';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (payload: { email: string; password: string }) => Promise<void>;
  register: (payload: { email: string; password: string }) => Promise<void>;
  refresh: () => Promise<boolean>;
  logout: () => void;
}

export const authStore = create<AuthState>((set, get) => ({
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,

  async login(payload) {
    const res = await api.post('/auth/login', payload);
    set({
      accessToken: res.data.accessToken,
      refreshToken: res.data.refreshToken,
      isAuthenticated: true,
    });
  },

  async register(payload) {
    const res = await api.post('/auth/register', payload);
    set({
      accessToken: res.data.accessToken,
      refreshToken: res.data.refreshToken,
      isAuthenticated: true,
    });
  },

  async refresh() {
    const refreshToken = get().refreshToken;
    if (!refreshToken) {
      return false;
    }

    try {
      const res = await api.post('/auth/refresh', { refreshToken });
      set({
        accessToken: res.data.accessToken,
        refreshToken: res.data.refreshToken ?? refreshToken,
        isAuthenticated: true,
      });
      return true;
    } catch {
      set({ accessToken: null, refreshToken: null, isAuthenticated: false });
      return false;
    }
  },

  logout() {
    set({ accessToken: null, refreshToken: null, isAuthenticated: false });
  },
}));

export function useAuthStore() {
  return authStore();
}
