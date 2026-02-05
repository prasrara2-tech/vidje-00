// ===================================================================
// Vidje Offline Manager - Simplified & No Annoying Popups
// ===================================================================

(function() {
    'use strict';
    
    console.log('🔌 Offline Manager v3.0 - Loading...');
    
    // ============================================================
    // SERVICE WORKER REGISTRATION - SILENT MODE
    // ============================================================
    
    if ('serviceWorker' in navigator) {
        // Check if SW registration should be attempted
        navigator.serviceWorker.register('sw.js?v=3002', {
            updateViaCache: 'none',
            scope: '/'
        })
        .then(registration => {
            console.log('✅ Service Worker registered successfully');
            console.log('📡 Scope:', registration.scope);
            
            // Auto-update check
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                console.log('🔄 Service Worker update found');
                
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        console.log('✨ New Service Worker available - will refresh on next visit');
                    }
                });
            });
            
            // Check for updates every 5 minutes
            setInterval(() => {
                registration.update().catch(err => {
                    console.log('⚠️ SW update check failed (normal if offline)');
                });
            }, 5 * 60 * 1000);
        })
        .catch(error => {
            // SILENT MODE - hanya log ke console, tidak popup
            console.warn('⚠️ Service Worker registration failed:', error.message);
            console.info('💡 Mode offline tidak tersedia. Aplikasi tetap berfungsi online.');
        });
        
        // Listen to SW messages
        navigator.serviceWorker.addEventListener('message', event => {
            const { type, data } = event.data || {};
            
            switch(type) {
                case 'MUSIC_CACHED':
                    console.log('✅ Music cached:', data?.url);
                    // Update UI if needed
                    if (window.updateOfflineCacheIndicators) {
                        window.updateOfflineCacheIndicators();
                    }
                    break;
                    
                case 'CACHE_CLEARED':
                    console.log('🗑️ Cache cleared');
                    break;
                    
                default:
                    console.log('📬 SW message:', type, data);
            }
        });
    } else {
        console.info('⚠️ Service Workers not supported in this browser');
    }
    
    // ============================================================
    // OFFLINE STATUS MONITORING
    // ============================================================
    
    let isOnline = navigator.onLine;
    
    function updateOnlineStatus() {
        isOnline = navigator.onLine;
        
        // Update UI
        const statusIndicator = document.querySelector('.offline-status-indicator');
        
        if (!isOnline) {
            // Show offline indicator
            if (!statusIndicator) {
                const indicator = document.createElement('div');
                indicator.className = 'offline-status-indicator';
                indicator.innerHTML = `
                    <div style="position: fixed; top: 10px; left: 50%; transform: translateX(-50%);
                                background: linear-gradient(135deg, #ff6b00 0%, #ff8800 100%);
                                color: white; padding: 8px 20px; border-radius: 20px;
                                font-size: 13px; font-weight: 600; z-index: 99999;
                                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                                display: flex; align-items: center; gap: 8px;">
                        <i class="ph-fill ph-wifi-slash" style="font-size: 16px;"></i>
                        Mode Offline
                    </div>
                `;
                document.body.appendChild(indicator);
            }
            console.log('📴 You are offline - cached content will be used');
        } else {
            // Remove offline indicator
            if (statusIndicator) {
                statusIndicator.remove();
            }
            console.log('📶 You are back online');
        }
    }
    
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    // Initial check
    updateOnlineStatus();
    
    // ============================================================
    // CACHE INFO
    // ============================================================
    
    window.getOfflineCacheInfo = async function() {
        if (!('caches' in window)) {
            return { supported: false };
        }
        
        try {
            const musicCache = await caches.open('vidje-music-v3002');
            const imageCache = await caches.open('vidje-images-v3002');
            
            const musicKeys = await musicCache.keys();
            const imageKeys = await imageCache.keys();
            
            return {
                supported: true,
                musicCount: musicKeys.length,
                imageCount: imageKeys.length,
                isOnline: navigator.onLine
            };
        } catch (error) {
            console.error('Failed to get cache info:', error);
            return { supported: false, error: error.message };
        }
    };
    
    // ============================================================
    // CLEAR OFFLINE CACHE
    // ============================================================
    
    window.clearOfflineCache = async function() {
        if (!('caches' in window)) {
            alert('⚠️ Cache API tidak didukung browser ini');
            return;
        }
        
        try {
            const confirmed = confirm('Hapus semua musik yang di-cache offline?');
            if (!confirmed) return;
            
            const musicCache = await caches.open('vidje-music-v3002');
            const imageCache = await caches.open('vidje-images-v3002');
            
            const musicKeys = await musicCache.keys();
            const imageKeys = await imageCache.keys();
            
            await Promise.all([
                ...musicKeys.map(key => musicCache.delete(key)),
                ...imageKeys.map(key => imageCache.delete(key))
            ]);
            
            console.log('🗑️ Cache cleared:', {
                music: musicKeys.length,
                images: imageKeys.length
            });
            
            // Show success toast
            const toast = document.createElement('div');
            toast.innerHTML = `
                <div style="position: fixed; bottom: 120px; right: 20px;
                            background: linear-gradient(135deg, #34C759 0%, #30B350 100%);
                            color: white; padding: 16px 24px; border-radius: 12px;
                            font-weight: 600; z-index: 99999;
                            box-shadow: 0 8px 20px rgba(0,0,0,0.4);">
                    ✅ Cache offline berhasil dihapus!
                </div>
            `;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
            
        } catch (error) {
            console.error('Failed to clear cache:', error);
            alert('❌ Gagal menghapus cache: ' + error.message);
        }
    };
    
    // ============================================================
    // CACHE SIZE ESTIMATOR
    // ============================================================
    
    window.getOfflineCacheSize = async function() {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            try {
                const estimate = await navigator.storage.estimate();
                const usageInMB = (estimate.usage / 1024 / 1024).toFixed(2);
                const quotaInMB = (estimate.quota / 1024 / 1024).toFixed(2);
                
                return {
                    usage: usageInMB + ' MB',
                    quota: quotaInMB + ' MB',
                    percentage: ((estimate.usage / estimate.quota) * 100).toFixed(1) + '%'
                };
            } catch (error) {
                console.error('Failed to estimate storage:', error);
                return null;
            }
        }
        return null;
    };
    
    console.log('✅ Offline Manager loaded successfully');
    
})();
