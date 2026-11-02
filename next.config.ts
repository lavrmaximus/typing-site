import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export: `npm run build` writes plain files to out/, served by nginx without Node.
  output: "export",
};

export default nextConfig;
