self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

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

  registerRoute(
    ({ request, url }) => request.method === 'GET' && url.origin === self.location.origin,
    new StaleWhileRevalidate({
      cacheName: 'pc-app-shell',
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
      cacheName: 'pc-api-reads',
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
  const API_CACHE = 'pc-api-fallback-v1';
  const APP_CACHE = 'pc-app-fallback-v1';

  self.addEventListener('install', (event) => {
    event.waitUntil(self.skipWaiting());
  });

  self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
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
