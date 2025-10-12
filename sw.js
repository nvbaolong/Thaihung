// Tên của bộ nhớ cache - thay đổi tên này khi bạn cập nhật các tệp trong cache
const CACHE_NAME = 'sales-dashboard-v3'; // <-- THAY ĐỔI LÊN v3

// Danh sách các tệp cần thiết để ứng dụng có thể chạy offline
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
  // CÁC LINK CDN CẦN CACHE
  'https://cdn.tailwindcss.com', // <-- THÊM DÒNG NÀY
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'
];

// Sự kiện "install": được gọi khi Service Worker được cài đặt lần đầu
self.addEventListener('install', (evt) => {
  console.log('[ServiceWorker] Install');
  evt.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Pre-caching offline page');
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Sự kiện "activate": dọn dẹp cache cũ
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

// Sự kiện "fetch": được gọi mỗi khi ứng dụng yêu cầu một tài nguyên
self.addEventListener('fetch', (evt) => {
  if (evt.request.method !== 'GET') {
    return;
  }
  evt.respondWith(
    caches.match(evt.request).then((response) => {
      // Nếu có trong cache, trả về từ cache
      if (response) {
        return response;
      }
      // Nếu không có trong cache, thử lấy từ mạng
      return fetch(evt.request);
    })
  );
});