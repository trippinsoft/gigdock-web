import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/sitemap.xml",
        headers: [
          { key: "Content-Type", value: "application/xml; charset=utf-8" },
          { key: "Access-Control-Allow-Origin", value: "*" },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      // Public MCP endpoint on our domain. Proxies to the Supabase Edge
      // Function so AI assistants (Claude, ChatGPT, Cursor) are configured
      // with www.gigdock.co/mcp instead of the raw *.supabase.co URL.
      {
        source: "/mcp",
        destination:
          "https://thewnhnbbjendvgezmmx.supabase.co/functions/v1/mcp",
      },
    ];
  },
  async redirects() {
    return [
      // Canonical host: never let anyone linger on the raw *.vercel.app alias —
      // bounce every path on it to the real domain. (Preview deploys have
      // different hostnames, so they're unaffected.)
      {
        source: "/:path*",
        has: [{ type: "host", value: "gigdock-web-pi.vercel.app" }],
        destination: "https://www.gigdock.co/:path*",
        permanent: true,
      },
      // Locations moved off the "casting-calls" path to the neutral
      // /opportunities/<state> namespace (room to grow beyond casting calls).
      { source: "/casting-calls", destination: "/opportunities/locations", permanent: true },
      { source: "/casting-calls/:state", destination: "/opportunities/:state", permanent: true },
    ];
  },
};

export default nextConfig;
