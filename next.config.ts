import type { NextConfig } from "next";
import "./src/env.config";

const nextConfig: NextConfig = {
  redirects: () =>
    Promise.resolve([
      {
        source: "/feed",
        destination: "/",
        permanent: true,
      },
    ]),
  experimental: {
    authInterrupts: true,
  },
};

export default nextConfig;
