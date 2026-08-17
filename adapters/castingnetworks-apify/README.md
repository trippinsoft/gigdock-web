# GigDock — Casting Networks actor (SCAFFOLD)

Collects public Casting Networks market listings and emits **GigDock-normalized
role records** that drop straight into GigDock's existing normalize → dedup
pipeline. GigDock already models project + role (`production_name` + `role_key`),
so each Casting Networks role maps to one record, grouped by project.

## Status: scaffold — two functions to fill in after recon
Everything except the site-specific extraction is done. Fill in from a live-page
inspection (DevTools → Network → Fetch/XHR):

- `extractRecords($)` — the repeating listing element + per-field selectors, **or**
  (preferred) swap to the JSON endpoint if the page uses one (see PATH A at the
  bottom of `main.js`).
- `hasNextPage($, currentPage)` — how "another page exists" is signaled.

Grep `TODO(recon)` and `REPLACE_` in `main.js` for the exact spots.

## Guardrails (do not remove)
- **Public pages only. No login, no credentials, no anti-bot / CAPTCHA bypass.**
  The actor **stops** on a 403/429/challenge instead of defeating it.
- Polite by default: `maxConcurrency: 1`, `minDelayMs: 1500`.
- **Factual fields only** — it never copies the listing's description. GigDock
  generates its own summary downstream.
- **ToS/legal gate:** Casting Networks' Terms prohibit scraping. Clear that with
  counsel before running at scale. This scaffold is for evaluation.

## Output (one record per role)
```
source, source_type, source_url,
external_project_id, external_role_id,     // stable IDs → grouping + change-detection
production_name, role_key, title,          // GigDock project/role model
pay_rate, pay_min,
casting_specs { union_status, age_min, age_max, gender[], work_type },
apply_by,
market_relevance,                          // "listed on the {market} board" (medium conf.)
work_location,                             // physical shoot loc, if exposed (higher conf.)
scraped_at
```
Honest counts fall out of this in GigDock: `distinct production_name` = opportunities,
row count = roles, `distinct source org` = sources — never the inflated role total.

## Run
```
npm install
apify run            # local, with Apify CLI
# or push to Apify and run in the cloud:
apify push
```

## Feeding GigDock
The dataset → your GigDock ingestion (a new `source_type: "castingnetworks"`
adapter). Because records are already structured, GigDock can populate fields
directly and use the LLM only to generate the summary — cheaper and lower-risk
than re-extracting from prose. Dedup keys on `production_name` + `role_key`
(already implemented); `external_role_id` makes change-detection cheap.
