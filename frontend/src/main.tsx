import React from 'react';
import ReactDOM from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import { App } from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <Analytics />
  </React.StrictMode>,
);

// When a dynamic import fails (stale SW serving old chunk hash after a deploy),
// Vite fires this event. Hard-reload to pick up the fresh assets.
window.addEventListener('vite:preloadError', () => {
  window.location.reload();
});

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      // When a new SW finishes installing, check if it's waiting (update available).
      // If there's already a controller, this is an update — not the first install.
      // Dispatch an event so UpdateBanner can show the "Update now" prompt.
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker?.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            window.dispatchEvent(new CustomEvent('sw-update-waiting'));
          }
        });
      });
    }).catch((error) => {
      console.error('Service worker registration failed', error);
    });

    // When the user approves the update, the SW calls skipWaiting() and takes
    // control. This fires controllerchange — reload to load fresh JS chunks.
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  });
}

if ('serviceWorker' in navigator && import.meta.env.DEV) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.getRegistrations()
      .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
      .catch((error) => {
        console.error('Service worker cleanup failed', error);
      });
  });
}
