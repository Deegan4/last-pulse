// Last Pulse service worker — home-screen install + offline play (ROADMAP.md "PWA install").
// Hand-authored, never touched by scripts/build-game.py (unlike assets/game/*, which is
// generated from src/). Bump CACHE_VERSION when the precached shell list changes shape;
// runtime-cached assets self-heal via the network-then-cache fetch below regardless.
const CACHE_VERSION = 'lp-cache-v1';
const SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'assets/game/game.css',
  'assets/game/game.js',
  'assets/game/models3d.js',
  'assets/icon/favicon-32.png',
  'assets/icon/icon-192.png',
  'assets/icon/icon-512.png',
  'assets/icon/apple-touch-icon.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Same-origin GET only: cache-first for instant loads, refreshed in the background from the
// network (stale-while-revalidate) so returning players pick up new builds within a session
// or two without a hard cache-version bump. Offline + not-yet-cached falls back to the app
// shell for navigations so the game still boots; other misses simply fail (expected offline).
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_VERSION);
    const cached = await cache.match(req);
    const network = fetch(req).then(res => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    }).catch(() => null);

    if (cached) { network; return cached; }
    const fresh = await network;
    if (fresh) return fresh;
    if (req.mode === 'navigate') return cache.match('index.html');
    return Response.error();
  })());
});
