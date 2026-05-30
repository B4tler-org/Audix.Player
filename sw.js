// Audix Service Worker
const CACHE_NAME    = 'audix-v2';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Exo+2:wght@300;400;500;600;700;800;900&family=Rajdhani:wght@300;400;500;600;700&family=Share+Tech+Mono&display=swap'
];

// ── Install: pre-cache the app shell ──────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // addAll fails if any request fails — use individual adds so a
      // missing font doesn't break the whole install
      return Promise.allSettled(
        STATIC_ASSETS.map(url => cache.add(url).catch(() => {}))
      );
    }).then(() => self.skipWaiting())
  );
});

// ── Activate: clean up old caches ─────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: cache-first for app shell, network-first for API ───
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Always go to network for API calls
  if (url.hostname === 'musicbrainz.org' || url.hostname === 'lrclib.net') {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({ error: 'offline' }), {
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    return;
  }

  // For everything else: cache-first, falling back to network
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        // Only cache successful same-origin or Google Fonts responses
        if (
          response.ok &&
          (url.origin === self.location.origin ||
           url.hostname === 'fonts.googleapis.com' ||
           url.hostname === 'fonts.gstatic.com')
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback — return cached index.html for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});

// ── Background Sync ────────────────────────────────────────────
self.addEventListener('sync', event => {
  if (event.tag === 'sync-metadata') {
    event.waitUntil(
      self.clients.matchAll().then(clients =>
        clients.forEach(c => c.postMessage({ type: 'SYNC_COMPLETE' }))
      )
    );
  }
});

// ── Periodic Sync ──────────────────────────────────────────────
self.addEventListener('periodicsync', event => {
  if (event.tag === 'check-updates') {
    event.waitUntil(
      caches.open(CACHE_NAME).then(cache =>
        cache.add('./index.html').then(() =>
          self.clients.matchAll().then(clients =>
            clients.forEach(c => c.postMessage({ type: 'UPDATE_AVAILABLE' }))
          )
        )
      ).catch(() => {})
    );
  }
});

// ── Share Target (Web Share Target API) ───────────────────────
self.addEventListener('fetch', event => {
  if (
    event.request.method === 'POST' &&
    event.request.url.includes('share-target')
  ) {
    event.respondWith(
      (async () => {
        const data = await event.request.formData();
        const files = data.getAll('files');
        const clients = await self.clients.matchAll({ type: 'window' });
        if (clients.length > 0) {
          clients[0].postMessage({ type: 'SHARED_FILES', files });
          clients[0].focus();
        }
        return Response.redirect('./', 303);
      })()
    );
  }
});
