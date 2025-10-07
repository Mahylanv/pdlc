import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  experimental: { optimizePackageImports: ["lucide-react"] },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
