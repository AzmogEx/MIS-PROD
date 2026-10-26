import type { NextConfig } from "next";
import { withPayload } from "@payloadcms/next/withPayload";

const nextConfig: NextConfig = {
  headers() {
    return process.env.CMS_DEPLOYMENT_ENVIRONMENT === 'preproduction'
      ? [{ source: '/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' }] }]
      : [];
  },
  images: {
    // CMS files must recheck access and rights at every request. Never admit
    // /api/** to Next's persistent optimizer, even if requested directly.
    localPatterns: [
      { pathname: "/universes/*.webp", search: "" },
      { pathname: "/hero-capture-instant.webp", search: "" },
    ],
    remotePatterns: [
      // Picsum Photos — placeholders premium pour le portfolio.
      // À retirer / remplacer quand le client aura ses propres images.
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        protocol: "https",
        hostname: "fastly.picsum.photos",
      },
    ],
  },
};

export default withPayload(nextConfig);
