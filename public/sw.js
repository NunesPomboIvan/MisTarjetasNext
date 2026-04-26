/**
 * Service Worker — Mis Tarjetas
 * Cache-first para shell estática, network-first para datos dinámicos.
 */

const CACHE_NAME = "mis-tarjetas-v1";
const SHELL_ASSETS = [
  "/",
  "/login",
  "/manifest.webmanifest",
];

// Instalar: pre-cachear shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

// Activar: limpiar caches viejos
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch: network-first con fallback a cache
self.addEventListener("fetch", (event) => {
  // Solo interceptar GETs del mismo origin
  if (event.request.method !== "GET") return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  // Para navegación: network-first con fallback offline
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match("/") ?? new Response("Offline", { status: 503 })
      )
    );
    return;
  }

  // Para estáticos (_next/static): cache-first
  if (event.request.url.includes("/_next/static/")) {
    event.respondWith(
      caches.match(event.request).then(
        (cached) =>
          cached ??
          fetch(event.request).then((response) => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            return response;
          })
      )
    );
  }
});
