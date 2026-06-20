const CACHE_NAME = "lohnapp-https-20260620";

const APP_SHELL = [
  "./",
  "./index.html",
  "./abrechnung.html",
  "./neuberechnung.html",
  "./manifest.webmanifest",
  "./css/base.css?v=20260620",
  "./css/kalender.css?v=20260620",
  "./css/abrechnung.css?v=20260613",
  "./js/app.js?v=20260620",
  "./js/kalender.js?v=20260620",
  "./js/abrechnung.js?v=20260613",
  "./js/neuberechnung.js?v=20260613",
  "./icons/app-icon.svg",
  "./icons/apple-touch-icon.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match("./index.html"));
    }),
  );
});
