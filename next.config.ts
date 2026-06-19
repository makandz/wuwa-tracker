import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
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
