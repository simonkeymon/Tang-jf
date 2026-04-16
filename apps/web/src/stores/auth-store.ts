import { create } from 'zustand';

import { api } from '../lib/api';

const AUTH_STORAGE_KEY = 'tang.auth';

export interface AuthUser {
  id: string;
  email: string;
  role?: string;
}

type Credentials = {
  email: string;
  password: string;
};

type AuthSnapshot = {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
};

interface AuthState extends AuthSnapshot {
  isAuthenticated: boolean;
  isHydrated: boolean;
  initialize: () => Promise<void>;
  login: (payload: Credentials) => Promise<void>;
  register: (payload: Credentials) => Promise<void>;
  refresh: () => Promise<boolean>;
  logout: () => void;
}

const EMPTY_AUTH_STATE: AuthSnapshot = {
  accessToken: null,
  refreshToken: null,
  user: null,
};

function readStoredAuth(): AuthSnapshot {
  if (typeof window === 'undefined') {
    return EMPTY_AUTH_STATE;
  }

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return EMPTY_AUTH_STATE;
    }

    const parsed = JSON.parse(raw) as Partial<AuthSnapshot>;
    return {
      accessToken: typeof parsed.accessToken === 'string' ? parsed.accessToken : null,
      refreshToken: typeof parsed.refreshToken === 'string' ? parsed.refreshToken : null,
      user:
        parsed.user &&
        typeof parsed.user === 'object' &&
        typeof parsed.user.id === 'string' &&
        typeof parsed.user.email === 'string'
          ? {
              id: parsed.user.id,
              email: parsed.user.email,
              role: typeof parsed.user.role === 'string' ? parsed.user.role : undefined,
            }
          : null,
    };
  } catch {
    return EMPTY_AUTH_STATE;
  }
}

function persistAuth(snapshot: AuthSnapshot) {
  if (typeof window === 'undefined') {
    return;
  }

  if (!snapshot.accessToken || !snapshot.refreshToken || !snapshot.user) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(snapshot));
}

function toAuthenticatedState(snapshot: AuthSnapshot) {
  return {
    ...snapshot,
    isAuthenticated: Boolean(snapshot.accessToken && snapshot.refreshToken && snapshot.user),
    isHydrated: true,
  };
}

export const authStore = create<AuthState>((set, get) => ({
  ...EMPTY_AUTH_STATE,
  isAuthenticated: false,
  isHydrated: false,

  async initialize() {
    if (get().isHydrated) {
      return;
    }

    const storedAuth = readStoredAuth();

    if (!storedAuth.accessToken || !storedAuth.refreshToken || !storedAuth.user) {
      set({ ...EMPTY_AUTH_STATE, isAuthenticated: false, isHydrated: true });
      return;
    }

    set(toAuthenticatedState(storedAuth));

    try {
      const response = await api.get('/auth/me');
      const nextSnapshot: AuthSnapshot = {
        accessToken: get().accessToken,
        refreshToken: get().refreshToken,
        user: response.data.user,
      };
      set(toAuthenticatedState(nextSnapshot));
      persistAuth(nextSnapshot);
    } catch {
      const refreshed = await get().refresh();
      if (!refreshed) {
        get().logout();
      }
    }
  },

  async login(payload) {
    const response = await api.post('/auth/login', payload);
    const nextSnapshot: AuthSnapshot = {
      accessToken: response.data.accessToken,
      refreshToken: response.data.refreshToken,
      user: response.data.user,
    };

    set(toAuthenticatedState(nextSnapshot));
    persistAuth(nextSnapshot);
  },

  async register(payload) {
    const response = await api.post('/auth/register', payload);
    const nextSnapshot: AuthSnapshot = {
      accessToken: response.data.accessToken,
      refreshToken: response.data.refreshToken,
      user: response.data.user,
    };

    set(toAuthenticatedState(nextSnapshot));
    persistAuth(nextSnapshot);
  },

  async refresh() {
    const refreshToken = get().refreshToken;
    if (!refreshToken) {
      return false;
    }

    try {
      const response = await api.post('/auth/refresh', { refreshToken });
      const nextSnapshot: AuthSnapshot = {
        accessToken: response.data.accessToken,
        refreshToken: response.data.refreshToken ?? refreshToken,
        user: response.data.user ?? get().user,
      };

      set(toAuthenticatedState(nextSnapshot));
      persistAuth(nextSnapshot);
      return true;
    } catch {
      set({ ...EMPTY_AUTH_STATE, isAuthenticated: false, isHydrated: true });
      persistAuth(EMPTY_AUTH_STATE);
      return false;
    }
  },

  logout() {
    const refreshToken = get().refreshToken;
    if (refreshToken) {
      void api.post('/auth/logout', { refreshToken }).catch(() => undefined);
    }

    set({ ...EMPTY_AUTH_STATE, isAuthenticated: false, isHydrated: true });
    persistAuth(EMPTY_AUTH_STATE);
  },
}));

export function useAuthStore() {
  return authStore();
}
