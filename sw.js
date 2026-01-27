// Service Worker untuk Vidje
const CACHE_NAME = 'vidje-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  // Tambahkan assets penting lainnya di sini
];

// Install Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Strategy: Network First, fallback to Cache
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip Firebase requests
  if (event.request.url.includes('firebase') || 
      event.request.url.includes('firebaseapp')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone response sebelum disimpan ke cache
        const responseToCache = response.clone();
        
        // Cache response untuk request yang berhasil
        if (response.status === 200) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        
        return response;
      })
      .catch(() => {
        // Jika network gagal, ambil dari cache
        return caches.match(event.request);
      })
  );
});

// Handle messages from main app
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // Handle media session updates
  if (event.data && event.data.type === 'UPDATE_MEDIA_SESSION') {
    updateMediaSession(event.data.metadata);
  }
});

// Update Media Session (untuk notifikasi)
function updateMediaSession(metadata) {
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: metadata.title || 'Pilih Lagu',
      artist: metadata.artist || 'Vidje',
      album: metadata.album || 'Music Platform',
      artwork: [
        { src: metadata.cover || '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png' },
        { src: metadata.cover || '/icons/icon-128x128.png', sizes: '128x128', type: 'image/png' },
        { src: metadata.cover || '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: metadata.cover || '/icons/icon-256x256.png', sizes: '256x256', type: 'image/png' },
        { src: metadata.cover || '/icons/icon-384x384.png', sizes: '384x384', type: 'image/png' },
        { src: metadata.cover || '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' }
      ]
    });
  }
}

// Sync background (untuk future features)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-playback') {
    event.waitUntil(syncPlayback());
  }
});

async function syncPlayback() {
  // Implementasi sync playback state di sini
  console.log('[SW] Syncing playback state...');
}

// Push Notifications (untuk future features)
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'Notifikasi baru dari Vidje',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };
  
  event.waitUntil(
    self.registration.showNotification('Vidje', options)
  );
});

// Notification Click Handler
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click received');
  
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow('/')
  );
});