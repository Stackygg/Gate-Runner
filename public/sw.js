// Service Worker pour le support 100% Hors-Ligne (Offline / Mode Avion)
const CACHE_NAME = 'stacky-fleet-cache-v1';

const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './Logo-Stacky.svg',
  './favicon.png',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png',
  './iridium.png',
  './bg-missions-space.jpg',
  './bg-hangar-moon.jpg',
  './bg-challenges-arena.jpg',
  './bg-shop-bazaar.jpg',
  './bg-refinery-moon.jpg',
  './bg-events-championship.jpg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Stratégie : Network First avec Fallback sur le Cache local
// Permet d'avoir toujours la dernière mise à jour quand on a du réseau,
// et de démarrer instantanément en plein vol ou sans 4G/Wi-Fi en cas de coupure.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Pour les polices Google Fonts et les fichiers distants, mise en cache automatique
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Pour la navigation de page, fallback sur index.html
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html') || caches.match('./');
          }
          return new Response('Hors-ligne', { status: 503, statusText: 'Offline' });
        });
      })
  );
});
