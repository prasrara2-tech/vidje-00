// ===================================================================
// VIDJE OFFLINE MANAGER - FIXED VERSION v2.1
// ===================================================================
// FIXES:
// ✅ Removed broadcastToClients (only for SW context)
// ✅ Proper window context only
// ✅ Better error handling
// ===================================================================

console.log('🔧 Offline Manager v2.1 Loading...');

// ============================================================
// 1. REGISTER SERVICE WORKER - WAJIB!
// ============================================================

if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            // Unregister old service workers first
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (let registration of registrations) {
                await registration.unregister();
                console.log('🗑️ Unregistered old SW');
            }
            
            // Register new fixed service worker
            const registration = await navigator.serviceWorker.register('/sw.js', {
                scope: '/',
                updateViaCache: 'none' // Always check for updates
            });
            
            console.log('✅ Service Worker registered:', registration.scope);
            
            // Wait for SW to be ready
            await navigator.serviceWorker.ready;
            console.log('✅ Service Worker ready!');
            
            // Check for updates periodically
            setInterval(() => {
                registration.update();
            }, 60 * 60 * 1000); // Every hour
            
            // Listen for updates
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        showUpdateAvailable();
                    }
                });
            });
            
        } catch (err) {
            console.error('❌ SW Registration failed:', err);
            showSWError();
        }
    });
} else {
    console.error('❌ Service Worker not supported');
    showSWNotSupported();
}

function showUpdateAvailable() {
    const toast = document.createElement('div');
    toast.innerHTML = `
        <div style="position: fixed; top: 80px; left: 50%; transform: translateX(-50%);
                    background: linear-gradient(135deg, #34C759, #30B350);
                    color: white; padding: 16px 24px; border-radius: 12px;
                    font-weight: 600; z-index: 99999; box-shadow: 0 8px 20px rgba(0,0,0,0.4);
                    display: flex; align-items: center; gap: 12px;">
            <i class="ph-fill ph-arrow-clockwise" style="font-size: 20px;"></i>
            <div>
                <div style="font-size: 14px;">Update Tersedia</div>
                <button onclick="location.reload()" 
                        style="margin-top: 8px; background: white; color: #34C759; 
                               border: none; padding: 6px 12px; border-radius: 6px;
                               font-weight: 600; cursor: pointer; font-size: 12px;">
                    Refresh Sekarang
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(toast);
}

function showSWError() {
    alert('⚠️ Service Worker gagal diaktifkan.\n\nMode offline mungkin tidak berfungsi sempurna.');
}

function showSWNotSupported() {
    alert('❌ Browser Anda tidak mendukung Service Worker.\n\nGunakan Chrome, Firefox, Safari, atau Edge terbaru untuk mode offline.');
}

// ============================================================
// 2. OFFLINE DETECTION
// ============================================================

let isOffline = !navigator.onLine;
let offlineStartTime = null;

function updateOnlineStatus() {
    const wasOffline = isOffline;
    isOffline = !navigator.onLine;
    
    if (isOffline && !wasOffline) {
        offlineStartTime = Date.now();
        showOfflineNotification();
        document.body.classList.add('offline-mode');
    } else if (!isOffline && wasOffline) {
        const offlineDuration = offlineStartTime ? Math.round((Date.now() - offlineStartTime) / 1000) : 0;
        showOnlineNotification(offlineDuration);
        document.body.classList.remove('offline-mode');
        offlineStartTime = null;
        
        // Sync data when back online
        syncOfflineData();
    }
    
    updateOfflineIndicator();
}

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
document.addEventListener('DOMContentLoaded', updateOnlineStatus);

function showOfflineNotification() {
    const toast = document.createElement('div');
    toast.id = 'offline-toast';
    toast.innerHTML = `
        <div style="position: fixed; top: 80px; left: 50%; transform: translateX(-50%);
                    background: linear-gradient(135deg, #ff9500, #ff8800);
                    color: white; padding: 16px 24px; border-radius: 12px;
                    font-weight: 600; z-index: 99999; box-shadow: 0 8px 20px rgba(0,0,0,0.4);
                    display: flex; align-items: center; gap: 12px; min-width: 320px;">
            <i class="ph-fill ph-wifi-slash" style="font-size: 24px;"></i>
            <div style="flex: 1;">
                <div style="font-size: 14px; font-weight: 700;">Mode Offline</div>
                <div style="font-size: 12px; opacity: 0.9; margin-top: 4px;">
                    Hanya lagu yang sudah di-download yang bisa diputar
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
}

function showOnlineNotification(duration) {
    const toast = document.createElement('div');
    const durationText = duration > 0 ? ` (offline ${duration}s)` : '';
    toast.innerHTML = `
        <div style="position: fixed; top: 80px; left: 50%; transform: translateX(-50%);
                    background: linear-gradient(135deg, #34C759, #30B350);
                    color: white; padding: 16px 24px; border-radius: 12px;
                    font-weight: 600; z-index: 99999; box-shadow: 0 8px 20px rgba(0,0,0,0.4);
                    display: flex; align-items: center; gap: 12px;">
            <i class="ph-fill ph-wifi-high" style="font-size: 24px;"></i>
            <div>
                <div style="font-size: 14px;">Kembali Online${durationText}</div>
                <div style="font-size: 12px; opacity: 0.9; margin-top: 2px;">Sinkronisasi data...</div>
            </div>
        </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function updateOfflineIndicator() {
    let indicator = document.getElementById('offline-indicator');
    
    if (isOffline) {
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'offline-indicator';
            indicator.innerHTML = `
                <div style="position: fixed; top: 16px; right: 16px; z-index: 9998;
                            background: rgba(255, 149, 0, 0.95); color: white;
                            padding: 8px 16px; border-radius: 20px; font-size: 12px;
                            font-weight: 700; display: flex; align-items: center; gap: 8px;
                            backdrop-filter: blur(10px); box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
                    <i class="ph-fill ph-wifi-slash"></i>
                    <span>OFFLINE</span>
                </div>
            `;
            document.body.appendChild(indicator);
        }
    } else {
        if (indicator) {
            indicator.style.transition = 'opacity 0.3s';
            indicator.style.opacity = '0';
            setTimeout(() => indicator.remove(), 300);
        }
    }
}

// ============================================================
// 3. DOWNLOAD PLAYLIST FOR OFFLINE - FIXED!
// ============================================================

window.downloadPlaylistForOffline = async function() {
    const playlistId = window.currentPlaylistId;
    if (!playlistId) {
        alert('⚠️ Tidak ada playlist yang sedang dibuka');
        return;
    }

    const playlist = window.playlists?.[playlistId];
    if (!playlist?.songs || playlist.songs.length === 0) {
        alert('⚠️ Playlist kosong');
        return;
    }

    // Check if SW is ready
    if (!navigator.serviceWorker || !navigator.serviceWorker.controller) {
        const retry = confirm(
            '❌ Service Worker belum aktif.\n\n' +
            'Refresh halaman dan coba lagi?\n\n' +
            '(Diperlukan untuk mode offline)'
        );
        if (retry) {
            location.reload();
        }
        return;
    }

    const songs = playlist.songs;
    const totalSongs = songs.length;
    const estimatedMB = Math.ceil(totalSongs * 5);

    const confirmed = confirm(
        `📥 Download ${totalSongs} lagu untuk offline?\n\n` +
        `Perkiraan ukuran: ~${estimatedMB} MB\n` +
        `Lagu akan disimpan di cache browser.\n\n` +
        `Pastikan koneksi internet stabil.`
    );

    if (!confirmed) return;

    // Show progress UI
    const progressDiv = document.createElement('div');
    progressDiv.id = 'offline-download-progress';
    progressDiv.innerHTML = `
        <div style="position: fixed; bottom: 120px; right: 20px;
                    background: linear-gradient(135deg, #1a1a1a, #2a2a2a);
                    color: white; padding: 20px 24px; border-radius: 16px;
                    font-weight: 600; z-index: 99999;
                    box-shadow: 0 12px 24px rgba(0,0,0,0.5);
                    min-width: 340px; max-width: 400px;
                    border: 1px solid rgba(229, 9, 20, 0.4);">
            
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 14px;">
                <i class="ph-fill ph-download-simple" 
                   style="font-size: 28px; color: var(--primary-red);"></i>
                <div style="flex: 1;">
                    <div style="font-size: 15px; font-weight: 700;">Downloading Offline</div>
                    <div style="font-size: 12px; color: rgba(255,255,255,0.7); margin-top: 2px;">
                        <span id="download-count-display">0</span> / ${totalSongs} lagu
                    </div>
                </div>
            </div>
            
            <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.1); 
                        border-radius: 3px; overflow: hidden; margin-bottom: 10px;">
                <div id="download-progress-bar" 
                     style="width: 0%; height: 100%; background: var(--primary-red); 
                            transition: width 0.3s ease; border-radius: 3px;"></div>
            </div>
            
            <div id="current-song-name" 
                 style="font-size: 11px; color: rgba(255,255,255,0.6); 
                        text-overflow: ellipsis; overflow: hidden; 
                        white-space: nowrap; font-weight: 500;"></div>
        </div>
    `;
    document.body.appendChild(progressDiv);

    let downloaded = 0;
    let failed = 0;
    const failedSongs = [];

    // Download each song
    for (let i = 0; i < songs.length; i++) {
        const song = songs[i];
        
        // Update UI
        const currentSongEl = document.getElementById('current-song-name');
        if (currentSongEl) {
            currentSongEl.textContent = `${song.name} - ${song.artist}`;
        }
        
        try {
            // Method 1: Fetch to trigger SW caching
            console.log(`📥 Downloading [${i+1}/${totalSongs}]:`, song.name);
            
            const response = await fetch(song.audio_url, {
                method: 'GET',
                mode: 'cors',
                credentials: 'omit',
                cache: 'reload' // Force fresh download
            });

            if (response.ok) {
                // Read the full response to ensure it's cached
                const blob = await response.blob();
                console.log(`✅ Downloaded: ${song.name} (${(blob.size/1024/1024).toFixed(2)} MB)`);
                
                // Send to SW for explicit caching
                if (navigator.serviceWorker.controller) {
                    navigator.serviceWorker.controller.postMessage({
                        type: 'CACHE_MUSIC',
                        data: {
                            url: song.audio_url,
                            metadata: {
                                id: song.id,
                                name: song.name,
                                artist: song.artist,
                                cover_url: song.cover_url
                            }
                        }
                    });
                }
                
                downloaded++;
            } else {
                throw new Error(`HTTP ${response.status}`);
            }

        } catch (error) {
            console.error(`❌ Failed [${i+1}/${totalSongs}]:`, song.name, error);
            failed++;
            failedSongs.push(song.name);
        }

        // Update progress
        const progress = Math.round(((i + 1) / totalSongs) * 100);
        const progressBar = document.getElementById('download-progress-bar');
        const countDisplay = document.getElementById('download-count-display');
        
        if (progressBar) progressBar.style.width = progress + '%';
        if (countDisplay) countDisplay.textContent = (downloaded + failed);
        
        // Small delay to prevent overwhelming the browser
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Remove progress UI
    setTimeout(() => {
        progressDiv.style.transition = 'opacity 0.3s';
        progressDiv.style.opacity = '0';
        setTimeout(() => progressDiv.remove(), 300);
    }, 500);

    // Show result
    setTimeout(() => {
        const resultToast = document.createElement('div');
        
        if (failed === 0) {
            resultToast.innerHTML = `
                <div style="position: fixed; bottom: 120px; right: 20px;
                            background: linear-gradient(135deg, #34C759, #30B350);
                            color: white; padding: 18px 24px; border-radius: 12px;
                            font-weight: 600; z-index: 99999;
                            box-shadow: 0 8px 20px rgba(0,0,0,0.4);
                            display: flex; align-items: center; gap: 12px;">
                    <i class="ph-fill ph-check-circle" style="font-size: 28px;"></i>
                    <div>
                        <div style="font-size: 14px; font-weight: 700;">Download Selesai!</div>
                        <div style="font-size: 12px; opacity: 0.9; margin-top: 2px;">
                            ${downloaded} lagu siap diputar offline
                        </div>
                    </div>
                </div>
            `;
        } else {
            const failedList = failedSongs.slice(0, 3).join(', ') + (failedSongs.length > 3 ? '...' : '');
            resultToast.innerHTML = `
                <div style="position: fixed; bottom: 120px; right: 20px;
                            background: linear-gradient(135deg, #ff9500, #ff8800);
                            color: white; padding: 18px 24px; border-radius: 12px;
                            font-weight: 600; z-index: 99999;
                            box-shadow: 0 8px 20px rgba(0,0,0,0.4);
                            max-width: 360px;">
                    <div style="display: flex; align-items: start; gap: 12px;">
                        <i class="ph-fill ph-warning" style="font-size: 24px; margin-top: 2px;"></i>
                        <div>
                            <div style="font-size: 14px; font-weight: 700;">
                                ${downloaded} berhasil, ${failed} gagal
                            </div>
                            <div style="font-size: 11px; opacity: 0.9; margin-top: 4px;">
                                Gagal: ${failedList}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        document.body.appendChild(resultToast);
        setTimeout(() => {
            resultToast.style.transition = 'opacity 0.3s';
            resultToast.style.opacity = '0';
            setTimeout(() => resultToast.remove(), 300);
        }, 5000);
    }, 700);

    // Update button state
    const downloadBtn = document.getElementById('download-offline-btn');
    if (downloadBtn) {
        downloadBtn.innerHTML = '<i class="ph-fill ph-check-circle" style="font-size: 24px; color: #34C759;"></i>';
        downloadBtn.title = `${downloaded} lagu tersedia offline`;
        
        setTimeout(() => {
            downloadBtn.innerHTML = '<i class="ph ph-download-simple" style="font-size: 24px;"></i>';
            downloadBtn.title = 'Download untuk Offline';
        }, 4000);
    }
    
    // Update cache indicators
    setTimeout(() => {
        if (window.updateOfflineCacheIndicators) {
            window.updateOfflineCacheIndicators();
        }
    }, 1000);
};

// ============================================================
// 4. CHECK CACHED SONGS
// ============================================================

window.getCachedSongs = async function() {
    if (!('caches' in window)) {
        return [];
    }
    
    try {
        const musicCache = await caches.open('vidje-music-v3002');
        const requests = await musicCache.keys();
        return requests.map(req => req.url);
    } catch (error) {
        console.error('Failed to get cached songs:', error);
        return [];
    }
};

// ============================================================
// 5. SYNC OFFLINE DATA
// ============================================================

async function syncOfflineData() {
    console.log('🔄 Syncing offline data...');
    
    // Sync tracking queue
    if (window.syncTrackingQueue) {
        try {
            await window.syncTrackingQueue();
        } catch (error) {
            console.error('Failed to sync tracking queue:', error);
        }
    }
    
    // Notify user
    const toast = document.createElement('div');
    toast.innerHTML = `
        <div style="position: fixed; bottom: 120px; right: 20px;
                    background: rgba(52, 199, 89, 0.95);
                    color: white; padding: 12px 20px; border-radius: 8px;
                    font-size: 13px; font-weight: 600; z-index: 99999;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
            ✅ Data tersinkronisasi
        </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
}

// ============================================================
// 6. PWA INSTALL PROMPT
// ============================================================

let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Show install button/banner
    showInstallPrompt();
});

function showInstallPrompt() {
    // Only show if not already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
        console.log('✅ Already installed as PWA');
        return;
    }
    
    const installBanner = document.createElement('div');
    installBanner.id = 'pwa-install-banner';
    installBanner.innerHTML = `
        <div style="position: fixed; bottom: calc(90px + 16px); left: 12px; right: 12px;
                    background: linear-gradient(135deg, #e50914, #ff1f2c);
                    color: white; padding: 16px 20px; border-radius: 12px;
                    font-weight: 600; z-index: 20000;
                    box-shadow: 0 8px 20px rgba(229, 9, 20, 0.4);
                    display: flex; align-items: center; gap: 12px;">
            <div style="flex: 1;">
                <div style="font-size: 14px; font-weight: 700; margin-bottom: 4px;">
                    📱 Install Vidje
                </div>
                <div style="font-size: 12px; opacity: 0.95;">
                    Akses offline, login offline, notifikasi
                </div>
            </div>
            <button onclick="installPWA()" 
                    style="background: white; color: #e50914; border: none;
                           padding: 10px 18px; border-radius: 8px; font-weight: 700;
                           cursor: pointer; font-size: 13px;">
                Install
            </button>
            <button onclick="dismissInstallPrompt()" 
                    style="background: transparent; color: white; border: none;
                           padding: 8px; cursor: pointer; font-size: 20px;">
                <i class="ph ph-x"></i>
            </button>
        </div>
    `;
    document.body.appendChild(installBanner);
}

window.installPWA = async function() {
    if (!deferredPrompt) {
        alert('Install prompt tidak tersedia. Gunakan menu browser untuk install.');
        return;
    }
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
        console.log('✅ PWA installed');
    } else {
        console.log('❌ PWA install declined');
    }
    
    deferredPrompt = null;
    const banner = document.getElementById('pwa-install-banner');
    if (banner) banner.remove();
};

window.dismissInstallPrompt = function() {
    const banner = document.getElementById('pwa-install-banner');
    if (banner) banner.remove();
    localStorage.setItem('pwa-install-dismissed', Date.now());
};

// Check if already installed
if (window.matchMedia('(display-mode: standalone)').matches) {
    console.log('✅ Running as installed PWA');
    document.body.classList.add('pwa-installed');
}

console.log('✅ Offline Manager v2.1 Loaded - Ready for offline use!');
