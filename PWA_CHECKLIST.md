# PWA Installation Checklist untuk Android Chrome

## ✅ Yang Sudah Diperbaiki

### 1. **Manifest Requirements**
- ✅ `name` - Nama aplikasi lengkap
- ✅ `short_name` - Nama singkat (12 karakter)
- ✅ `description` - Deskripsi aplikasi
- ✅ `start_url` - URL awal aplikasi
- ✅ `scope` - Scope aplikasi
- ✅ `display` - Mode standalone
- ✅ `background_color` - Warna background splash screen
- ✅ `theme_color` - Warna tema
- ✅ `orientation` - Orientasi portrait
- ✅ `icons` - Icon 192x192 dan 512x512 (WAJIB untuk Android)
- ✅ `screenshots` - Screenshot untuk app store listing
- ✅ `categories` - Kategori aplikasi

### 2. **Service Worker**
- ✅ Registered di `index.html`
- ✅ File: `sw.js`
- ✅ Fetch event listener untuk caching
- ✅ Install event untuk caching resources
- ✅ Activate event untuk cleanup

### 3. **HTTP Headers** (via .htaccess)
- ✅ Cache-Control headers
- ✅ MIME type untuk manifest.json
- ✅ Gzip compression

### 4. **Meta Tags**
- ✅ `viewport` meta tag
- ✅ `theme-color` meta tag
- ✅ `apple-mobile-web-app-capable` untuk iOS

### 5. **Install Prompt**
- ✅ beforeinstallprompt event handler
- ✅ Download button di UI

## 🔍 Troubleshooting untuk Android Chrome

Jika masih tidak bisa diinstall sebagai full app:

### 1. **Clear Chrome Data**
```
Chrome Settings → Apps and notifications → Vidje
Uninstall
Clear all data
```

### 2. **Check Chrome DevTools**
```
F12 → Application → Manifest
- Harus ada ✅ pada semua checklist items
- Pastikan tidak ada error (warna merah)
```

### 3. **Force Re-register Service Worker**
```
Chrome URL Bar: chrome://inspect/#service-workers
Unregister SW dan refresh halaman
```

### 4. **Check Network**
```
DevTools → Network
- manifest.json status: 200
- sw.js status: 200
- Tidak ada CORS error
```

## 📱 Cara Install Manual jika Button Tidak Muncul

1. **Di Chrome Android:**
   - Buka `http://192.168.x.x/vidje/` (ganti IP sesuai server)
   - Buka menu (⋮) → "Installar aplicación"
   - Atau: "Add to Home Screen" dari Chrome menu

2. **Check Installer Requirements:**
   - Manifest valid ✅
   - Service Worker active ✅
   - HTTPS atau localhost ✅
   - Minimum icon size 192x192 ✅

## 🐛 Debug Logs

Buka Console (F12) dan lihat pesan:

```javascript
// Manifest check
✅ Manifest loaded: {...}

// Service Worker
✅ Service Worker registered!
✅ Service Worker active

// Install prompt
📱 beforeinstallprompt fired!
✅ Install button created and displayed
```

Jika tidak ada log, berarti ada error di tahap tersebut.

## ⚙️ Advanced: Test dengan Lighthouse

```
Chrome DevTools → Lighthouse
→ Progressive Web App
→ Generate Report
```

Akan menunjukkan skor PWA dan apa yang kurang.

## 📋 File-file PWA

```
/vidje/
├── index.html         (dengan manifest link)
├── manifest.json      (PWA configuration)
├── sw.js              (Service Worker)
├── .htaccess          (Server headers)
└── assets/
    └── vidje-icon.jpg (Icon untuk PWA)
```

## 🔗 Sumber Resmi

- https://web.dev/install-criteria/
- https://developer.chrome.com/docs/web-platform/install/
- https://web.dev/progressive-web-apps/
