const CACHE_VERSION = 'v2';
const CACHE_NAME = `nomad-navigator-${CACHE_VERSION}`;
const STATIC_CACHE_NAME = `nomad-navigator-static-${CACHE_VERSION}`;
const IMAGE_CACHE_NAME = `nomad-navigator-images-${CACHE_VERSION}`;
const API_CACHE_NAME = `nomad-navigator-api-${CACHE_VERSION}`;

// Cache expiration times
const CACHE_EXPIRATION = {
  static: 30 * 24 * 60 * 60 * 1000, // 30 days
  images: 7 * 24 * 60 * 60 * 1000,  // 7 days
  api: 5 * 60 * 1000,                // 5 minutes
};

// Files to precache for offline use
const urlsToCache = [
  '/',
  '/manifest.json',
  '/favicon.svg',
  // Critical fonts
  'https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400;1,700&display=swap',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      console.log('Opened cache');
      return cache.addAll(urlsToCache);
    })
  );
  // Force the service worker to become active
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheName.includes(CACHE_VERSION)) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Take control of all pages immediately
  self.clients.claim();
});

// Helper function to determine cache strategy
function getCacheStrategy(url) {
  // Images
  if (/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i.test(url.pathname)) {
    return { cacheName: IMAGE_CACHE_NAME, strategy: 'cache-first' };
  }
  
  // API requests
  if (url.pathname.startsWith('/api/')) {
    return { cacheName: API_CACHE_NAME, strategy: 'network-first' };
  }
  
  // Static assets (JS, CSS)
  if (/\.(js|css)$/i.test(url.pathname)) {
    return { cacheName: STATIC_CACHE_NAME, strategy: 'cache-first' };
  }
  
  // HTML pages
  if (url.pathname === '/' || /\.html$/i.test(url.pathname)) {
    return { cacheName: CACHE_NAME, strategy: 'network-first' };
  }
  
  // Default
  return { cacheName: CACHE_NAME, strategy: 'network-first' };
}

// Fetch event - optimized caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  const { cacheName, strategy } = getCacheStrategy(url);

  if (strategy === 'cache-first') {
    // Try cache first, fallback to network
    event.respondWith(
      caches.match(request).then((response) => {
        if (response) {
          // Update cache in background
          fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(cacheName).then((cache) => {
                cache.put(request, networkResponse.clone());
              });
            }
          });
          return response;
        }
        
        return fetch(request).then((response) => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(cacheName).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        });
      })
    );
  } else {
    // Network first, fallback to cache
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(cacheName).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
  }
});

// Listen for messages from the client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            return caches.delete(cacheName);
          })
        );
      })
    );
  }
});