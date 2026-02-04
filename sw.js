// Service Worker untuk Vidje - v999 FORCE UPDATE
const CACHE_NAME = 'vidje-v999';

// Store reference untuk komunikasi dengan client
let clients_store = [];

// Install event - cache essential files
self.addEventListener('install', (event) => {
  console.log('SW v999: Installing...');
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('SW v999: Caching assets');
      return cache.addAll([
        './',
        './index.html',
        './manifest.json?v=999',
        './assets/logo.png?v=999'
      ]).catch(err => {
        console.warn('SW: Cache addAll error (some files may not exist)', err);
      });
    })
  );
});

// Activate event - DELETE ALL old caches
self.addEventListener('activate', (event) => {
  console.log('SW v999: Activating and cleaning ALL old caches...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Delete ANY cache that's not v999
          if (cacheName !== CACHE_NAME) {
            console.log('SW v999: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('SW v999: All old caches deleted, claiming clients');
      return self.clients.claim();
    })
  );
});

// Handle media control dari lock screen / notification
self.addEventListener('message', (event) => {
  console.log('SW: Message received:', event.data);
  
  // Broadcast pesan ke semua clients
  self.clients.matchAll().then(clientList => {
    clientList.forEach(client => {
      client.postMessage(event.data);
    });
  });
});

// Fetch event - NETWORK FIRST for logo, normal for others
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle http/https GET requests
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // Skip firebase and external requests
  if (url.hostname.includes('firebase') || url.hostname.includes('supabase')) {
    return;
  }

  // FORCE network-first for logo to always get latest version
  if (url.pathname.includes('/assets/logo.png')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // Only fallback to cache if network fails
          return caches.match(request);
        })
    );
    return;
  }

  // Normal fetch strategy for other files
  event.respondWith(
    fetch(request)
      .then(response => {
        // Don't cache non-200 responses
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Clone and cache
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(request, responseToCache);
        });

        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(request).then(cached => {
          if (cached) {
            return cached;
          }
          // Return offline page if needed
          return new Response('Offline - No cached response', { status: 503 });
        });
      })
  );
});
