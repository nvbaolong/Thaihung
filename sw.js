// Tên của bộ nhớ cache - thay đổi tên này khi bạn cập nhật các tệp trong cache
const CACHE_NAME = 'sales-dashboard-v1';

// Danh sách các tệp cần thiết để ứng dụng có thể chạy offline
const FILES_TO_CACHE = [
  '/', // Dòng này quan trọng để cache trang chủ
  'index.html',
  'history.html',
  'manage.html',
  'customers.html',
  'purchase.html',
  'style.css',
  'db.js',
  'script.js',
  'history.js',
  'manage.js',
  'customers.js',
  'purchase.js',
  // Thêm link Font Awesome nếu bạn dùng CDN, nếu không thì bỏ qua
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'
];

// Sự kiện "install": được gọi khi Service Worker được cài đặt lần đầu
self.addEventListener('install', (evt) => {
  console.log('[ServiceWorker] Install');
  // Chờ cho đến khi tất cả các tệp cốt lõi được cache thành công
  evt.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Pre-caching offline page');
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Sự kiện "fetch": được gọi mỗi khi ứng dụng yêu cầu một tài nguyên (ví dụ: tải ảnh, file css)
self.addEventListener('fetch', (evt) => {
  // Bỏ qua các yêu cầu không phải GET
  if (evt.request.method !== 'GET') {
    return;
  }
  
  evt.respondWith(
    // Ưu tiên tìm tài nguyên trong cache trước
    caches.match(evt.request).then((response) => {
      if (response) {
        // Nếu có trong cache, trả về từ cache
        console.log(`[ServiceWorker] Serving from cache: ${evt.request.url}`);
        return response;
      }
      // Nếu không có trong cache, thử lấy từ mạng
      console.log(`[ServiceWorker] Fetching from network: ${evt.request.url}`);
      return fetch(evt.request);
    })
  );
});