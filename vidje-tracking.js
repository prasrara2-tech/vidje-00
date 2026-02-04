// ===== VIDJE TRACKING SYSTEM (FIXED FOR FIREBASE AUTH) =====
// Shared code untuk index.html dan wrapped.html

// Supabase config
const SUPABASE_URL = 'https://qkruoywwqdpkdjlajbpl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrcnVveXd3cWRwa2RqbGFqYnBsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NDY3OTcsImV4cCI6MjA4NTAyMjc5N30.6NQGI-d13SVih3VKOuSEvLYTeP5tf9QhEUyfi6mBEiA';

// Initialize Supabase client
let supabaseClient;

function initializeSupabase() {
    try {
        // Check if Supabase library is loaded
        if (typeof window.supabase === 'undefined' || typeof window.supabase.createClient === 'undefined') {
            console.error('❌ ERROR: Supabase library not loaded!');
            console.error('Add this to your HTML <head>:');
            console.error('<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>');
            return false;
        }

        // Create Supabase client
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Supabase client initialized successfully');
        return true;
    } catch (error) {
        console.error('❌ Failed to initialize Supabase:', error);
        return false;
    }
}

// Try to initialize immediately
initializeSupabase();

// Helper: Get current user ID (works with Firebase Auth)
function getCurrentUserId() {
    // Method 1: Firebase Auth (digunakan di index.html)
    if (typeof auth !== 'undefined' && auth.currentUser) {
        return auth.currentUser.uid;
    }
    
    // Method 2: Check window.auth (alternatif)
    if (typeof window.auth !== 'undefined' && window.auth.currentUser) {
        return window.auth.currentUser.uid;
    }
    
    // Method 3: Anonymous user (fallback)
    console.warn('⚠️ No authenticated user found, using anonymous');
    return 'anonymous';
}

// ===== TRACKING FUNCTIONS (untuk index.html) =====

/**
 * Track song play - save to listening_history
 * Call this function setiap kali user play lagu
 * 
 * @param {Object} songData - { song_name, artist_name, duration?, cover_url?, audio_url? }
 * @returns {Object|null} - Inserted record atau null jika error
 */
async function trackSongPlay(songData) {
    try {
        // Validate Supabase client
        if (!supabaseClient) {
            console.error('❌ Supabase not initialized. Call initializeSupabase() first.');
            return null;
        }

        // Validate required fields
        if (!songData.song_name || !songData.artist_name) {
            console.error('❌ Missing required fields: song_name and artist_name');
            return null;
        }

        // Skip if song name is invalid
        if (songData.song_name === 'Unknown' || songData.song_name === '-' || songData.song_name.trim() === '') {
            console.log('⏭️ Skipping invalid song name');
            return null;
        }

        // Get current user ID
        const userId = getCurrentUserId();

        // Convert duration dari seconds ke minutes
        const durationMinutes = songData.duration ? (songData.duration / 60) : 3.5;

        // Prepare data - SEKARANG TERMASUK cover_url dan audio_url
        const trackingData = {
            user_id: userId,
            song_name: songData.song_name.trim(),
            artist_name: songData.artist_name.trim(),
            duration_minutes: durationMinutes,
            cover_url: songData.cover_url || null,  // ✅ DITAMBAHKAN
            audio_url: songData.audio_url || null,  // ✅ DITAMBAHKAN
            played_at: new Date().toISOString()
        };

        // Insert to database
        const { data, error } = await supabaseClient
            .from('listening_history')
            .insert([trackingData])
            .select();

        if (error) {
            console.error('❌ Failed to track song:', error);
            return null;
        }

        console.log('✅ Song tracked:', trackingData.song_name, 'by', trackingData.artist_name);
        console.log('   Cover URL:', trackingData.cover_url);
        console.log('   Audio URL:', trackingData.audio_url);
        return data[0];

    } catch (error) {
        console.error('❌ Tracking error:', error);
        return null;
    }
}

// ===== WRAPPED FUNCTIONS (untuk wrapped.html) =====

/**
 * Get top songs by play count
 * @param {number} limit - Maximum number of songs to return
 * @returns {Array} - Array of top songs with play counts
 */
async function getTopSongs(limit = 10) {
    try {
        if (!supabaseClient) {
            console.error('❌ Supabase not initialized');
            return [];
        }

        const userId = getCurrentUserId();
        console.log('📊 Fetching top songs for user:', userId);

        const { data, error } = await supabaseClient
            .from('listening_history')
            .select('song_name, artist_name, audio_url, cover_url')
            .eq('user_id', userId)
            .order('played_at', { ascending: false });

        if (error) {
            console.error('❌ Failed to fetch songs:', error);
            return [];
        }

        if (!data || data.length === 0) {
            console.log('ℹ️ No listening history found for user:', userId);
            return [];
        }

        console.log('📊 Found', data.length, 'listening records');

        // Count plays per song
        const songCounts = {};
        data.forEach(item => {
            const key = `${item.song_name}|||${item.artist_name}`;
            if (!songCounts[key]) {
                songCounts[key] = {
                    song_name: item.song_name,
                    artist_name: item.artist_name,
                    audio_url: item.audio_url || null,
                    cover_url: item.cover_url || null,
                    play_count: 0
                };
            }
            songCounts[key].play_count++;
            
            // Keep the latest audio_url and cover_url (yang paling baru)
            if (item.audio_url) songCounts[key].audio_url = item.audio_url;
            if (item.cover_url) songCounts[key].cover_url = item.cover_url;
        });

        // Convert to array and sort
        const topSongs = Object.values(songCounts)
            .sort((a, b) => b.play_count - a.play_count)
            .slice(0, limit);

        console.log(`✅ Top ${topSongs.length} songs fetched`);
        topSongs.forEach((song, i) => {
            console.log(`   ${i+1}. ${song.song_name} - ${song.artist_name} (${song.play_count} plays)`);
            console.log(`      Cover: ${song.cover_url || 'NO COVER'}`);
        });
        
        return topSongs;

    } catch (error) {
        console.error('❌ Fetch error:', error);
        return [];
    }
}

/**
 * Get top artists by play count
 * @param {number} limit - Maximum number of artists to return
 * @returns {Array} - Array of top artists with play counts
 */
async function getTopArtists(limit = 5) {
    try {
        if (!supabaseClient) {
            console.error('❌ Supabase not initialized');
            return [];
        }

        const userId = getCurrentUserId();
        console.log('🎤 Fetching top artists for user:', userId);

        const { data, error } = await supabaseClient
            .from('listening_history')
            .select('artist_name')
            .eq('user_id', userId);

        if (error) {
            console.error('❌ Failed to fetch artists:', error);
            return [];
        }

        if (!data || data.length === 0) {
            console.log('ℹ️ No listening history found');
            return [];
        }

        // Count plays per artist
        const artistCounts = {};
        data.forEach(item => {
            if (!artistCounts[item.artist_name]) {
                artistCounts[item.artist_name] = {
                    name: item.artist_name,
                    play_count: 0
                };
            }
            artistCounts[item.artist_name].play_count++;
        });

        // Convert to array and sort
        const topArtists = Object.values(artistCounts)
            .sort((a, b) => b.play_count - a.play_count)
            .slice(0, limit);

        console.log(`✅ Top ${topArtists.length} artists fetched`);
        return topArtists;

    } catch (error) {
        console.error('❌ Fetch error:', error);
        return [];
    }
}

/**
 * Get listening statistics
 * @returns {Object|null} - Stats object atau null jika error
 */
async function getListeningStats() {
    try {
        if (!supabaseClient) {
            console.error('❌ Supabase not initialized');
            return null;
        }

        const userId = getCurrentUserId();
        console.log('📈 Fetching stats for user:', userId);

        const { data, error } = await supabaseClient
            .from('listening_history')
            .select('*')
            .eq('user_id', userId);

        if (error) {
            console.error('❌ Failed to fetch stats:', error);
            return null;
        }

        if (!data || data.length === 0) {
            console.log('ℹ️ No listening history found');
            return {
                totalPlays: 0,
                uniqueSongs: 0,
                uniqueArtists: 0,
                totalMinutes: 0,
                peakHour: '0:00'
            };
        }

        // Calculate stats
        const totalPlays = data.length;
        const uniqueSongs = new Set(data.map(item => item.song_name)).size;
        const uniqueArtists = new Set(data.map(item => item.artist_name)).size;
        const totalMinutes = Math.round(
            data.reduce((sum, item) => sum + (item.duration_minutes || 3.5), 0)
        );

        // Get most played hour
        const hourCounts = {};
        data.forEach(item => {
            const hour = new Date(item.played_at).getHours();
            hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        });
        const peakHour = Object.entries(hourCounts)
            .sort((a, b) => b[1] - a[1])[0]?.[0] || 0;

        const stats = {
            totalPlays,
            uniqueSongs,
            uniqueArtists,
            totalMinutes,
            peakHour: `${peakHour}:00`
        };

        console.log('✅ Stats fetched:', stats);
        return stats;

    } catch (error) {
        console.error('❌ Stats error:', error);
        return null;
    }
}

// ===== HELPER FUNCTIONS =====

/**
 * Get all listening history for current user
 * @returns {Array} - Array of all listening records
 */
async function getAllListeningHistory() {
    try {
        if (!supabaseClient) {
            console.error('❌ Supabase not initialized');
            return [];
        }

        const userId = getCurrentUserId();

        const { data, error } = await supabaseClient
            .from('listening_history')
            .select('*')
            .eq('user_id', userId)
            .order('played_at', { ascending: false });

        if (error) {
            console.error('❌ Failed to fetch history:', error);
            return [];
        }

        return data || [];

    } catch (error) {
        console.error('❌ Fetch error:', error);
        return [];
    }
}

/**
 * Clear all listening history for current user
 * WARNING: This will delete all data!
 */
async function clearListeningHistory() {
    try {
        if (!supabaseClient) {
            console.error('❌ Supabase not initialized');
            return false;
        }

        const userId = getCurrentUserId();
        
        const confirmDelete = confirm('⚠️ Are you sure you want to delete ALL your listening history? This cannot be undone!');
        if (!confirmDelete) {
            console.log('❌ Delete cancelled');
            return false;
        }

        const { error } = await supabaseClient
            .from('listening_history')
            .delete()
            .eq('user_id', userId);

        if (error) {
            console.error('❌ Failed to clear history:', error);
            return false;
        }

        console.log('✅ Listening history cleared');
        return true;

    } catch (error) {
        console.error('❌ Clear error:', error);
        return false;
    }
}

/**
 * Get top songs by a specific artist
 * @param {string} artistName - Name of the artist
 * @param {number} limit - Maximum number of songs to return
 * @returns {Array} - Array of top songs from this artist with play counts
 */
async function getTopSongsByArtist(artistName, limit = 10) {
    try {
        if (!supabaseClient) {
            console.error('❌ Supabase not initialized');
            return [];
        }

        const userId = getCurrentUserId();
        console.log(`🎵 Fetching top songs by "${artistName}" for user:`, userId);

        const { data, error } = await supabaseClient
            .from('listening_history')
            .select('song_name, artist_name, audio_url, cover_url')
            .eq('user_id', userId)
            .eq('artist_name', artistName)
            .order('played_at', { ascending: false });

        if (error) {
            console.error('❌ Failed to fetch artist songs:', error);
            return [];
        }

        if (!data || data.length === 0) {
            console.log(`ℹ️ No songs found for artist: ${artistName}`);
            return [];
        }

        console.log(`📊 Found ${data.length} listening records for ${artistName}`);

        // Count plays per song
        const songCounts = {};
        data.forEach(item => {
            const key = item.song_name;
            if (!songCounts[key]) {
                songCounts[key] = {
                    song_name: item.song_name,
                    artist_name: item.artist_name,
                    audio_url: item.audio_url || null,
                    cover_url: item.cover_url || null,
                    play_count: 0
                };
            }
            songCounts[key].play_count++;
            
            // Keep the latest audio_url and cover_url
            if (item.audio_url) songCounts[key].audio_url = item.audio_url;
            if (item.cover_url) songCounts[key].cover_url = item.cover_url;
        });

        // Convert to array and sort
        const topSongs = Object.values(songCounts)
            .sort((a, b) => b.play_count - a.play_count)
            .slice(0, limit);

        console.log(`✅ Top ${topSongs.length} songs by ${artistName} fetched`);
        return topSongs;

    } catch (error) {
        console.error('❌ Fetch error:', error);
        return [];
    }
}

// ===== EXPORT FUNCTIONS =====
window.vidjeTracking = {
    initializeSupabase,
    trackSongPlay,
    getTopSongs,
    getTopArtists,
    getListeningStats,
    getAllListeningHistory,
    clearListeningHistory,
    getCurrentUserId,
    getTopSongsByArtist,
    supabase: supabaseClient
};

console.log('✅ Vidje Tracking System Loaded (Firebase Auth Compatible + Cover URL Support)');
console.log('💡 Available commands:');
console.log('  - vidjeTracking.trackSongPlay({song_name, artist_name, duration, cover_url, audio_url})');
console.log('  - vidjeTracking.getTopSongs(10)');
console.log('  - vidjeTracking.getTopArtists(5)');
console.log('  - vidjeTracking.getTopSongsByArtist("Artist Name", 10)');
console.log('  - vidjeTracking.getListeningStats()');
console.log('  - vidjeTracking.getAllListeningHistory()');
console.log('  - vidjeTracking.getCurrentUserId()');