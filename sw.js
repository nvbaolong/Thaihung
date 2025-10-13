// Thay đổi phiên bản mỗi khi bạn deploy code mới
const CACHE_NAME = 'sales-dashboard-v5';

const FILES_TO_CACHE = [
  '/',
  'index.html',
  'history.html',
  'manage.html',
  'customers.html',
  'purchase.html',
  'order-detail.html',
  'purchase-detail.html',
  'style.css',
  'db.js',
  'script.js',
  'history.js',
  'manage.js',
  'customers.js',
  'purchase.js',
  'order-detail.js',
  'purchase-detail.js',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'
];

self.addEventListener('install', (evt) => {
  console.log('[ServiceWorker] Install');
  evt.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Pre-caching offline pages');
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  // Không gọi skipWaiting() ngay lập tức ở đây nữa
});

self.addEventListener('activate', (evt) => {
    console.log('[ServiceWorker] Activate');
    evt.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    console.log('[ServiceWorker] Removing old cache', key);
                    return caches.delete(key);
                }
            }));
        })
    );
    self.clients.claim();
});

// --- THÊM SỰ KIỆN MỚI NÀY VÀO ---
self.addEventListener('message', (event) => {
    if (event.data && event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});
// ------------------------------------

self.addEventListener('fetch', (evt) => {
  if (evt.request.method !== 'GET') return;

  evt.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        // Ưu tiên fetch bản mới nhất
        const fresh = await fetch(evt.request);
        cache.put(evt.request, fresh.clone());
        return fresh;
      } catch (e) {
        // Nếu offline, dùng cache cũ
        const cached = await cache.match(evt.request);
        return cached || Promise.reject('no-match');
      }
    })
  );
});
