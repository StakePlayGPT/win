const CACHE = 'stakeplay-cache-v1';
const ASSETS = [
  '/win/',
  '/win/index.html',
  '/win/manifest.json',
  '/win/offline.html'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => k !== CACHE && caches.delete(k)));
  })());
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;

  // Навигация: сеть → офлайн-фоллбек
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        return await fetch(req);
      } catch {
        const cache = await caches.open(CACHE);
        const offline = await cache.match('/win/offline.html');
        return offline || new Response('Offline', {status: 503});
      }
    })());
    return;
  }

  // Остальное: cache-first
  e.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const fresh = await fetch(req);
      const cache = await caches.open(CACHE);
      cache.put(req, fresh.clone());
      return fresh;
    } catch {
      return cached || Response.error();
    }
  })());
});
