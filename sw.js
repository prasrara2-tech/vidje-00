// Service Worker untuk Vidje - v2000 OFFLINE MUSIC SUPPORT
const CACHE_NAME = 'vidje-v2000';
const MUSIC_CACHE = 'vidje-music-v2000';
const IMAGE_CACHE = 'vidje-images-v2000';

// Maksimal cache
const MAX_MUSIC_CACHE = 50; // Maksimal 50 lagu
const MAX_IMAGE_CACHE = 100; // Maksimal 100 gambar

// Install event - cache essential files
self.addEventListener('install', (event) => {
  console.log('SW v2000: Installing with offline music support...');
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('SW v2000: Caching core assets');
      return cache.addAll([
        './',
        './index.html',
        './manifest.json'
      ]).catch(err => {
        console.warn('SW: Cache addAll error', err);
      });
    })
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('SW v2000: Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Keep current version caches
          if (cacheName !== CACHE_NAME && 
              cacheName !== MUSIC_CACHE && 
              cacheName !== IMAGE_CACHE) {
            console.log('SW v2000: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('SW v2000: Ready for offline music!');
      return self.clients.claim();
    })
  );
});

// Handle messages from client
self.addEventListener('message', (event) => {
  if (event.data.type === 'CACHE_MUSIC') {
    // Cache specific music file
    cacheMusicFile(event.data.url, event.data.metadata);
  } else if (event.data.type === 'CLEAR_MUSIC_CACHE') {
    // Clear all music cache
    clearMusicCache();
  } else if (event.data.type === 'GET_CACHE_SIZE') {
    // Return cache size info
    getCacheSize().then(size => {
      event.ports[0].postMessage(size);
    });
  } else {
    // Broadcast to all clients (media controls)
    self.clients.matchAll().then(clientList => {
      clientList.forEach(client => {
        client.postMessage(event.data);
      });
    });
  }
});

// Cache music file function
async function cacheMusicFile(url, metadata) {
  try {
    const cache = await caches.open(MUSIC_CACHE);
    const response = await fetch(url);
    
    if (response.ok) {
      // Store with metadata in headers
      const headers = new Headers(response.headers);
      headers.set('X-Cached-Time', Date.now().toString());
      if (metadata) {
        headers.set('X-Song-Metadata', JSON.stringify(metadata));
      }
      
      const cachedResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: headers
      });
      
      await cache.put(url, cachedResponse);
      console.log('✅ Cached music:', url);
      
      // Cleanup old cache if needed
      await cleanupMusicCache();
    }
  } catch (error) {
    console.error('❌ Failed to cache music:', error);
  }
}

// Cleanup old music cache (LRU - Least Recently Used)
async function cleanupMusicCache() {
  const cache = await caches.open(MUSIC_CACHE);
  const keys = await cache.keys();
  
  if (keys.length > MAX_MUSIC_CACHE) {
    // Remove oldest cached items
    const itemsToRemove = keys.length - MAX_MUSIC_CACHE;
    for (let i = 0; i < itemsToRemove; i++) {
      await cache.delete(keys[i]);
      console.log('🗑️ Removed old cached music');
    }
  }
}

// Clear all music cache
async function clearMusicCache() {
  const cache = await caches.open(MUSIC_CACHE);
  const keys = await cache.keys();
  await Promise.all(keys.map(key => cache.delete(key)));
  console.log('🗑️ All music cache cleared');
}

// Get cache size info
async function getCacheSize() {
  const musicCache = await caches.open(MUSIC_CACHE);
  const imageCache = await caches.open(IMAGE_CACHE);
  
  const musicKeys = await musicCache.keys();
  const imageKeys = await imageCache.keys();
  
  return {
    musicCount: musicKeys.length,
    imageCount: imageKeys.length,
    musicLimit: MAX_MUSIC_CACHE,
    imageLimit: MAX_IMAGE_CACHE
  };
}

// Main fetch handler with smart offline support
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // Skip Firebase
  if (url.hostname.includes('firebase')) {
    return;
  }

  // === MUSIC FILES (audio) from Supabase ===
  if (url.hostname.includes('supabase') && 
      (url.pathname.includes('/audio/') || url.pathname.includes('/music/'))) {
    event.respondWith(
      caches.open(MUSIC_CACHE).then(cache => {
        return cache.match(request).then(cachedResponse => {
          if (cachedResponse) {
            console.log('🎵 Playing from cache:', url.pathname);
            return cachedResponse;
          }
          
          // Not in cache, fetch from network
          return fetch(request).then(response => {
            if (response.ok) {
              // Clone and cache for offline use
              cache.put(request, response.clone());
              console.log('📥 Cached new music:', url.pathname);
            }
            return response;
          }).catch(() => {
            // Network failed and not in cache
            return new Response('Offline - Music not cached', { 
              status: 503,
              statusText: 'Music not available offline'
            });
          });
        });
      })
    );
    return;
  }

  // === IMAGE FILES (covers, logos) from Supabase ===
  if (url.hostname.includes('supabase') && 
      (url.pathname.includes('/assets/') || 
       url.pathname.includes('/albumphoto/') || 
       url.pathname.endsWith('.jpg') || 
       url.pathname.endsWith('.png') || 
       url.pathname.endsWith('.webp'))) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(cache => {
        return cache.match(request).then(cachedResponse => {
          // Return cached image immediately
          const fetchPromise = fetch(request).then(response => {
            if (response.ok) {
              cache.put(request, response.clone());
            }
            return response;
          }).catch(() => cachedResponse);

          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // === OTHER SUPABASE REQUESTS (database queries) ===
  if (url.hostname.includes('supabase')) {
    // Don't cache database queries, just pass through
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(JSON.stringify({ 
          error: 'Offline',
          message: 'Database unavailable offline'
        }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // === LOCAL FILES (HTML, CSS, JS) ===
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(request, responseToCache);
        });

        return response;
      }).catch(() => {
        return new Response('Offline - No cached response', { status: 503 });
      });
    })
  );
});

console.log('✅ Vidje SW v2000 - Offline Music Support Ready!');
