const CACHE_NAME = 'brainplay-v62-phase61';
const STATIC_ASSETS = [
  './brainplay-icon-192.png',
  './brainplay-icon-512.png',
  './apple-touch-icon.png',
  './favicon-32.png',
  './site.webmanifest'
];
const OFFLINE_PAGE = './index.html';

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      const page = await fetch(OFFLINE_PAGE, { cache: 'reload' });
      if (page.ok) await cache.put(OFFLINE_PAGE, page.clone());
    } catch (_) {}
    await Promise.all(STATIC_ASSETS.map(async url => {
      try {
        const response = await fetch(url, { cache: 'reload' });
        if (response.ok) await cache.put(url, response.clone());
      } catch (_) {}
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  const isPage = event.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/');
  if (isPage) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const fresh = await fetch(event.request, { cache: 'no-store' });
        if (fresh.ok) {
          await cache.put(event.request, fresh.clone());
          await cache.put(OFFLINE_PAGE, fresh.clone());
        }
        return fresh;
      } catch (_) {
        return (await cache.match(event.request)) || (await cache.match(OFFLINE_PAGE));
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(event.request);
    const networkPromise = fetch(event.request, { cache: 'no-cache' }).then(async response => {
      if (response && response.ok) await cache.put(event.request, response.clone());
      return response;
    }).catch(() => null);
    if (cached) {
      event.waitUntil(networkPromise);
      return cached;
    }
    return (await networkPromise) || Response.error();
  })());
});
