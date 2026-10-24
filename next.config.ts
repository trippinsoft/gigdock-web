import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/sitemap.xml",
        headers: [
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
      { source: "/opportunities/locations", destination: "https://extrajobs.co/opportunities/locations", permanent: true },
      { source: "/guides/how-to-get-background-acting-work-in-atlanta", destination: "https://extrajobs.co/guides/how-to-get-background-acting-work-in-atlanta", permanent: true },
      { source: "/guides/where-to-find-atlanta-casting-calls", destination: "https://extrajobs.co/guides/where-to-find-atlanta-casting-calls", permanent: true },
      // Locations moved off the "casting-calls" path to the neutral
      // /opportunities/<state> namespace (room to grow beyond casting calls).
      { source: "/casting-calls", destination: "https://extrajobs.co/opportunities/locations", permanent: true },
      { source: "/casting-calls/:state", destination: "https://extrajobs.co/opportunities/:state", permanent: true },
    ];
  },
};

export default nextConfig;
