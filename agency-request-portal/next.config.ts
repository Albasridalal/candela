import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // This app is a self-contained project inside a repo that holds another one.
  // Pin the root so Next does not walk up and pick the sibling's lockfile.
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
