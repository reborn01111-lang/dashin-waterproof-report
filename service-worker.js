const CACHE_NAME = 'dashin-cost-control-v21-original-multiselect';
const APP_SHELL = [
  '/index.html',
  '/manifest.webmanifest',
  '/offline.html',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);

      // Prefer network while online so updates arrive quickly.
      try {
        const fresh = await fetch(req);
        if (fresh && fresh.ok) {
          await cache.put('/index.html', fresh.clone());
          return fresh;
        }
      } catch (e) {}

      // Offline: always open the cached app shell.
      const app = await cache.match('/index.html');
      if (app) return app;

      return cache.match('/offline.html');
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;

    try {
      const fresh = await fetch(req);
      if (fresh && fresh.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, fresh.clone());
      }
      return fresh;
    } catch (e) {
      return new Response('', {status: 504, statusText: 'Offline'});
    }
  })());
});