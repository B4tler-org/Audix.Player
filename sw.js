// Audix Service Worker
const CACHE_NAME = 'audix-v3';

// Install — skip waiting immediately
self.addEventListener('install', event => {
  self.skipWaiting();
});

// Activate — delete ALL old caches and claim clients
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Fetch — network first, cache as fallback (so updates always come through)
self.addEventListener('fetch', event => {
  // Skip non-GET and cross-origin API calls
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;
  if (
    url.hostname === 'musicbrainz.org' ||
    url.hostname === 'lrclib.net' ||
    url.hostname === 'acoustid.org'
  ) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache a copy of successful responses
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Offline fallback — serve from cache
        return caches.match(event.request)
          .then(cached => cached || caches.match('./index.html'));
      })
  );
});
