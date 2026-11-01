"use client"

import { useEffect } from "react"

/** Hands the service worker everything this page loaded, so it can reopen with no signal. */
async function enableOffline() {
  const registration = await navigator.serviceWorker.register("/sw.js")
  await navigator.serviceWorker.ready

  // The PDF code only loads on demand, so fetch it now while there's signal.
  await import("@/lib/order-pdf").catch(() => undefined)

  const assets = performance
    .getEntriesByType("resource")
    .map((entry) => new URL(entry.name))
    .filter(
      (url) =>
        url.origin === location.origin &&
        url.pathname.startsWith("/_next/static/"),
    )
    .map((url) => url.pathname + url.search)

  ;(registration.active ?? navigator.serviceWorker.controller)?.postMessage({
    type: "cache-assets",
    assets,
  })
}

export function OfflineSupport() {
  useEffect(() => {
    // Ask the browser not to clear saved orders when the phone runs low on space.
    void navigator.storage?.persist?.().catch(() => undefined)

    if (
      process.env.NODE_ENV !== "production" ||
      !("serviceWorker" in navigator)
    ) {
      return
    }

    enableOffline().catch((error) => console.error(error))
  }, [])

  return null
}
