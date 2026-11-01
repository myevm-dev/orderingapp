// Keeps the app opening in dead spots like the walk-in. Orders live in
// localStorage, so nothing here touches order data.
const CACHE = "orderingapp-v1"
const APP_SHELL = [
  "/",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-icon.png",
]
// Past this, a weak signal counts as no signal and the saved page opens instead.
const PAGE_TIMEOUT_MS = 2500

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

async function openPage(request) {
  const cache = await caches.open(CACHE)
  const network = fetch(request).then((response) => {
    if (response.ok) cache.put("/", response.clone())
    return response
  })
  // Keeps a late failure quiet after the saved page has already been served.
  network.catch(() => undefined)

  const timeout = new Promise((resolve) =>
    setTimeout(resolve, PAGE_TIMEOUT_MS, null),
  )

  try {
    const response = await Promise.race([network, timeout])
    if (response) return response
  } catch {
    // No connection: fall through to the saved page.
  }

  return (await cache.match("/")) ?? network
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE)
  const cached = await cache.match(request)
  if (cached) return cached

  const response = await fetch(request)
  if (response.ok) cache.put(request, response.clone())
  return response
}

self.addEventListener("fetch", (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (request.method !== "GET" || url.origin !== location.origin) return

  if (request.mode === "navigate" && url.pathname === "/") {
    event.respondWith(openPage(request))
  } else if (
    url.pathname.startsWith("/_next/static/") ||
    APP_SHELL.includes(url.pathname)
  ) {
    event.respondWith(cacheFirst(request))
  }
})

self.addEventListener("message", (event) => {
  if (event.data?.type !== "cache-assets") return

  const assets = event.data.assets

  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE)
      const wanted = new Set(assets)

      await Promise.all(
        assets.map(async (asset) => {
          if (!(await cache.match(asset))) await cache.add(asset)
        }),
      )

      // Files from older releases are never requested again, so drop them.
      for (const request of await cache.keys()) {
        const { pathname, search } = new URL(request.url)
        if (
          pathname.startsWith("/_next/static/") &&
          !wanted.has(pathname + search)
        ) {
          await cache.delete(request)
        }
      }
    })(),
  )
})
