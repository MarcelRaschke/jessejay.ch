/* Service Worker - DJ Jesse Jay Website
 * Bietet Offline-Funktionalitaet durch Caching der App-Shell und
 * statischer Assets. Cache-First fuer stabile Assets, Network-First
 * (mit Cache-Fallback) fuer HTML-Seiten.
 */

const CACHE_VERSION = 'jessejay-v1';
const CACHE_CORE = `${CACHE_VERSION}-core`;
const CACHE_RUNTIME = `${CACHE_VERSION}-runtime`;

// App-Shell: Kerndateien, die beim Installieren vorgeladen werden.
const CORE_ASSETS = [
  './',
  './index.html',
  './events.html',
  './music.html',
  './guestbook.html',
  './contact.html',
  './css/style.css',
  './js/main.js',
  './assets/fonts/css/fontawesome.min.css',
  './assets/fonts/webfonts/fa-solid-900.woff2',
  './assets/fonts/webfonts/fa-brands-400.woff2',
  './assets/fonts/webfonts/fa-regular-400.woff2',
  './favicon.ico',
  './robots.txt'
];

// Dateien, die niemals gecacht werden sollen (extern, Daten, etc.).
const NEVER_CACHE = [
  'soundcloud.com',
  '/data/'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_CORE).then((cache) =>
      cache.addAll(CORE_ASSETS).catch((err) => {
        console.warn('[SW] Einige Core-Assets konnten nicht gecacht werden:', err);
      })
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => !key.startsWith(CACHE_VERSION))
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

function shouldNeverCache(url) {
  return NEVER_CACHE.some((pattern) => url.includes(pattern));
}

// HTML-Seiten: Network-First (frische Inhalte), Fallback auf Cache.
async function networkFirst(request) {
  const cache = await caches.open(CACHE_RUNTIME);
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    // Offline ohne Cache: Startseite als Fallback.
    const fallback = await caches.match('./index.html');
    return fallback || Response.error();
  }
}

// Stabile Assets (CSS, JS, Fonts, Bilder): Cache-First, dann Network + Update.
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) {
      const cache = await caches.open(CACHE_RUNTIME);
      cache.put(request, fresh.clone());
    }
    return fresh;
  } catch (err) {
    return cached || Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = request.url;
  if (shouldNeverCache(url)) return;

  // Nur Same-Origin-Anfragen abfangen; CORS-Ressourcen (SoundCloud, etc.)
  // dem Browser ueberlassen.
  try {
    if (new URL(url).origin !== self.location.origin) return;
  } catch (e) {
    return;
  }

  const accept = request.headers.get('Accept') || '';
  if (accept.includes('text/html') || request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
  } else {
    event.respondWith(cacheFirst(request));
  }
});
