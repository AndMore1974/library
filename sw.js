const CACHE_NAME = 'dacha-library-v1';
const ASSETS = [
  '/library/',
  '/library/index.html',
  '/library/manifest.json',
  'https://accounts.google.com/gsi/client',
  'https://cdnjs.cloudflare.com/ajax/libs/quagga/0.12.1/quagga.min.js'
];

// Установка — кэшируем все файлы приложения
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Кэшируем основные файлы (внешние могут не закэшироваться — это нормально)
      return cache.addAll(['/library/', '/library/index.html', '/library/manifest.json'])
        .catch(err => console.log('Cache install partial error:', err));
    })
  );
  self.skipWaiting();
});

// Активация — удаляем старые кэши
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Перехват запросов — сначала сеть, при ошибке — кэш
self.addEventListener('fetch', event => {
  // Пропускаем запросы к Google Drive API и OpenLibrary — они нужны только онлайн
  const url = event.request.url;
  if (url.includes('googleapis.com') || url.includes('openlibrary.org') || url.includes('accounts.google.com')) {
    return; // Не перехватываем — пусть идут напрямую
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Если запрос успешен — обновляем кэш
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
        }
        return response;
      })
      .catch(() => {
        // Нет интернета — берём из кэша
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          // Если ничего нет в кэше — возвращаем главную страницу
          return caches.match('/library/index.html');
        });
      })
  );
});

// Сообщение для принудительного обновления кэша
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
