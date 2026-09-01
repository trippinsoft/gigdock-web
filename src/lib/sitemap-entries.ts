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

/**
 * Google Search Console rejects many valid W3C datetimes (microseconds,
 * +00:00 offsets, etc.). Date-only lastmod is explicitly supported.
 */
export function sitemapLastModified(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString().slice(0, 10);
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
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
        .filter((code): code is string => Boolean(code) && code in STATE_NAMES)
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

export function renderSitemapXml(entries: MetadataRoute.Sitemap): string {
  const urls = entries
    .map((entry) => {
      const lastmod =
        typeof entry.lastModified === "string" && /^\d{4}-\d{2}-\d{2}/.test(entry.lastModified)
          ? entry.lastModified.slice(0, 10)
          : entry.lastModified instanceof Date && !Number.isNaN(entry.lastModified.getTime())
            ? entry.lastModified.toISOString().slice(0, 10)
            : null;
      const changefreq = entry.changeFrequency ? `\n    <changefreq>${entry.changeFrequency}</changefreq>` : "";
      const priority =
        typeof entry.priority === "number" ? `\n    <priority>${entry.priority}</priority>` : "";
      const lastmodXml = lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : "";
      return `  <url>\n    <loc>${xmlEscape(entry.url)}</loc>${lastmodXml}${changefreq}${priority}\n  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}
