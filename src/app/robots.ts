import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = "https://www.gigdock.co";
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Private / non-indexable areas.
      disallow: ["/admin", "/login", "/signup", "/profile", "/saved", "/feedback"],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
