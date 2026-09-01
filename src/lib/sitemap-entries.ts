import type { MetadataRoute } from "next";
import { STATE_NAMES, stateSlug } from "@/lib/markets";
import { indexableMarketSlugs } from "@/lib/marketContent";
import { guideSlugs } from "@/lib/guides";

export const SITEMAP_BASE = "https://www.gigdock.co";

export type SitemapOpp = {
  id: string;
  updated_at: string | null;
  match_state: string | null;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function sitemapLastModified(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/** Core SEO URLs that must ship even if the opportunities query fails. */
export function staticSitemapEntries(): MetadataRoute.Sitemap {
  return [
    { url: SITEMAP_BASE, changeFrequency: "hourly", priority: 1 },
    { url: `${SITEMAP_BASE}/opportunities`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITEMAP_BASE}/app`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITEMAP_BASE}/gigfit`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITEMAP_BASE}/opportunities/locations`, changeFrequency: "hourly", priority: 0.8 },
    { url: `${SITEMAP_BASE}/guides`, changeFrequency: "weekly", priority: 0.7 },
    ...guideSlugs().map((slug) => ({
      url: `${SITEMAP_BASE}/guides/${slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...indexableMarketSlugs().map((slug) => ({
      url: `${SITEMAP_BASE}/opportunities/${slug}`,
      changeFrequency: "hourly" as const,
      priority: 0.9,
    })),
  ];
}

export function buildSitemapEntries(opps: SitemapOpp[]): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];
  const seen = new Set<string>();

  const add = (entry: MetadataRoute.Sitemap[number]) => {
    if (seen.has(entry.url)) return;
    seen.add(entry.url);
    entries.push(entry);
  };

  for (const entry of staticSitemapEntries()) add(entry);

  const states = Array.from(
    new Set(
      opps
        .map((o) => o.match_state)
        .filter((code): code is string => typeof code === "string" && code in STATE_NAMES)
    )
  );
  for (const code of states) {
    add({
      url: `${SITEMAP_BASE}/opportunities/${stateSlug(code)}`,
      changeFrequency: "hourly",
      priority: 0.8,
    });
  }

  for (const o of opps) {
    if (!UUID_RE.test(o.id)) continue;
    add({
      url: `${SITEMAP_BASE}/opportunities/${o.id}`,
      lastModified: sitemapLastModified(o.updated_at),
      changeFrequency: "hourly",
      priority: 0.7,
    });
  }

  return entries;
}
