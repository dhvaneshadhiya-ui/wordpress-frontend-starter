// Service Worker for API response caching
// Network-first strategy with cache fallback

const API_CACHE = 'wp-api-cache-v1';
const API_URL_PATTERN = /dev\.igeeksblog\.com\/wp-json/;

// Install event - skip waiting to activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate event - claim all clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name.startsWith('wp-api-cache-') && name !== API_CACHE)
            .map((name) => caches.delete(name))
        );
      }),
    ])
  );
});

// Fetch event - network-first for API, cache fallback
self.addEventListener('fetch', (event) => {
  // Only intercept API requests
  if (!API_URL_PATTERN.test(event.request.url)) {
    return;
  }

  // Only cache GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Only cache successful responses
        if (response.ok) {
          const clonedResponse = response.clone();
          caches.open(API_CACHE).then((cache) => {
            cache.put(event.request, clonedResponse);
          });
        }
        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Return a fallback error response
          return new Response(JSON.stringify({ error: 'Offline', cached: false }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          });
        });
      })
  );
});
