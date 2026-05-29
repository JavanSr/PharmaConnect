import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';

interface ImpersonationInfo {
  ownerName: string;
  pharmacyName: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isImpersonating: boolean;
  impersonationInfo: ImpersonationInfo | null;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  updateUser: (user: Partial<User>) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setImpersonation: (token: string, info: ImpersonationInfo) => void;
  clearAuth: () => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      isImpersonating: false,
      impersonationInfo: null,

      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken, isAuthenticated: true, isLoading: false, isImpersonating: false, impersonationInfo: null }),

      updateUser: (partial) =>
        set((s) => ({ user: s.user ? { ...s.user, ...partial } : s.user })),

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),

      setImpersonation: (token, info) =>
        set({ accessToken: token, refreshToken: null, isAuthenticated: true, isImpersonating: true, impersonationInfo: info }),

      clearAuth: () =>
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false, isImpersonating: false, impersonationInfo: null }),

      logout: () =>
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false, isImpersonating: false, impersonationInfo: null }),

      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: 'pc-auth',
      partialize: (s) => ({
        user: s.user,
        accessToken: s.accessToken,
        refreshToken: s.refreshToken,
        isAuthenticated: s.isAuthenticated,
        // Never persist impersonation state — each tab starts fresh
      }),
    },
  ),
);
