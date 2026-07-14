// Portfolio Tracker – Service Worker
// Zweck: App-Shell offline verfuegbar machen (App startet auch ohne Netz und
// zeigt den letzten bekannten Stand aus localStorage). Live-Kurse/Cloud-Sync
// brauchen weiterhin eine Verbindung -- das regelt bereits die App selbst
// (Fallback auf localStorage, siehe loadFromCloud()).
//
// Versionsnummer bei jeder inhaltlichen Aenderung von index.html erhoehen,
// sonst bleibt Nutzern eine veraltete Version im Cache haengen.
const CACHE_VERSION = 'portfolio-cache-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(function(cache) {
      return cache.addAll(APP_SHELL);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_VERSION; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// Netzwerk-zuerst fuer die App-Shell (immer die neueste Version versuchen,
// erst bei fehlgeschlagenem Request auf den Cache zurueckfallen -- so bleibt
// die App online immer aktuell, offline aber startbar).
self.addEventListener('fetch', function(event) {
  var req = event.request;
  if (req.method !== 'GET') return;

  var url = new URL(req.url);
  var isSameOrigin = url.origin === self.location.origin;

  if (isSameOrigin) {
    event.respondWith(
      fetch(req).then(function(res) {
        var resClone = res.clone();
        caches.open(CACHE_VERSION).then(function(cache) { cache.put(req, resClone); });
        return res;
      }).catch(function() {
        return caches.match(req).then(function(cached) {
          return cached || caches.match('./index.html');
        });
      })
    );
  }
  // Cross-origin (Railway-API, Yahoo/CoinGecko, Fonts, Chart.js-CDN) bewusst
  // NICHT abfangen -- die App-eigene Fehlerbehandlung (try/catch + localStorage-
  // Fallback) kuemmert sich bereits darum, und ein SW-Cache wuerde hier nur
  // veraltete Kurse vortaeuschen.
});
