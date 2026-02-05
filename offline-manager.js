// ===================================================================
// Vidje Offline Manager - No Refresh Prompts, Fast & Silent
// ===================================================================

(function() {
    'use strict';
    
    console.log('🔌 Offline Manager v3.1 - Loading...');
    
    // ============================================================
    // SERVICE WORKER REGISTRATION - SILENT MODE (NO REFRESH PROMPT)
    // ============================================================
    
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js?v=3002', {
            updateViaCache: 'none',
            scope: '/'
        })
        .then(registration => {
            console.log('✅ Service Worker registered');
            
            // Listen for updates SILENTLY (tidak reload otomatis)
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        console.log('💡 Update tersedia - akan aktif setelah refresh manual');
                        // TIDAK menampilkan popup refresh atau auto-reload
                    }
                });
            });
        })
        .catch(error => {
            // SILENT - hanya log console, tidak ganggu user
            console.info('ℹ️ Mode offline tidak aktif -', error.message);
        });
        
        // Listen to SW messages
        navigator.serviceWorker.addEventListener('message', event => {
            const { type, data } = event.data || {};
            
            if (type === 'MUSIC_CACHED') {
                console.log('✅ Music cached:', data?.url);
                if (window.updateOfflineCacheIndicators) {
                    window.updateOfflineCacheIndicators();
                }
            }
        });
    }
    
    // ============================================================
    // OFFLINE STATUS - SUBTLE INDICATOR (NOT INTRUSIVE)
    // ============================================================
    
    let isOnline = navigator.onLine;
    let offlineIndicator = null;
    
    function updateOnlineStatus() {
        const wasOnline = isOnline;
        isOnline = navigator.onLine;
        
        if (!isOnline && !offlineIndicator) {
            // Show small offline badge (tidak mengganggu)
            offlineIndicator = document.createElement('div');
            offlineIndicator.style.cssText = `
                position: fixed; top: 70px; left: 50%; transform: translateX(-50%);
                background: rgba(255, 107, 0, 0.9);
                color: white; padding: 6px 16px; border-radius: 20px;
                font-size: 12px; font-weight: 600; z-index: 9999;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                display: flex; align-items: center; gap: 6px;
                pointer-events: none;
            `;
            offlineIndicator.innerHTML = `
                <i class="ph-fill ph-wifi-slash" style="font-size: 14px;"></i>
                Offline
            `;
            document.body.appendChild(offlineIndicator);
            
            // Auto-hide after 3 seconds
            setTimeout(() => {
                if (offlineIndicator && !navigator.onLine) {
                    offlineIndicator.style.opacity = '0';
                    offlineIndicator.style.transition = 'opacity 0.3s';
                    setTimeout(() => {
                        if (offlineIndicator) offlineIndicator.remove();
                        offlineIndicator = null;
                    }, 300);
                }
            }, 3000);
            
        } else if (isOnline && !wasOnline && offlineIndicator) {
            // Remove offline indicator
            offlineIndicator.remove();
            offlineIndicator = null;
            console.log('📶 Back online');
        }
    }
    
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();
    
    // ============================================================
    // CACHE UTILITIES
    // ============================================================
    
    window.getOfflineCacheInfo = async function() {
        if (!('caches' in window)) return { supported: false };
        
        try {
            const musicCache = await caches.open('vidje-music-v3002');
            const keys = await musicCache.keys();
            
            return {
                supported: true,
                count: keys.length,
                isOnline: navigator.onLine
            };
        } catch (error) {
            return { supported: false };
        }
    };
    
    window.clearOfflineCache = async function() {
        if (!('caches' in window)) {
            alert('⚠️ Cache tidak didukung browser ini');
            return;
        }
        
        if (!confirm('Hapus semua musik offline?')) return;
        
        try {
            const cache = await caches.open('vidje-music-v3002');
            const keys = await cache.keys();
            await Promise.all(keys.map(k => cache.delete(k)));
            
            console.log('🗑️ Cache cleared:', keys.length);
            
            // Success toast
            const toast = document.createElement('div');
            toast.style.cssText = `
                position: fixed; bottom: 120px; right: 20px;
                background: linear-gradient(135deg, #34C759, #30B350);
                color: white; padding: 12px 20px; border-radius: 10px;
                font-weight: 600; z-index: 99999;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            `;
            toast.textContent = '✅ Cache dihapus!';
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 2500);
            
        } catch (error) {
            alert('❌ Gagal: ' + error.message);
        }
    };
    
    console.log('✅ Offline Manager ready');
    
})();
