import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { User } from '@/types'
import api from '@/lib/api'

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isLoading: boolean
  isAuthenticated: boolean
}

interface AuthActions {
  setAuth: (user: User, accessToken: string, refreshToken: string) => void
  setAccessToken: (token: string) => void
  logout: () => void
  clearAuth: () => void
  refreshAccessToken: () => Promise<string | null>
  setLoading: (loading: boolean) => void
}

type AuthStore = AuthState & AuthActions

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
      isAuthenticated: false,

      setAuth: (user, accessToken, refreshToken) => {
        set({ user, accessToken, refreshToken, isAuthenticated: true, isLoading: false })
      },

      setAccessToken: (token) => {
        set({ accessToken: token })
      },

      logout: async () => {
        const { accessToken } = get()
        if (accessToken) {
          try {
            await api.post('/auth/logout')
          } catch {
            // ignore error during logout
          }
        }
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false })
      },

      clearAuth: () => {
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false })
      },

      refreshAccessToken: async () => {
        const { refreshToken } = get()
        if (!refreshToken) return null

        try {
          const { data } = await api.post('/auth/refresh', { refreshToken })
          const newToken = data.data?.accessToken ?? data.accessToken
          set({ accessToken: newToken })
          return newToken
        } catch {
          set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false })
          return null
        }
      },

      setLoading: (loading) => set({ isLoading: loading })
    }),
    {
      name: 'pharmaconnect-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user
          ? {
              id: state.user.id,
              email: state.user.email,
              firstName: state.user.firstName,
              lastName: state.user.lastName,
              role: state.user.role,
              pharmacyId: state.user.pharmacyId,
              isActive: state.user.isActive,
              createdAt: state.user.createdAt,
              updatedAt: state.user.updatedAt
            }
          : null,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
)
