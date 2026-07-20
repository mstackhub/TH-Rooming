import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    // Force Turbopack to resolve relative modules inside the project directory
    root: path.join(__dirname),
  },
};

export default nextConfig;
