// Service Worker untuk Vidje - Simple Cache Strategy
const CACHE_NAME = 'vidje-v3'; // ✅ UPDATED to v3 for force refresh

// Store reference untuk komunikasi dengan client
let clients_store = [];

// Install event - cache essential files
self.addEventListener('install', (event) => {
  console.log('SW: Installing v3...');
  self.skipWaiting(); // Force immediate activation
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('SW: Caching assets with v3');
      return cache.addAll([
        './',
        './index.html',
        './manifest.json?v=3',
        './assets/logo.png?v=3' // ✅ Cache busting for logo
      ]).catch(err => {
        console.warn('SW: Cache addAll error (some files may not exist)', err);
      });
    })
  );
});

// Activate event - clean ALL old caches
self.addEventListener('activate', (event) => {
  console.log('SW: Activating v3 and cleaning old caches...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Delete ANY cache that's not the current version
          if (cacheName !== CACHE_NAME) {
            console.log('SW: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('SW: v3 activated and claiming clients');
      return self.clients.claim();
    })
  );
});

// ✅ Handle media control dari lock screen / notification
self.addEventListener('message', (event) => {
  console.log('SW: Message received:', event.data);
  
  // Broadcast pesan ke semua clients
  self.clients.matchAll().then(clientList => {
    clientList.forEach(client => {
      client.postMessage(event.data);
    });
  });
});

// Fetch event - network first, fallback to cache
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

  // ✅ FORCE network-first for logo files to always get latest
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
