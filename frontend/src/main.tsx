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
      function notifyUpdateWaiting() {
        if (navigator.serviceWorker.controller) {
          window.dispatchEvent(new CustomEvent('sw-update-waiting'));
        }
      }

      // Race condition: if the SW updated between page load and .then() running,
      // updatefound already fired and the new SW is already waiting. Check now.
      if (registration.waiting) {
        notifyUpdateWaiting();
      }

      // Normal path: new SW found after registration resolves.
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker?.addEventListener('statechange', () => {
          if (newWorker.state === 'installed') notifyUpdateWaiting();
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
