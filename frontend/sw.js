/* Field Shift — service worker.
   - App shell (pages, CSS, JS, images) : pré-cache, cache d'abord.
   - Librairies CDN (Chart.js, Leaflet, Iconify, polices) : stale-while-revalidate,
     pour que l'appli reste utilisable hors-ligne.
   - API et tuiles de carte : réseau (l'appli garde sa dernière reco en localStorage). */
const CACHE = "field-shift-v6";
const RUNTIME = "field-shift-rt-v6";
const SHELL = [
  "/", "/index.html", "/campo.html", "/perfil.html", "/panel.html", "/analyse.html", "/plan.html",
  "/copiloto.html", "/cooperativa.html", "/backtesting.html",
  "/css/fieldshift.css",
  "/js/i18n.js", "/js/store.js", "/js/api.js", "/js/pwa.js", "/js/layout.js",
  "/js/campo.js", "/js/perfil.js", "/js/panel.js", "/js/analyse.js", "/js/plan.js",
  "/js/copiloto.js", "/js/cooperativa.js", "/js/backtesting.js",
  "/manifest.webmanifest",
  "/icons/icon.svg", "/icons/icon-192.png", "/icons/icon-512.png", "/icons/icon-maskable-512.png",
  "/img/field.jpg", "/img/field-thumb.jpg", "/img/assistant.jpg",
];
const LIB_HOSTS = [
  "cdn.jsdelivr.net", "unpkg.com", "cdnjs.cloudflare.com", "code.iconify.design",
  "api.iconify.design", "api.simplesvg.com", "api.unisvg.com",
  "fonts.googleapis.com", "fonts.gstatic.com",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== RUNTIME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith("/api/")) {
      e.respondWith(fetch(req).catch(() => caches.match(req)));
      return;
    }
    e.respondWith(
      caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => (req.mode === "navigate" ? caches.match("/index.html") : undefined)))
    );
    return;
  }

  if (LIB_HOSTS.includes(url.hostname)) {
    e.respondWith(
      caches.open(RUNTIME).then((c) => c.match(req).then((hit) => {
        const net = fetch(req).then((res) => { c.put(req, res.clone()).catch(() => {}); return res; }).catch(() => hit);
        return hit || net;
      }))
    );
  }
  // Tout le reste (tuiles de carte…) : réseau normal, non mis en cache.
});
