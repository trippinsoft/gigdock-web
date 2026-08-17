# GigDock SEO Strategy — status & open questions

_Working notes so we can resume the discussion later. Shareable with ChatGPT for review._

## Goal

GigDock.co is a **lead magnet to drive app downloads** (the app is not yet in the
stores — so pages need "coming soon / notify me" CTA slots, not store links yet).
We want to be the **highest-ranked result for casting opportunities** in the
markets we serve, while providing **genuine value** (never thin doorway pages)
and interweaving GigDock naturally.

## Locked decisions

### URL architecture — neutral `/opportunities/`
- `/opportunities/atlanta-ga` = the Atlanta production **market** (region: metro +
  surrounding film towns — Fayetteville, Senoia, Covington, Peachtree City, …).
- `/opportunities/georgia` = the **statewide** view.
- Individual gigs live at `/opportunities/<uuid>`.
- **Not** `/casting-calls/` — the product may expand beyond casting, so the path
  stays neutral. The searcher's vocabulary ("Atlanta casting calls", "background
  acting jobs") lives in the **title / H1 / body**, never in the URL.

### Market model — production regions, curated
- Markets are production **regions**, not city limits (the Atlanta market includes
  its surrounding film towns).
- A **curated** set of ~14 flagship markets, NOT every city: Atlanta, Nashville,
  Los Angeles, New York, Chicago, New Orleans, Albuquerque, Miami, Orlando,
  Austin, Dallas/Ft. Worth, Houston, Vancouver, Toronto.
- **Market pages are the primary SEO surface.** State pages serve a broader role.
- The **product** stays state-level (profile / GigFit / filters operate on states);
  market pages are an SEO layer on top of the same data.

### Evidence-based assignment (confidence hierarchy)
An opportunity can belong to a state **and** zero / one / **multiple** search markets.
Confidence that a gig belongs to a market:
- source says "Atlanta local" → **very high**
- source is itself an Atlanta-market source → **high**
- normalized location falls inside a defined market area → **medium**
- only "somewhere in Georgia" → **low** → state page only, not the metro page.

Be transparent about the distinction: **"shoots in Atlanta"** vs **"Atlanta-local
hire"** vs **"available to Atlanta talent."**

### Honest counts
Don't compete on inflated numbers (competitors show "870 roles" including remote
and other markets). Distinguish **Opportunity vs Role**, e.g.
`38 opportunities · 126 roles · 18 sources`.

### Conservative indexing
Build the market-page **capability** now (template + data model for all curated
markets), but only **index** pages that are genuinely ready (real content + enough
recurring inventory). Everything else is `noindex` and kept out of the sitemap.

## The moat / differentiators
- **Market Pulse** (a.k.a. "GigDock [Market] Casting Market Index") — proprietary
  aggregate intelligence per market: 30-day opportunity counts, median rate, active
  casting companies, where filming (city chips). Competitors can't easily replicate this.
- **Breadth + freshness** — many sources aggregated into one feed, updated daily.
- **Structured data** — JobPosting (Google for Jobs), ItemList, BreadcrumbList,
  FAQPage, Organization, WebSite (SearchAction).
- **Personalization** — GigFit as an engagement hook.

## Content plan
- Market pages should eventually **match the primary GigDock UI** (SSR for crawlers,
  then hydrate into the two-pane feed).
- An **evergreen knowledge base** (not a generic blog): talent pain-point articles —
  payroll, outstanding balances, receipts, taxes — that give real value and weave in
  how you'd handle it with GigDock.
- A **/app** ("get the app") landing page with CTA slots (app coming soon / waitlist).

## Open questions to resolve (for ChatGPT)
The overall strategy still isn't fully settled. Key tensions:
1. **Metro pages vs state pages.** The product is state-level (profile, GigFit,
   filters all use states), but the SEO plan adds metro/market pages. How do
   Atlanta/NYC/LA metro pages coexist with state pages without cannibalizing each
   other or confusing users who then hit a state-level app experience?
2. **Curated list aggressiveness.** How many of the ~14 markets do we build now vs
   wait for inventory, and what inventory threshold = "ready to index"?
3. **SSR-hydrate now or later?** Do we invest in market pages that mirror the app's
   two-pane UI now, or ship simpler SSR landing pages first and hydrate later?
4. **Counts & transparency.** Is "opportunities vs roles vs sources" the right honest
   framing, and how do we present shoots-in / local-hire / available-to cleanly?

## Implementation status

**Done (on `main`):**
- Market-page template + Market Pulse section
- `MarketSpec` model with `cities` / `terms` / `indexable`
- Atlanta market fully written (studios, pay, FAQs, film-town scoping)
- Canonical host `https://www.gigdock.co`; JobPosting + sitemap + robots +
  Organization/WebSite JSON-LD

**WIP (this branch, uncommitted-to-main on purpose):**
- `terms` / `indexable` fields on `MarketSpec`
- 3 curated stubs: `nashville-tn`, `los-angeles-ca`, `new-york-ny` (`indexable: false`)
- `genericMarket()` helper

**Pending:**
1. `belongsToMarket(spec, o)` + `indexableMarketSlugs()` in `marketContent.ts`
2. `LocationListing` → evidence-based scoping + honest "N open · from N sources" counts
3. `noindex` gating for non-ready markets in `app/opportunities/[slug]/page.tsx`
4. Gate `sitemap.ts` to indexable markets only
5. Flesh out the 3 stub markets with real content
6. (Later) SSR-hydrate market pages into the two-pane feed; `/app` page; knowledge-base cluster

## File map
- `src/lib/marketContent.ts` — market registry, content, resolvers (the model)
- `src/components/LocationListing.tsx` — the market/state landing page + Market Pulse
- `src/app/opportunities/[slug]/page.tsx` — routes slug → market / state / gig
- `src/app/sitemap.ts`, `src/app/robots.ts`, `src/app/layout.tsx` — SEO plumbing
