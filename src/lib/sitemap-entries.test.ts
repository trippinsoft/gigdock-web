// Run: npx tsx src/lib/sitemap-entries.test.ts

import assert from "node:assert/strict";
import {
  buildSitemapEntries,
  renderSitemapXml,
  sitemapLastModified,
  SITEMAP_BASE,
  staticSitemapEntries,
} from "./sitemap-entries";

const staticUrls = staticSitemapEntries().map((e) => e.url);
assert.ok(staticUrls.includes(SITEMAP_BASE));
assert.ok(staticUrls.includes(`${SITEMAP_BASE}/opportunities`));
assert.ok(staticUrls.includes(`${SITEMAP_BASE}/opportunities/locations`));
assert.ok(staticUrls.includes(`${SITEMAP_BASE}/guides`));
assert.ok(staticUrls.includes(`${SITEMAP_BASE}/opportunities/atlanta-ga`));
assert.ok(staticUrls.includes(`${SITEMAP_BASE}/guides/how-to-get-background-acting-work-in-atlanta`));

assert.equal(sitemapLastModified(null), undefined);
assert.equal(sitemapLastModified("not-a-date"), undefined);
assert.equal(sitemapLastModified("2026-08-30T21:23:07.392875+00:00"), "2026-08-30");
assert.equal(sitemapLastModified("2026-08-30T21:23:07Z"), "2026-08-30");

const built = buildSitemapEntries([
  { id: "20be5daf-b5ae-4218-bedc-62c9639f454c", updated_at: "2026-08-30T21:23:07.392875+00:00", match_state: "GA" },
  { id: "20be5daf-b5ae-4218-bedc-62c9639f454c", updated_at: "2026-08-30T21:23:07.392875+00:00", match_state: "GA" },
  { id: "not-a-uuid", updated_at: "2026-08-30T21:23:07Z", match_state: "GA" },
  { id: "57e6f558-5268-409d-be56-2cb046aa5b9f", updated_at: "bogus", match_state: "MadeUp" },
  { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", updated_at: "2026-08-30T21:23:07Z", match_state: null },
]);

const urls = built.map((e) => e.url);
assert.equal(urls.length, new Set(urls).size, "sitemap URLs must be unique");
assert.ok(urls.includes(`${SITEMAP_BASE}/opportunities/georgia`));
assert.ok(urls.includes(`${SITEMAP_BASE}/opportunities/20be5daf-b5ae-4218-bedc-62c9639f454c`));
assert.ok(!urls.includes(`${SITEMAP_BASE}/opportunities/not-a-uuid`));
assert.ok(!urls.includes(`${SITEMAP_BASE}/opportunities/madeup`));

const gig = built.find((e) => e.url.endsWith("20be5daf-b5ae-4218-bedc-62c9639f454c"));
assert.equal(gig?.lastModified, "2026-08-30");

const noLastmod = built.find((e) => e.url.endsWith("57e6f558-5268-409d-be56-2cb046aa5b9f"));
assert.equal(noLastmod?.lastModified, undefined);

const empty = buildSitemapEntries([]);
assert.ok(empty.length >= staticSitemapEntries().length);

const xml = renderSitemapXml(built);
assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>/);
assert.match(xml, /xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9"/);
assert.match(xml, /<lastmod>2026-08-30<\/lastmod>/);
assert.doesNotMatch(xml, /<lastmod>[^<]*T/);
assert.doesNotMatch(xml, /\.392875/);
assert.match(xml, /<loc>https:\/\/www\.gigdock\.co\/opportunities\/20be5daf-b5ae-4218-bedc-62c9639f454c<\/loc>/);

console.log("sitemap-entries tests passed");
