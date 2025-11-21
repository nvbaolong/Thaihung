const CACHE_NAME = 'sales-dashboard-v3';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './manage.html',
    './history.html',
    './customers.html',
    './purchase.html',
    './order-detail.html',
    './purchase-detail.html',
    './style.css',
    './db.js',
    './supabase-client.js',
    './sync.js',
    './script.js',
    './manage.js',
    './history.js',
    './customers.js',
    './purchase.js',
    './order-detail.js',
    './purchase-detail.js',
    // External Libraries (CDNs)
    'https://cdn.tailwindcss.com',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

// 1. INSTALL: Cache từng file một, lỗi file nào bỏ qua file đó (không chết cả chùm)
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installing...');
    // Skip waiting để kích hoạt ngay lập tức
    self.skipWaiting();

    event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            for (const url of ASSETS_TO_CACHE) {
                try {
                    const response = await fetch(url);
                    if (!response.ok) throw new Error(`Status ${response.status}`);
                    await cache.put(url, response);
                    console.log(`[Service Worker] Cached: ${url}`);
                } catch (error) {
                    console.error(`[Service Worker] Failed to cache: ${url}`, error);
                }
            }
        })
    );
});

// 2. ACTIVATE: Xóa cache cũ và claim clients ngay
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activating...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('[Service Worker] Deleting old cache:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim()) // Kiểm soát các trang ngay lập tức
    );
});

// 3. FETCH: Chiến lược "Cache First, Network Fallback, Runtime Caching"
self.addEventListener('fetch', (event) => {
    // Bỏ qua các request không phải GET hoặc chrome-extension
    if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension')) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // A. Nếu có trong cache -> Trả về ngay
            if (cachedResponse) {
                return cachedResponse;
            }

            // B. Nếu không có -> Tải từ mạng
            return fetch(event.request)
                .then((networkResponse) => {
                    // Kiểm tra response hợp lệ
                    if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'error') {
                        return networkResponse;
                    }

                    // C. Tải thành công -> Lưu vào cache cho lần sau (Runtime Caching)
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });

                    return networkResponse;
                })
                .catch((error) => {
                    console.error('[Service Worker] Fetch failed:', error);
                    // Có thể trả về trang offline.html ở đây nếu muốn
                });
        })
    );
});
