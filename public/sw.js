// Très simple SW: met en cache l'app shell
const CACHE = "pdlc-v2";
const ASSETS = [
  "/", // page home
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k === CACHE ? null : caches.delete(k))))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Jamais cacher les API: toujours réseau, sans fallback cache
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // Jamais cacher les pages dynamiques de jeu (évite les états figés)
  if (url.pathname.startsWith("/play")) {
    return;
  }

  // Cache-first pour le reste (app shell, assets statiques)
  event.respondWith(
    caches.match(request).then((cached) =>
      cached ||
      fetch(request).then((resp) => {
        const copy = resp.clone();
        caches.open(CACHE).then((c) => c.put(request, copy)).catch(()=>{});
        return resp;
      }).catch(() => cached)
    )
  );
});
