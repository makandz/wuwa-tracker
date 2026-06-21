import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.encore.moe",
        pathname: "/resource/**",
      },
    ],
  },
};

export default nextConfig;
