import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* The service worker must never be cached, so a new deploy reaches every visitor (Next PWA guide). */
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
