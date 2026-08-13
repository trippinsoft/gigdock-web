import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Locations moved off the "casting-calls" path to the neutral
      // /opportunities/<state> namespace (room to grow beyond casting calls).
      { source: "/casting-calls", destination: "/opportunities/locations", permanent: true },
      { source: "/casting-calls/:state", destination: "/opportunities/:state", permanent: true },
    ];
  },
};

export default nextConfig;
