import axios from 'axios';
import { useAuthStore } from '@/stores/authStore';
import { useConnectivityStore } from '@/stores/connectivityStore';

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
export const TRIAL_EXPIRED_EVENT = 'pc-trial-expired';
export const GRACE_ACCESS_EVENT = 'pc-grace-access';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
});

// Block write operations during impersonation sessions
api.interceptors.request.use((config) => {
  const { isImpersonating } = useAuthStore.getState();
  const method = (config.method ?? 'get').toUpperCase();
  if (isImpersonating && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const url = config.url ?? '';
    const isReadOnlyException = url.includes('/auth/logout');
    if (!isReadOnlyException) {
      return Promise.reject(Object.assign(new Error('IMPERSONATION_WRITE_BLOCKED'), { code: 'IMPERSONATION_WRITE_BLOCKED' }));
    }
  }
  return config;
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

// ── Offline write queue ──────────────────────────────────────────────────────

const WRITE_METHODS = new Set(['post', 'put', 'patch', 'delete']);
const SKIP_OFFLINE_QUEUE_URLS = new RegExp(
  '^(/api/v1)?/(auth/|health$|inventory/conflicts|dispensing/checkout)',
);

function deriveOfflineMeta(url: string, offlineMeta?: { feature?: string; entityType?: string; entityId?: string }) {
  const path = url.replace(/^\/api\/v1/, '').replace(/^\/+/, '');
  const segments = path.split('/').filter(Boolean);
  const feature = offlineMeta?.feature ?? segments[0] ?? 'unknown';
  const entityType = offlineMeta?.entityType ?? segments.slice(0, 2).join('_').toUpperCase();
  const entityId = offlineMeta?.entityId ?? `offline-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  return { feature, entityType, entityId };
}

// Extend AxiosRequestConfig with optional offline metadata
declare module 'axios' {
  interface AxiosRequestConfig {
    _offlineMeta?: { feature?: string; entityType?: string; entityId?: string };
    _offlineQueued?: boolean;
  }
  interface InternalAxiosRequestConfig {
    _offlineMeta?: { feature?: string; entityType?: string; entityId?: string };
    _offlineQueued?: boolean;
    _retry?: boolean;
  }
}

// ── 401 refresh queue ────────────────────────────────────────────────────────

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

    if (error.response?.status === 402 && error.response?.data?.error === 'TRIAL_EXPIRED') {
      window.dispatchEvent(new CustomEvent(TRIAL_EXPIRED_EVENT));
    }

    if (error.response?.status === 402 && error.response?.data?.error === 'GRACE_SINGLE_USER_LIMIT') {
      window.dispatchEvent(new CustomEvent(GRACE_ACCESS_EVENT));
    }

    // Auto-queue write operations that fail due to network unavailability
    if (
      !error.response &&
      original &&
      !original._offlineQueued &&
      WRITE_METHODS.has((original.method ?? '').toLowerCase()) &&
      !SKIP_OFFLINE_QUEUE_URLS.test(original.url ?? '')
    ) {
      original._offlineQueued = true;
      try {
        const { enqueueOfflineWrite } = await import('@/lib/offlineSync');
        const meta = deriveOfflineMeta(original.url ?? '', original._offlineMeta);
        let body: Record<string, unknown> = {};
        try {
          body = typeof original.data === 'string'
            ? JSON.parse(original.data)
            : (original.data ?? {});
        } catch { /* keep empty body */ }

        await enqueueOfflineWrite({
          feature: meta.feature,
          entityType: meta.entityType,
          entityId: meta.entityId,
          url: original.url ?? '',
          method: (original.method?.toUpperCase() ?? 'POST') as 'POST' | 'PUT' | 'PATCH' | 'DELETE',
          body,
        });

        useConnectivityStore.getState().incrementPending();

        try {
          const { useNotificationStore } = await import('@/stores/notificationStore');
          useNotificationStore.getState().toast.info(
            'Saved offline — will sync when back online.',
            5000,
          );
        } catch { /* notification is best-effort */ }

        const queuedErr = Object.assign(new Error('OFFLINE_QUEUED'), { code: 'OFFLINE_QUEUED', isOfflineQueued: true });
        return Promise.reject(queuedErr);
      } catch (queueErr: unknown) {
        const e = queueErr as { isOfflineQueued?: boolean };
        if (e?.isOfflineQueued) return Promise.reject(queueErr);
        // IndexedDB unavailable — fall through to original error
      }
    }

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
