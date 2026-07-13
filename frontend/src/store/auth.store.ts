'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types/auth.types';
import { config } from '@/config';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,

      setAuth: (user, token) => {
        localStorage.setItem(config.auth.accessTokenKey, token);
        set({ user, accessToken: token, isAuthenticated: true });
      },

      clearAuth: () => {
        localStorage.removeItem(config.auth.accessTokenKey);
        localStorage.removeItem(config.auth.userKey);
        set({ user: null, accessToken: null, isAuthenticated: false });
      },
    }),
    {
      name: config.auth.userKey,
      // Do not persist isAuthenticated — derive it from user !== null on rehydration
      // This prevents stale auth state after token expiry
      partialize: (state) => ({ user: state.user }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isAuthenticated = state.user !== null;
        }
      },
    }
  )
);
