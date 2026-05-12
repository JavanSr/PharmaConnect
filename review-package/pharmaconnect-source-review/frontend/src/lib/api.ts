import axios from 'axios';
import { useAuthStore } from '@/stores/authStore';

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '0.0.0.0', '::1']);

function isLoopbackApiUrl(value: string): boolean {
  try {
    const url = new URL(value, window.location.origin);
    return LOOPBACK_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

function resolveApiBaseUrl(): string {
  const configured = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').trim();

  if (configured && !(import.meta.env.PROD && isLoopbackApiUrl(configured))) {
    return configured;
  }

  if (configured && import.meta.env.PROD) {
    console.error(
      'Ignoring loopback VITE_API_URL in production. Set VITE_API_URL to the deployed backend URL ending in /api/v1.',
    );
  }

  return '/api/v1';
}

export const API_BASE_URL = resolveApiBaseUrl();
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/v1\/?$/, '');

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

// Handle 401 — refresh or logout
let isRefreshing = false;
let queue: Array<{ resolve: (t: string) => void; reject: (e: unknown) => void }> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  queue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)));
  queue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          queue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }

      original._retry = true;
      isRefreshing = true;

      const { refreshToken, setTokens, logout } = useAuthStore.getState();

      if (!refreshToken) {
        logout();
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
        const { accessToken: newAccess, refreshToken: newRefresh } = data.data;
        setTokens(newAccess, newRefresh);
        processQueue(null, newAccess);
        original.headers.Authorization = `Bearer ${newAccess}`;
        return api(original);
      } catch (refreshError) {
        processQueue(refreshError, null);
        logout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);
