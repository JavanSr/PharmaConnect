import { clientsClaim, skipWaiting } from 'workbox-core';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

const CACHE_VERSION = '20260512-bundled';
const APP_CACHE = `pc-app-shell-${CACHE_VERSION}`;
const API_READ_CACHE = `pc-api-reads-${CACHE_VERSION}`;

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data?.type === 'GET_SYNC_STATUS') broadcastSyncStatus({ state: 'READY' });
});

async function clearOldCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames
      .filter(
        (name) =>
          (name.startsWith('pc-app-shell-') || name.startsWith('pc-api-reads-')) &&
          name !== APP_CACHE &&
          name !== API_READ_CACHE,
      )
      .map((name) => caches.delete(name)),
  );
}

async function broadcastSyncStatus(detail) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
  clients.forEach((client) => {
    client.postMessage({ type: 'PC_SYNC_STATUS', ...detail, timestamp: new Date().toISOString() });
  });
}

skipWaiting();
clientsClaim();

self.addEventListener('activate', (event) => {
  event.waitUntil(Promise.all([clearOldCaches(), broadcastSyncStatus({ state: 'ACTIVE' })]));
});

// App shell — SPA navigation
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({
    cacheName: APP_CACHE,
    networkTimeoutSeconds: 4,
    plugins: [new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 24 * 60 * 60 })],
  }),
);

// Static assets (JS chunks, CSS, fonts, images)
registerRoute(
  ({ request, url }) =>
    request.method === 'GET' &&
    url.origin === self.location.origin &&
    !url.pathname.startsWith('/api/'),
  new StaleWhileRevalidate({
    cacheName: APP_CACHE,
    plugins: [new ExpirationPlugin({ maxEntries: 80, maxAgeSeconds: 24 * 60 * 60 })],
  }),
);

// API GET requests — 7 days
registerRoute(
  ({ request, url }) => request.method === 'GET' && url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: API_READ_CACHE,
    networkTimeoutSeconds: 5,
    plugins: [new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 7 * 24 * 60 * 60 })],
  }),
);

// Write operations — pass through, broadcast failure to app layer
['POST', 'PUT', 'PATCH', 'DELETE'].forEach((method) => {
  registerRoute(
    ({ request, url }) =>
      request.method === method &&
      url.origin === self.location.origin &&
      url.pathname.startsWith('/api/'),
    async ({ event }) => {
      try {
        const response = await fetch(event.request.clone());
        await broadcastSyncStatus({ state: 'WRITE_PASSTHROUGH', method });
        return response;
      } catch {
        await broadcastSyncStatus({
          state: 'WRITE_FAILED',
          method,
          message: 'Network write failed. The app-level IndexedDB queue handles offline mutations.',
        });
        throw new Error('Network write failed');
      }
    },
    method,
  );
});
