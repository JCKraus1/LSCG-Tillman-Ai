const CACHE_NAME = 'nexus-v2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './index.tsx',
  './index.css',
  './LSCG_Logo_White_transparentbackground.png'
];

// Install Event - Cache App Shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Opened cache');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch Event - Hybrid Strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // STRATEGY 1: Network First (Fall back to Cache)
  // Use this for Excel files (Data) so users always get the latest numbers if online
  if (url.pathname.endsWith('.xlsx')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // If network fetch succeeds, cache the new version
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // If network fails, return cached version
          return caches.match(event.request);
        })
    );
    return;
  }

  // STRATEGY 2: Cache First (Fall back to Network)
  // Use this for static assets (HTML, JS, Images) for speed
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }
      return fetch(event.request);
    })
  );
});