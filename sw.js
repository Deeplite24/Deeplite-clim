// Service Worker ديال Deep Lite Clim — كيخلي التطبيق يخدم بلا انترنت
const CACHE_NAME = 'deeplite-clim-cache-v3';

// الملفات الأساسية اللي خاصها تتخزن مباشرة عند أول تحميل
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .catch(() => {}) // إلا كان شي ملف ناقص، ماتوقفش التثبيت
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// استراتيجية: جرب الأنترنت أولا (باش التحديثات تبان مباشرة)، وإلا فشلت (بلا نت) رجع النسخة المخزنة
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  event.respondWith(
    fetch(req)
      .then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
        }
        return networkResponse;
      })
      .catch(() => caches.match(req)) // بلا انترنت → رجع النسخة المخزنة
  );
});
