import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the dev overlay badge out of design-review screenshots.
  devIndicators: false,
};

export default nextConfig;
