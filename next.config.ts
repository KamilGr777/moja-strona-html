import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ciężkie biblioteki serwerowe nie są bundlowane przez Next.js.
  serverExternalPackages: ["bullmq", "ioredis", "@aws-sdk/client-s3"],
  poweredByHeader: false,
  experimental: {
    // Uploady wideo idą strumieniowo przez /api/upload (PUT), ale akcje serwerowe
    // mogą przyjmować np. logo klienta.
    serverActions: { bodySizeLimit: "10mb" },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
