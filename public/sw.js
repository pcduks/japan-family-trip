/* Six Across Japan service worker (P3.2): the itinerary works offline after one online visit. */
const VERSION = "v1";
const STATIC = `static-${VERSION}`;
const PAGES = `pages-${VERSION}`;
const DATA = `data-${VERSION}`;
const OFFLINE = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC).then((c) => c.addAll([OFFLINE, "/icon.svg"])));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.endsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(request);
    // Never store redirects (e.g. to /login) or errors under a page's URL.
    if (res.ok && !res.redirected) cache.put(request, res.clone());
    return res;
  } catch {
    const hit = await cache.match(request, { ignoreSearch: false });
    if (hit) return hit;
    const loose = await cache.match(request, { ignoreSearch: true });
    if (loose) return loose;
    if (request.mode === "navigate") return (await caches.match(OFFLINE)) ?? Response.error();
    return Response.error();
  }
}

async function cacheFirst(request) {
  const hit = await caches.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) (await caches.open(STATIC)).put(request, res.clone());
  return res;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // Auth, sign-out, private photos and video search always go to the network.
  if (url.pathname.startsWith("/auth") || url.pathname.startsWith("/login") || url.pathname.startsWith("/api/photo") || url.pathname.startsWith("/api/videos")) return;
  if (url.pathname.startsWith("/documents")) return;

  if (url.pathname.startsWith("/_next/static/") || /\.(?:svg|png|ico|woff2?)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(req));
  } else if (url.pathname.startsWith("/api/places/")) {
    event.respondWith(networkFirst(req, DATA));
  } else if (req.mode === "navigate" || req.headers.get("RSC") === "1" || req.headers.get("accept")?.includes("text/html")) {
    event.respondWith(networkFirst(req, PAGES));
  }
});

self.addEventListener("message", (event) => {
  const msg = event.data || {};
  if (msg.type === "warm" && Array.isArray(msg.urls)) {
    event.waitUntil(
      caches.open(PAGES).then((cache) =>
        Promise.all(
          msg.urls.map((u) =>
            fetch(u, { credentials: "same-origin" })
              .then((res) => (res.ok && !res.redirected ? cache.put(u, res) : undefined))
              .catch(() => undefined),
          ),
        ),
      ),
    );
  }
  if (msg.type === "clear") {
    event.waitUntil(caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))));
  }
});
