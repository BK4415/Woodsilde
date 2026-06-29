
Action: file_editor create /app/public_game/sw.js --file-text "/* Wood Puzzle Service Worker — fully offline */
const CACHE = 'wood-puzzle-v1.0.0';
const ASSETS = [
  './',
  './index.html',
  './game.html',
  './about.html',
  './guide.html',
  './privacy.html',
  './terms.html',
  './manifest.json',
  './css/main.css',
  './js/icons.js',
  './js/storage.js',
  './js/engine.js',
  './js/home.js',
  './js/game.js',
  './json/ratings.json',
  './json/achievements.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.all(
        ASSETS.map((url) =>
          cache.add(new Request(url, { cache: 'reload' })).catch(() => null)
        )
      )
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          // Only cache same-origin successful responses
          const url = new URL(req.url);
          if (url.origin === self.location.origin && res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(req, clone)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached || Response.error());
    })
  );
});
"
Observation: Create successful: /app/public_game/sw.js
