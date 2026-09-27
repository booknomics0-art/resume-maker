// CraftCV service worker — installable PWA + basic offline resilience.
//
// Strategy (deliberately conservative):
//  · Precache the app shell on install.
//  · Navigations: network-first, fall back to the cached shell when offline.
//  · Hashed build assets (/assets/): cache-first — they are immutable.
//  · Everything else (OCR engine, Supabase, …): straight network, untouched.
//
// Registered only in production builds (see src/main.tsx) so `npm run dev`
// never serves stale modules. Bump CACHE when the shell changes shape.

const CACHE = 'craftcv-v2';
const PRECACHE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('craftcv-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Supabase etc. — never touched

  // App navigations: try the network, keep the shell as the offline fallback.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          if (res.ok && res.headers.get('content-type')?.includes('text/html')) {
            event.waitUntil(caches.open(CACHE).then((c) => c.put('./index.html', copy)));
          }
          return res;
        })
        .catch(() => caches.match('./index.html')),
    );
    return;
  }

  // Hashed, immutable build output: cache-first.
  if (url.pathname.includes('/assets/')) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        const copy = res.clone();
        if (res.ok) event.waitUntil(caches.open(CACHE).then((c) => c.put(req, copy)));
        return res;
      })),
    );
  }
  // everything else: default network behaviour
});
