import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  devIndicators: false,
  experimental: { serverActions: { bodySizeLimit: "30mb" } },
};

export default nextConfig;
