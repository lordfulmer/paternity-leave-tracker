// Minimal service worker: cache shell + recent GETs, network-first for API.
// Writes are NOT cached — they're queued by the offline.ts module client-side.

const CACHE = "paternity-v1";
const SHELL = ["/", "/log", "/whoop", "/check-in", "/zone2", "/recovery", "/history", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Never cache writes
  if (req.method !== "GET") return;

  // API: network-first, fall back to cache
  if (url.pathname.startsWith("/api/sheets/")) {
    event.respondWith(
      fetch(req)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(req, clone));
          return res;
        })
        .catch(() => caches.match(req).then(m => m || new Response(JSON.stringify({ ok: false, error: "Offline" }), { headers: { "Content-Type": "application/json" } })))
    );
    return;
  }

  // Shell: cache-first
  event.respondWith(
    caches.match(req).then(m => m || fetch(req).then(res => {
      const clone = res.clone();
      caches.open(CACHE).then(c => c.put(req, clone));
      return res;
    }))
  );
});
