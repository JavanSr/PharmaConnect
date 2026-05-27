import { clientsClaim, skipWaiting } from 'workbox-core';
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

// VitePWA injects the complete list of hashed assets here.
// precacheAndRoute caches them on SW install so every page works offline
// even on first visit — and stale chunks from old deploys are cleaned up.
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

const CACHE_VERSION = '20260527-precache';
const APP_CACHE = `pc-app-shell-${CACHE_VERSION}`;
const API_READ_CACHE = `pc-api-reads-${CACHE_VERSION}`;
const FONT_CSS_CACHE = 'pc-google-fonts-css';
const FONT_FILE_CACHE = 'pc-google-fonts-files';

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data?.type === 'GET_SYNC_STATUS') broadcastSyncStatus({ state: 'READY' });
});

async function clearOldCaches() {
  const cacheNames = await caches.keys();
  const managed = new Set([APP_CACHE, API_READ_CACHE, FONT_CSS_CACHE, FONT_FILE_CACHE]);
  await Promise.all(
    cacheNames
      .filter(
        (name) =>
          (name.startsWith('pc-app-shell-') || name.startsWith('pc-api-reads-')) &&
          !managed.has(name),
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

// ── Google Fonts CSS (stylesheet declarations) ────────────────────────────────
// StaleWhileRevalidate: serve cached CSS instantly, refresh in background.
// This means DM Sans, DM Serif Display, and JetBrains Mono load immediately
// on repeat visits even with zero connectivity.
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new StaleWhileRevalidate({
    cacheName: FONT_CSS_CACHE,
    plugins: [new ExpirationPlugin({ maxEntries: 5, maxAgeSeconds: 365 * 24 * 60 * 60 })],
  }),
);

// ── Google Fonts binary files (woff2) ─────────────────────────────────────────
// CacheFirst: font binaries are content-addressed and never change for a given
// URL, so we cache them permanently and never hit the network again.
registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: FONT_FILE_CACHE,
    plugins: [new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 365 * 24 * 60 * 60 })],
  }),
);

// ── App shell — SPA navigation ────────────────────────────────────────────────
// Reduced timeout: 4s → 2s. With no internet, the user sees cached content
// after 2s instead of 4s. In a pharmacy without internet this matters a lot.
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({
    cacheName: APP_CACHE,
    networkTimeoutSeconds: 2,
    plugins: [new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 24 * 60 * 60 })],
  }),
);

// ── Static assets (JS chunks, CSS, local images) ─────────────────────────────
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

// ── API GET requests — 7-day cache ───────────────────────────────────────────
// Covers both same-origin (/api/...) and cross-origin Railway API URLs.
// The route matches on pathname so it works regardless of which origin the
// backend is deployed to (localhost proxy in dev, Railway URL in prod).
// Timeout reduced: 5s → 3s for faster offline fallback on API reads.
// Health endpoint is excluded so the heartbeat always tests real connectivity.
const isApiGet = ({ request, url }) =>
  request.method === 'GET' &&
  url.pathname.startsWith('/api/') &&
  !url.pathname.endsWith('/health');

const isFreshApiRead = ({ url }) =>
  url.pathname.includes('/inventory/products') ||
  url.pathname.includes('/inventory/batches') ||
  url.pathname.includes('/dispensing/checkout');

registerRoute(
  (args) => isApiGet(args) && isFreshApiRead(args),
  new NetworkFirst({
    cacheName: API_READ_CACHE,
    networkTimeoutSeconds: 3,
    plugins: [new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 7 * 24 * 60 * 60 })],
  }),
);

registerRoute(
  (args) => isApiGet(args) && !isFreshApiRead(args),
  new StaleWhileRevalidate({
    cacheName: API_READ_CACHE,
    plugins: [new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 7 * 24 * 60 * 60 })],
  }),
);

// ── Write operations — pass through, broadcast failure to app layer ───────────
// No origin check: in production the API is on a different domain (Railway),
// so we match on pathname only, same as the GET route above.
['POST', 'PUT', 'PATCH', 'DELETE'].forEach((method) => {
  registerRoute(
    ({ request, url }) =>
      request.method === method &&
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
