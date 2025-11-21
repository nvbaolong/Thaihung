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
    'https://cdn.tailwindcss.com',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

// Install Service Worker
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Đang cache các tài nguyên...');
                return cache.addAll(ASSETS_TO_CACHE);
            })
    );
});

// Activate Service Worker
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('Xóa cache cũ:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
});

// Fetch Event
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Nếu có trong cache thì trả về
                if (response) {
                    return response;
                }
                // Nếu không thì tải từ mạng
                return fetch(event.request).catch(() => {
                    // Nếu mất mạng và không có trong cache
                    // Có thể trả về trang offline.html nếu muốn (nhưng ở đây ta cache hết app rồi)
                });
            })
    );
});
