import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 is a native module: never bundle it for the client/edge.
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
