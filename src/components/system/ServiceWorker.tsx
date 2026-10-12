"use client";

import { useEffect } from "react";

/**
 * Registers public/sw.js in production builds, after the page has loaded so it never competes with
 * the first paint. It keeps pages you opened (tickets, bookings) and shows /offline otherwise.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    const register = () => void navigator.serviceWorker.register("/sw.js").catch(() => null);
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);
  return null;
}
