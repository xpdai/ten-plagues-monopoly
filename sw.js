// Service worker for 出埃及大冒險 — installable PWA + offline play.
// App shell is cached on install; Icons8 images are cached on first fetch so
// they keep working offline afterwards. Bump CACHE to invalidate old caches.
const CACHE = "exodus-v3";
const SHELL = ["./", "./index.html", "./manifest.json", "./icon.svg", "./assets/title.jpg", "./assets/win.jpg"];

self.addEventListener("install", e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL).catch(() => {})));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Icons8 icons: cache-first (opaque responses are fine), so they work offline.
  if (url.hostname === "img.icons8.com") {
    e.respondWith(caches.open(CACHE).then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      try { const res = await fetch(req); c.put(req, res.clone()); return res; }
      catch (err) { return hit || Response.error(); }
    }));
    return;
  }

  // Same-origin app shell + assets: stale-while-revalidate.
  if (url.origin === location.origin) {
    e.respondWith(caches.open(CACHE).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(res => { if (res && res.ok) c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }

  // Other cross-origin (e.g. Google Fonts): try cache, then network.
  e.respondWith(caches.match(req).then(h => h || fetch(req).catch(() => h)));
});
