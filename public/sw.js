/*
 * Carbon demo service worker (D-052). Small and hand-written:
 * - pages: network first; a copy of each page opened is kept, so tickets and bookings open with no
 *   signal (their data lives in the browser); a page never opened shows /offline;
 * - /_next/static: cache first (file names change with every build, so they never go stale);
 * - everything else, including /api, goes straight to the network.
 */
const VERSION = "carbon-v1";
const PAGES = `${VERSION}-pages`;
const STATIC = `${VERSION}-static`;
const OFFLINE = "/offline";
const MAX_PAGES = 40;

/** Keeps /offline and the scripts and styles it needs, so it can start with no network. */
async function keepOfflinePage() {
  const response = await fetch(OFFLINE, { cache: "reload" });
  const html = await response.clone().text();
  const assets = [...new Set(html.match(/\/_next\/static\/[^"'\s)]+/g) ?? [])];
  await (await caches.open(PAGES)).put(OFFLINE, response);
  await (await caches.open(STATIC)).addAll(assets);
}

self.addEventListener("install", (event) => {
  event.waitUntil(keepOfflinePage().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function trim(cache) {
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_PAGES)).map((k) => cache.delete(k)));
}

async function page(request) {
  const cache = await caches.open(PAGES);
  try {
    const response = await fetch(request);
    if (response.ok && response.type === "basic") {
      await cache.put(request, response.clone());
      await trim(cache);
    }
    return response;
  } catch {
    return (await cache.match(request, { ignoreSearch: false })) ?? (await cache.match(OFFLINE)) ?? Response.error();
  }
}

async function asset(request) {
  const cache = await caches.open(STATIC);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  if (request.mode === "navigate") event.respondWith(page(request));
  else if (url.pathname.startsWith("/_next/static/")) event.respondWith(asset(request));
});
