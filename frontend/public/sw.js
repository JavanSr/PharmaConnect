self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

const CACHE_VERSION = '20260429-registration-api-fix';
const APP_CACHE = `pc-app-shell-${CACHE_VERSION}`;
const API_READ_CACHE = `pc-api-reads-${CACHE_VERSION}`;
const LEGACY_CACHES = ['pc-app-shell', 'pc-api-reads', 'pc-api-fallback-v1', 'pc-app-fallback-v1'];

async function clearOldCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames
      .filter((name) =>
        LEGACY_CACHES.includes(name) ||
        ((name.startsWith('pc-app-shell-') || name.startsWith('pc-api-reads-')) &&
          name !== APP_CACHE &&
          name !== API_READ_CACHE),
      )
      .map((name) => caches.delete(name)),
  );
}

try {
  importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');
} catch (error) {
  console.warn('Workbox failed to load, falling back to a basic service worker.', error);
}

if (self.workbox) {
  self.workbox.setConfig({ debug: false });
  self.workbox.core.skipWaiting();
  self.workbox.core.clientsClaim();

  const { registerRoute } = self.workbox.routing;
  const { NetworkFirst, StaleWhileRevalidate, NetworkOnly } = self.workbox.strategies;
  const { ExpirationPlugin } = self.workbox.expiration;
  const { BackgroundSyncPlugin } = self.workbox.backgroundSync;

  self.addEventListener('activate', (event) => {
    event.waitUntil(clearOldCaches());
  });

  registerRoute(
    ({ request }) => request.mode === 'navigate',
    new NetworkFirst({
      cacheName: APP_CACHE,
      networkTimeoutSeconds: 4,
      plugins: [
        new ExpirationPlugin({
          maxEntries: 20,
          maxAgeSeconds: 24 * 60 * 60,
        }),
      ],
    }),
  );

  registerRoute(
    ({ request, url }) => request.method === 'GET' && request.mode !== 'navigate' && url.origin === self.location.origin,
    new StaleWhileRevalidate({
      cacheName: APP_CACHE,
      plugins: [
        new ExpirationPlugin({
          maxEntries: 80,
          maxAgeSeconds: 7 * 24 * 60 * 60,
        }),
      ],
    }),
  );

  registerRoute(
    ({ request, url }) => request.method === 'GET' && url.pathname.startsWith('/api/'),
    new NetworkFirst({
      cacheName: API_READ_CACHE,
      networkTimeoutSeconds: 5,
      plugins: [
        new ExpirationPlugin({
          maxEntries: 120,
          maxAgeSeconds: 24 * 60 * 60,
        }),
      ],
    }),
  );

  ['POST', 'PUT', 'PATCH', 'DELETE'].forEach((method) => {
    registerRoute(
      ({ request, url }) => request.method === method && url.pathname.startsWith('/api/'),
      new NetworkOnly({
        plugins: [
          new BackgroundSyncPlugin(`pc-write-queue-${method.toLowerCase()}`, {
            maxRetentionTime: 24 * 60,
          }),
        ],
      }),
      method,
    );
  });
} else {
  const API_CACHE = API_READ_CACHE;

  self.addEventListener('install', (event) => {
    event.waitUntil(self.skipWaiting());
  });

  self.addEventListener('activate', (event) => {
    event.waitUntil(Promise.all([clearOldCaches(), self.clients.claim()]));
  });

  self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET') {
      return;
    }

    const url = new URL(request.url);
    const cacheName = url.pathname.startsWith('/api/') ? API_CACHE : APP_CACHE;

    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(cacheName).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) {
            return cached;
          }

          throw new Error('Network unavailable and no cached response found.');
        }),
    );
  });
}
