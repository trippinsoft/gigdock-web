# Casting Networks as a GigDock source — recon & analysis

_Investigation notes. No production changes. Live page inspection was BLOCKED in
the working environment (egress policy denies castingnetworks.com), so Q1–Q14
about their delivery mechanism are answered as a **recon script to run**, not as
confirmed facts. The schema mapping, architecture, and plan are solid and don't
depend on their live site._

## 0. Blocker (be honest about it)
- Both raw HTTP and the sanctioned WebFetch tool are **egress-blocked** for
  `www.castingnetworks.com` in this environment (proxy: "connect_rejected … 403
  … policy denial"). Per the proxy README, a blocked host must be reported, not
  routed around. So I could not observe rendering, network calls, or pagination.
- ChatGPT **could** read the public page unauthenticated and already extracted:
  role count, project names, role names, age ranges, gender, comp/rates, union
  status, project type, descriptions, due dates, per-listing links, pagination
  (`current_page`). That is the strongest evidence we have and it implies the
  factual data is publicly retrievable and structured.
- RSS.app returned a **non-chronological, stale subset** (2 days / Jul 31 / Jul 6).
  That strongly indicates the page is a **search/results application, not a
  reverse-chronological feed** — RSS.app guessed the wrong repeating elements and
  grabbed a cached partial. Conclusion: **RSS.app is not viable for this source.**

## 1. Recon script — run where the network is open (answers Q1–Q14)
Run these on your machine (or have ChatGPT/browser DevTools do it). This is the
missing piece I can't execute here.

**A. Server- vs client-rendered (Q1, Q6, Q8):**
```
curl -sS -A "Mozilla/5.0 … Chrome/120 Safari/537.36" \
  "https://www.castingnetworks.com/atlanta-casting-calls/" -o cn.html
# Does the HTML already contain role/project text?
grep -c -iE "role|project|union|apply" cn.html
# Framework / data blobs:
grep -oiE "__NEXT_DATA__|window\.__|ng-version|data-reactroot|<script[^>]+src=[^>]+" cn.html | head
```
If listings are in `cn.html` → server-rendered (parse HTML). If it's an empty
shell + JS bundles → client-rendered (need the XHR endpoint, step B).

**B. Find the real data endpoint (Q2, Q4, Q5, Q11–Q13) — the key step:**
Open the page in Chrome → DevTools → **Network → Fetch/XHR** → reload. Look for a
JSON/GraphQL call the page makes to fill the list. For each candidate note:
- request URL + method, query params (look for `current_page`, page size, market/
  city, sort), and whether it returns JSON with the listing fields.
- **Replay it with `curl` with NO cookies/auth.** If it returns the same data
  unauthenticated → that's the ingestion surface (far more stable than HTML).
- Inspect the JSON for **stable IDs** (project_id / notice_id / role_id) and for
  **location fields** (physical work location vs the market the page represents).

**C. Pagination (Q3):** change `current_page` (or the XHR's page/offset param) and
confirm you get the next set; find the page-size and the total-count field.

**D. Anti-bot / access (Q2, Q14):** check response headers for `cf-ray`/`server:
cloudflare`; compare a plain `curl` UA vs a browser UA (different result = UA
gating); check `https://www.castingnetworks.com/robots.txt`. **Do not** attempt to
defeat any CAPTCHA/Cloudflare challenge — if one appears, that's a stop.

**E. Freshness/expiry & change detection (Q12, Q13):** find a `due date` / posted
field per record and a stable ID, so refreshes can diff by ID + updated timestamp
instead of reprocessing everything.

## 2. Data available (from ChatGPT's read) → GigDock fields
GigDock's schema **already models project + role** (`production_name`, `role_key`),
so the fit is unusually good:

| Casting Networks field | GigDock `opportunities` column |
|---|---|
| Project / production name | `production_name` |
| Role name | `role_key` (+ used in `title`) |
| Description | source for a GigDock-**generated** `summary` (don't copy verbatim) |
| Compensation / rate | `pay_rate`, parsed → `pay_min` |
| Union status | `casting_specs.union_status` |
| Age range | `casting_specs.age_min/age_max` |
| Gender | `casting_specs.gender[]` |
| Project type | `casting_specs.work_type` / `type` |
| Due date | `apply_by` (and drives `expires_at`) |
| Per-listing link | `link` / `source_url` |
| Market (page) + work location | `match_state` + `location` (see §5) |
| — | `source` = "Casting Networks", `source_type` = "castingnetworks" |

## 3. Project ↔ role relationship (Q7)
- Casting Networks counts **roles**; a **project** (e.g. "The Ithaca Files") holds
  many roles (A/B/C/D → their count shows 4).
- GigDock already distinguishes these via `production_name` (project) and
  `role_key` (role), and the cross-source **dedup keys on exactly these fields**.
- **Recommendation: keep one row per ROLE**, grouped by project. This reuses the
  existing schema and dedup with zero structural change. To make grouping reliable
  (not fuzzy name matching), capture CN's **stable project ID** into a column
  (e.g. `external_group_id`) when recon confirms one exists.

## 4. Honest counts (the "not 870" requirement)
With role-level rows grouped by project, the transparent header is a pure query,
no inflation:
- **opportunities** = `count(distinct production_name)` (or distinct project ID)
- **roles** = `count(*)` rows
- **sources/orgs** = `count(distinct source-organization)`

→ "43 opportunities · 112 roles · 18 sources" instead of "870". This is the same
"Opportunity vs Role" framing already locked in the SEO strategy.

## 5. Location semantics (Q9, Q10) — reuse the SEO evidence model
CN's "Atlanta" likely means **available/relevant to Atlanta talent**, not
necessarily "shoots in Atlanta." That's the exact distinction the SEO
evidence-based market model already defines. Map it as:
- CN market page (Atlanta) → **market relevance** = Atlanta, **medium** confidence
  ("listed on the Atlanta board"), NOT an assertion of shoot location.
- An explicit CN work-location field (if recon finds one) → physical shoot
  location → higher confidence + `match_state`.
- local-hire / remote / national flags (if exposed) → store explicitly; never
  collapse "available to Atlanta" into "shoots in Atlanta."
This slots directly into "shoots-in / local-hire / available-to."

## 6. Cleanest ingestion approach (Q4/Q5 dependent) & architecture
**Not RSS.app.** Build a **source adapter**. Generalize the pipeline so `sources`
has a `type`/adapter and a dispatcher routes each source to its parser, all
feeding the SAME normalization + dedup we already have:

```
sources.type →  rss            → RSS parser (today)
                rss_app         → RSS.app adapter (today, default)
                api             → JSON/API adapter        ← Casting Networks if a public JSON endpoint exists
                adapter:<name>  → site-specific parser    ← Casting Networks if HTML-only
                url (user)      → AI extraction (today)
                image/social    → vision extraction (today)
```
Casting Networks adapter flow: fetch public results → paginate → structured
records → (project, roles) → normalize location/fields → **GigDock-generated
summary** (don't copy descriptions) → dedup → insert with provenance
(`source_url` deep-link back). Because CN data is already structured, the adapter
can **populate fields directly and use the LLM only for the summary**, which is
cheaper and lower-risk than re-extracting.

## 7. Reliability / maintenance issues (Q6)
- **Undocumented endpoint drift** — a private JSON/XHR API can change without
  notice; an HTML parse breaks on any redesign. JSON endpoint > HTML if one exists.
- **Anti-bot** — Cloudflare/UA gating/rate limits are likely; must throttle and
  fail gracefully; never defeat a challenge.
- **Change detection** — diff by stable ID + updated timestamp so we don't
  reprocess hundreds of unchanged roles each refresh (Q13).
- **Count normalization** — must present opportunities/roles/sources, not their
  inflated role count.
- **Legal/ToS (the real gate, see §8).**

## 8. Legal / ToS gate — go/no-go BEFORE any build
- Casting Networks' Terms prohibit scraping/crawling. This is a genuine gate, not
  a technicality. I'm not resolving enforceability — but no adapter should ship
  until you've made the legal call.
- Lower-risk posture if you proceed: public pages only; no account/credentials; no
  auth/CAPTCHA bypass; reasonable request frequency; extract **factual** fields
  (location, pay, dates, age, role) not copyrighted descriptions/images/layout;
  **GigDock-generated** summaries; preserve attribution; deep-link users back to
  the original listing.

## 9. Recommended plan (staged; nothing ships past a gate)
0. **Legal decision** on the proposed lower-risk posture (blocking gate).
1. **Recon** (§1) in a network-open context → confirm rendering, endpoint,
   pagination, IDs, location fields, anti-bot. Decide JSON-adapter vs HTML-adapter
   vs not-viable.
2. **Generalize the source dispatcher** (small refactor: `sources.type` →
   adapter), RSS/RSS.app unchanged as defaults.
3. **CN adapter prototype behind a flag**, one market (Atlanta), read-only, rate-
   limited; map to role-level rows with project grouping + stable IDs +
   GigDock-generated summaries + provenance.
4. **Normalization/dedup/counts** — reuse existing dedup; add the
   opportunities/roles/sources counts; wire location into the evidence model.
5. **Monitoring** — endpoint-health + parse-failure alerts (adapters are brittle).

## Immediate next step
Run §1 (or have ChatGPT do it, since it can read the page) and bring back: rendering
type, the data endpoint (if any) + a sample JSON record, the pagination params, and
the stable IDs. That turns this from hypotheses into a concrete adapter spec.
