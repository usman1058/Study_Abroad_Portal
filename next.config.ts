import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
  serverExternalPackages: ["@prisma/adapter-pg", "pg"],
  async headers() {
    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=()" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    ];

    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      ...(process.env.NODE_ENV === "production"
        ? [{
            source: "/:path*",
            has: [{ type: "header" as const, key: "x-forwarded-proto", value: "https" }],
            headers: [{ key: "Strict-Transport-Security", value: "max-age=31536000" }],
          }]
        : []),
    ];
  },
};

export default nextConfig;
