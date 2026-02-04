// ===================================================================
// Service Worker untuk Vidje - v3002 FIXED OFFLINE PLAYBACK
// ===================================================================
// FIXES:
// ✅ Range Request support untuk audio seeking
// ✅ Proper CORS handling untuk audio files
// ✅ Flexible cache matching (ignores query params)
// ✅ Opaque response support untuk no-cors requests
// ===================================================================

const CACHE_NAME = 'vidje-v3002';
const MUSIC_CACHE = 'vidje-music-v3002';
const IMAGE_CACHE = 'vidje-images-v3002';

const MAX_MUSIC_CACHE = 50;
const MAX_IMAGE_CACHE = 100;

// ============================================================
// INSTALL EVENT
// ============================================================

self.addEventListener('install', (event) => {
  console.log('✅ SW v3002: Installing FIXED version...');
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('📦 SW v3002: Caching core assets');
      return cache.addAll([
        './',
        './index.html'
      ]).catch(err => {
        console.warn('⚠️ SW: Cache addAll error', err);
      });
    })
  );
});

// ============================================================
// ACTIVATE EVENT
// ============================================================

self.addEventListener('activate', (event) => {
  console.log('🔄 SW v3002: Activating...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Delete old versions
          if (cacheName.startsWith('vidje-') && 
              cacheName !== CACHE_NAME && 
              cacheName !== MUSIC_CACHE && 
              cacheName !== IMAGE_CACHE) {
            console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ SW v3002: Ready - Offline playback FIXED!');
      return self.clients.claim();
    })
  );
});

// ============================================================
// MESSAGE HANDLER
// ============================================================

self.addEventListener('message', (event) => {
  const { type, data } = event.data || {};
  
  switch(type) {
    case 'CACHE_MUSIC':
      // ✅ FIX: Validate data before passing
      if (data && data.url) {
        cacheMusicFile(data.url, data.metadata);
      } else {
        console.warn('⚠️ Invalid CACHE_MUSIC data:', data);
      }
      break;
      
    case 'CLEAR_MUSIC_CACHE':
      clearMusicCache();
      break;
      
    case 'GET_CACHE_SIZE':
      getCacheSize().then(size => {
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage(size);
        }
      });
      break;
      
    default:
      broadcastToClients(event.data);
  }
});

// ============================================================
// CACHE MUSIC FILE - IMPROVED
// ============================================================

async function cacheMusicFile(url, metadata) {
  try {
    console.log('📥 Caching music:', url);
    
    const cache = await caches.open(MUSIC_CACHE);
    
    // Fetch dengan proper CORS - force full request (not range)
    const response = await fetch(url, {
      mode: 'cors',
      credentials: 'omit',
      headers: {
        // Don't include Range header to get full response
      }
    });
    
    // ✅ FIX: Only cache full responses (200), not partial (206)
    if (response.ok && response.status === 200) {
      // Clone response untuk disimpan
      const responseToCache = response.clone();
      
      // Store in cache
      await cache.put(url, responseToCache);
      
      console.log('✅ Music cached successfully:', url);
      
      // Cleanup old cache
      await cleanupMusicCache();
      
      // Notify clients
      broadcastToClients({
        type: 'MUSIC_CACHED',
        url: url,
        metadata: metadata
      });
    } else {
      console.warn(`⚠️ Cannot cache response with status ${response.status} (need 200)`);
    }
  } catch (error) {
    console.error('❌ Failed to cache music:', error);
    
    // Coba dengan mode no-cors sebagai fallback
    try {
      const response = await fetch(url, { mode: 'no-cors' });
      const cache = await caches.open(MUSIC_CACHE);
      await cache.put(url, response);
      console.log('✅ Music cached (no-cors mode):', url);
    } catch (err) {
      console.error('❌ No-cors fallback also failed:', err);
    }
  }
}

// ============================================================
// CLEANUP OLD MUSIC CACHE
// ============================================================

async function cleanupMusicCache() {
  try {
    const cache = await caches.open(MUSIC_CACHE);
    const keys = await cache.keys();
    
    if (keys.length > MAX_MUSIC_CACHE) {
      const itemsToRemove = keys.length - MAX_MUSIC_CACHE;
      for (let i = 0; i < itemsToRemove; i++) {
        await cache.delete(keys[i]);
      }
      console.log('🗑️ Removed', itemsToRemove, 'old cached items');
    }
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

// ============================================================
// CLEAR ALL MUSIC CACHE
// ============================================================

async function clearMusicCache() {
  try {
    const cache = await caches.open(MUSIC_CACHE);
    const keys = await cache.keys();
    await Promise.all(keys.map(key => cache.delete(key)));
    console.log('🗑️ All music cache cleared');
    
    broadcastToClients({ type: 'CACHE_CLEARED' });
  } catch (error) {
    console.error('❌ Clear cache failed:', error);
  }
}

// ============================================================
// GET CACHE SIZE INFO
// ============================================================

async function getCacheSize() {
  try {
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
  } catch (error) {
    return {
      musicCount: 0,
      imageCount: 0,
      musicLimit: MAX_MUSIC_CACHE,
      imageLimit: MAX_IMAGE_CACHE
    };
  }
}

// ============================================================
// BROADCAST TO ALL CLIENTS
// ============================================================

async function broadcastToClients(message) {
  try {
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage(message);
    });
  } catch (error) {
    console.error('❌ Broadcast failed:', error);
  }
}

// ============================================================
// HANDLE RANGE REQUESTS - CRITICAL FOR AUDIO PLAYBACK!
// ============================================================

async function handleRangeRequest(request, cachedResponse) {
  const rangeHeader = request.headers.get('range');
  
  if (!rangeHeader) {
    return cachedResponse;
  }
  
  // Parse range header: "bytes=0-1023"
  const rangeMatch = rangeHeader.match(/bytes=(\d+)-(\d*)/);
  if (!rangeMatch) {
    return cachedResponse;
  }
  
  const start = parseInt(rangeMatch[1], 10);
  const arrayBuffer = await cachedResponse.arrayBuffer();
  const end = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : arrayBuffer.byteLength - 1;
  
  // Validate range
  if (start >= arrayBuffer.byteLength || end >= arrayBuffer.byteLength || start > end) {
    return new Response(null, {
      status: 416,
      statusText: 'Range Not Satisfiable',
      headers: {
        'Content-Range': `bytes */${arrayBuffer.byteLength}`
      }
    });
  }
  
  // Create sliced response
  const slicedBuffer = arrayBuffer.slice(start, end + 1);
  
  return new Response(slicedBuffer, {
    status: 206,
    statusText: 'Partial Content',
    headers: {
      'Content-Type': cachedResponse.headers.get('Content-Type') || 'audio/mpeg',
      'Content-Length': slicedBuffer.byteLength,
      'Content-Range': `bytes ${start}-${end}/${arrayBuffer.byteLength}`,
      'Accept-Ranges': 'bytes',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range'
    }
  });
}

// ============================================================
// MAIN FETCH HANDLER - FIXED FOR OFFLINE PLAYBACK
// ============================================================

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET and HEAD requests
  if (!['GET', 'HEAD'].includes(request.method) || !url.protocol.startsWith('http')) {
    return;
  }

  // Skip Firebase
  if (url.hostname.includes('firebase')) {
    return;
  }

  // ============================================================
  // MUSIC FILES - DENGAN RANGE REQUEST SUPPORT
  // ============================================================
  
  if (url.hostname.includes('supabase') && 
      (url.pathname.includes('/audio/') || 
       url.pathname.includes('/music/') ||
       url.pathname.endsWith('.mp3') ||
       url.pathname.endsWith('.m4a') ||
       url.pathname.endsWith('.wav'))) {
    
    event.respondWith(
      (async () => {
        try {
          const cache = await caches.open(MUSIC_CACHE);
          
          // Cari di cache (ignore query params untuk matching)
          const cachedResponse = await cache.match(request, {
            ignoreSearch: true,
            ignoreVary: true
          });
          
          if (cachedResponse) {
            console.log('🎵 Playing from cache:', url.pathname);
            
            // Handle range requests untuk seeking
            if (request.headers.get('range')) {
              return await handleRangeRequest(request, cachedResponse);
            }
            
            // Return full response dengan proper headers
            const headers = new Headers(cachedResponse.headers);
            headers.set('Access-Control-Allow-Origin', '*');
            headers.set('Accept-Ranges', 'bytes');
            
            return new Response(cachedResponse.body, {
              status: 200,
              statusText: 'OK',
              headers: headers
            });
          }
          
          // Not in cache - fetch from network
          console.log('📡 Fetching from network:', url.pathname);
          
          // ✅ ADD: Retry logic for network failures
          let networkResponse;
          let lastError;
          const maxRetries = 2;
          
          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
              networkResponse = await fetch(request, {
                mode: 'cors',
                credentials: 'omit'
              });
              
              // If successful, break the retry loop
              if (networkResponse.ok || networkResponse.status === 206) {
                break;
              }
              
              // If 503/429, wait and retry
              if ([503, 429].includes(networkResponse.status) && attempt < maxRetries) {
                console.warn(`⚠️ Got ${networkResponse.status}, retrying (${attempt}/${maxRetries})...`);
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                continue;
              }
              
              break;
            } catch (err) {
              lastError = err;
              if (attempt < maxRetries) {
                console.warn(`⚠️ Fetch failed, retrying (${attempt}/${maxRetries})...`);
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
              }
            }
          }
          
          // If all retries failed, throw last error
          if (!networkResponse) {
            throw lastError || new Error('Network request failed after retries');
          }
          
          // ✅ FIX: Only cache full responses (200), not partial (206)
          if (networkResponse.ok && networkResponse.status === 200) {
            // Cache for future offline use
            const responseToCache = networkResponse.clone();
            await cache.put(request, responseToCache);
            console.log('✅ Cached new music:', url.pathname);
          } else if (networkResponse.status === 206) {
            console.log('⚠️ Skipping cache for partial response (206)');
          }
          
          return networkResponse;
          
        } catch (error) {
          console.error('❌ Music fetch failed:', error);
          
          // Try one more time with cache (broader search)
          const cache = await caches.open(MUSIC_CACHE);
          const allRequests = await cache.keys();
          
          // Find by URL path only
          const matchingRequest = allRequests.find(req => {
            const reqUrl = new URL(req.url);
            return reqUrl.pathname === url.pathname;
          });
          
          if (matchingRequest) {
            const fallbackResponse = await cache.match(matchingRequest);
            if (fallbackResponse) {
              console.log('🎵 Found in cache (fallback):', url.pathname);
              
              if (request.headers.get('range')) {
                return await handleRangeRequest(request, fallbackResponse);
              }
              
              return fallbackResponse;
            }
          }
          
          // No cache available
          return new Response(JSON.stringify({ 
            error: 'Offline',
            message: 'Lagu ini belum di-download untuk offline. Putar sekali saat online untuk menyimpannya.'
          }), { 
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
      })()
    );
    return;
  }

  // ============================================================
  // IMAGE FILES
  // ============================================================
  
  if (url.hostname.includes('supabase') && 
      (url.pathname.includes('/assets/') || 
       url.pathname.includes('/albumphoto/') || 
       url.pathname.endsWith('.jpg') || 
       url.pathname.endsWith('.png') || 
       url.pathname.endsWith('.webp'))) {
    
    event.respondWith(
      (async () => {
        const cache = await caches.open(IMAGE_CACHE);
        const cachedResponse = await cache.match(request, { ignoreSearch: true });
        
        if (cachedResponse) {
          // Return cached, but also update in background
          fetch(request).then(response => {
            if (response.ok) {
              cache.put(request, response.clone());
            }
          }).catch(() => {});
          
          return cachedResponse;
        }
        
        // Not cached, fetch from network
        try {
          const response = await fetch(request);
          if (response.ok) {
            cache.put(request, response.clone());
          }
          return response;
        } catch (error) {
          // Return placeholder image
          return new Response(
            '<svg width="300" height="300" xmlns="http://www.w3.org/2000/svg"><rect fill="#181818" width="300" height="300"/><text fill="#666" x="50%" y="50%" text-anchor="middle" font-size="14">Offline</text></svg>',
            { 
              headers: { 
                'Content-Type': 'image/svg+xml',
                'Access-Control-Allow-Origin': '*'
              } 
            }
          );
        }
      })()
    );
    return;
  }

  // ============================================================
  // SUPABASE API CALLS
  // ============================================================
  
  if (url.hostname.includes('supabase')) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(JSON.stringify({ 
          error: 'Offline',
          offline: true,
          message: 'Database tidak tersedia offline'
        }), {
          status: 503,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      })
    );
    return;
  }

  // ============================================================
  // LOCAL FILES (HTML, CSS, JS)
  // ============================================================
  
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then(response => {
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseToCache);
          });
        }
        return response;
      }).catch(() => {
        return new Response('Offline - Halaman tidak tersedia', { 
          status: 503,
          headers: { 'Content-Type': 'text/plain' }
        });
      });
    })
  );
});

// ============================================================
// BACKGROUND SYNC
// ============================================================

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-tracking') {
    console.log('🔄 Background sync: tracking queue');
    event.waitUntil(broadcastToClients({ type: 'SYNC_TRACKING_REQUEST' }));
  }
});

console.log('✅ Vidje SW v3002 - FIXED Offline Playback Ready!');
console.log('🎵 Features: Range Requests, CORS Support, Flexible Caching');
