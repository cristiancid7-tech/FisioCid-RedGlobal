self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
    // Permite que la app funcione con normalidad haciendo peticiones a la red
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});