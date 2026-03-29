import type { NextConfig } from "next";
import { resolveApiProxyTarget } from "./services/api-base-url";

const apiProxyTarget = resolveApiProxyTarget(process.env.NEXT_PUBLIC_API_URL);

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiProxyTarget}/:path*`,
      },
    ];
  },
};

export default nextConfig;
