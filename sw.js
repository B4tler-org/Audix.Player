/* ============================================
   AUDIX SERVICE WORKER — v3.0
   Network-first for the app shell (index.html / "/"), so edits to the
   single-file app are always picked up immediately. Cache-first / SWR for
   third-party static assets (CDN libs) that rarely change. Falls back to
   whatever is cached only when the network is unavailable.
   ============================================ */

const CACHE_NAME = 'audix-v3';

// This app is a single HTML file — there is no separate /css or /js
// bundle to pre-cache. Only the app shell itself is precached on install;
// everything else (CDN libraries, lyrics API, album art, etc.) is cached
// opportunistically as it's fetched.
const ASSETS = [
  '/',
  '/index.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;

  // Never intercept audio/streaming requests — let the browser handle
  // range requests for local blob/audio URLs and m3u8 playlists directly.
  if (url.pathname.endsWith('.m3u8') || request.headers.get('accept')?.includes('audio')) {
    return;
  }

  // The app shell itself: index.html and "/". Always go to the network
  // first so any edit to the file is reflected immediately on next load.
  // Only fall back to the cached copy if the network request fails
  // (e.g. offline), and refresh the cache whenever the network succeeds.
  const isAppShell = request.mode === 'navigate' ||
    url.pathname === '/' ||
    url.pathname.endsWith('/index.html');

  if (isAppShell && url.origin === self.location.origin) {
    event.respondWith(
      fetch(request, { cache: 'no-store' }).then((networkResponse) => {
        if (networkResponse && networkResponse.ok) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return networkResponse;
      }).catch(() => caches.match(request).then((cached) => {
        return cached || caches.match('/index.html');
      }))
    );
    return;
  }

  // Third-party CDN libraries: stale-while-revalidate — serve from cache
  // instantly if present, but always refresh the cache in the background.
  if (url.hostname.includes('cdnjs.cloudflare.com')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((networkResponse) => {
          if (networkResponse.ok) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Lyrics API: always try the network; only fail gracefully when offline.
  if (url.hostname.includes('lrclib.net')) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(JSON.stringify({ error: 'Offline' }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // Everything else (images, fonts, misc assets): cache-first with
  // background refresh.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        fetch(request).then((networkResponse) => {
          if (networkResponse.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
          }
        }).catch(() => {});
        return cached;
      }
      return fetch(request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const clone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return networkResponse;
      }).catch(() => {
        if (request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
      });
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
