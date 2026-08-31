# GigDock MCP Server — spec v0.1

> **Status:** read slice SHIPPED 2026-08-31 (see below). This document remains
> the reference for OAuth and the write phases.
>
> **Shipped:** `supabase/functions/mcp` (Streamable HTTP, live at
> `https://www.gigdock.co/mcp` — a next.config rewrite proxying
> `https://thewnhnbbjendvgezmmx.supabase.co/functions/v1/mcp`) with read tools
> `get_earnings`, `get_earnings_by_company`, `get_gig_financials`, `list_gigs`,
> `get_outstanding`; `mcp_tokens` table +
> `mcp_create_token` / `mcp_revoke_token`; and the Settings → Connected
> assistants panel (this spec's Phase 5) to mint/revoke `gd_...` bearer tokens.
> **OAuth 2.1 also SHIPPED 2026-08-31** (migration `mcp_oauth`,
> `sql/mcp-oauth.sql`): discovery at `/.well-known/oauth-authorization-server`
> and `/.well-known/oauth-protected-resource[/mcp]`, Dynamic Client
> Registration at `/api/oauth/register`, PKCE token endpoint (+ rotating
> refresh) at `/api/oauth/token`, and the consent page at `/oauth/authorize`
> (reuses `/login?next=`). OAuth access tokens live in the same `mcp_tokens`
> table with `expires_at` + `refresh_token_hash`; personal tokens still work.
> One deliberate deviation: the Edge Function calls SECURITY DEFINER
> `mcp_*` wrappers (service-role execute only) that validate the token and
> impersonate its owner via `request.jwt.claims` before invoking the same
> `load_*` RPCs — so every answer is still scoped exactly like web/mobile.
> SQL: `sql/mcp-tokens.sql`. **v1.1 (2026-08-31):** `get_earnings_by_company`
> and `get_gig_financials`; slim `list_gigs` (no conflicting rate fields;
> per-date status). SQL: `sql/mcp-authoritative-financials.sql`. GigDock
> calculates; the model must not reconstruct pay. **v1.3 (2026-08-31):**
> Insights honors bump-only days (`sql/insights-honor-bump-only.sql`).
> `get_outstanding` takes optional inclusive dates and returns itemized
> remaining that matches Insights for that window. Unscoped = all-time.

## Purpose

A remote **MCP (Model Context Protocol)** server that lets any MCP-capable
client — Claude (Desktop, Web, API), ChatGPT, Cursor, and future clients —
query and mutate a signed-in user's GigDock data. Same RLS boundaries and
business logic as the web/mobile apps: every tool call runs under the user's
Supabase JWT and is scoped to their own rows.

**Not covered here:** Siri / iOS voice. Siri doesn't speak MCP and there is no
announced plan for it to. Siri integration is a separate iOS App Intents build
in the mobile app; it hits the same Supabase RPCs but has no dependency on this
server. See "Related work" at the end.

## Guiding constraints

- **Solo dev.** Simplest architecture that functions well wins.
- **One data source of truth.** Reuse the shared Postgres RPCs the mobile app
  and web app already call — this server is a thin adapter, not a rewrite.
- **RLS is the only authorization layer.** Never use the service-role key.
- **Ship the read path first.** Highest reach, zero mutation risk.
- **GigDock owns financial logic.** MCP returns answers, not ingredients.
  Models must never reconstruct pay from `list_gigs` (rate × date count,
  leftover `rate_text`, treating booked/avail-check dates as worked). Only
  `status = worked` earns. SQL: `sql/mcp-authoritative-financials.sql`.

### Authoritative money tools (v1.1)

| Tool | Use for | Returns |
|---|---|---|
| `get_earnings` | Period totals ("last month") | gross_earned, received, outstanding, days_worked |
| `get_earnings_by_company` | "How much from Rose Locke?" | company match + per-date status/earned |
| `get_gig_financials` | One gig | pay setup, gross_earned, every date with status + earned |
| `list_gigs` | Discovery only | titles, companies, date statuses, GigDock totals — no rate amounts |
| `get_outstanding` | Remaining pay ("what's outstanding this year?") | `answer`, itemized gigs; optional dates match Insights |

`list_gigs` does **not** expose `rate_text` / `pay_flat_rate`. Dates include
`status`, `earns`, and (on financial tools) `bump_only` + a `reason`. A
bump-only worked day is intentional: the user turned off base pay, so that
day earns bumps only. Money tools lead with an `answer` sentence. Never
treat rate × worked days as a correction.

## Architecture

```
Claude / ChatGPT / Cursor
        │  Streamable HTTP + OAuth 2.1 (PKCE)
        ▼
Supabase Edge Function  "mcp"
   ├── OAuth authorize / callback     (reuses gigdock-web /login for the user step)
   ├── Token storage                  (mcp_tokens table, RLS)
   └── Tool handlers                  (invoke Supabase RPCs with the caller's JWT)
                                        │
                                        ▼
                                  Postgres (same tables/RPCs
                                  as web + mobile, RLS enforced)
```

## Where it lives

- **Runtime:** Supabase Edge Function (Deno). Deploy: `supabase functions deploy mcp`.
- **Repo:** `supabase/functions/mcp/` in this repo (`gigdock-web`). Keeps types
  and helpers (`@/lib/backoffice-types`, `@/lib/reportDefs`) in sync with the
  web app.
- **URL:** starts as `https://<project>.supabase.co/functions/v1/mcp`. Later
  moves to `mcp.gigdock.co` via Supabase custom domain when we're ready to
  publish it publicly.
- **SDK:** `npm:@modelcontextprotocol/sdk` via Deno's `npm:` specifier.

### Transport

Use **Streamable HTTP**, not the older HTTP+SSE transport.

- Streamable HTTP: each tool call is a short-lived HTTP request; SSE only when
  a specific tool actually streams. This fits Edge Function execution-time
  limits and cold-start behavior cleanly.
- HTTP+SSE (older) requires a long-lived server-to-client connection for the
  whole session and fights Edge Function constraints. Do not use it.

Both Claude and ChatGPT support Streamable HTTP.

## Authentication

**OAuth 2.1 with PKCE** — the MCP standard for remote servers. GigDock is the
authorization server; the MCP function is the resource server.

Flow:

1. User adds "GigDock" as a connector in Claude/ChatGPT.
2. The client opens `<mcp>/authorize?…` on our function.
3. The function redirects to `gigdock-web /login?next=…` for the actual login
   (reuses the existing Supabase auth session).
4. On approval, the function exchanges the Supabase session for an
   MCP-specific access token bound to that `auth.uid()` and returns it to the
   client per the OAuth spec.
5. Every subsequent tool call carries that bearer token; the function looks
   the caller's `user_id` up in `mcp_tokens`, uses the associated Supabase
   JWT (refreshed as needed) to call Postgres. **RLS handles the rest.**

Never use `SUPABASE_SERVICE_ROLE_KEY` from this function.

### `mcp_tokens` table

```sql
create table public.mcp_tokens (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  client_name       text not null,                    -- e.g. "Claude", "ChatGPT"
  access_token_hash text not null unique,             -- sha256 of the bearer token
  refresh_token_hash text unique,
  supabase_refresh_token text not null,               -- to mint fresh JWTs when calling PG
  scopes            text[] not null default '{}',     -- future: read/write/admin
  expires_at        timestamptz not null,
  created_at        timestamptz not null default now(),
  last_used_at      timestamptz,
  revoked_at        timestamptz
);

alter table public.mcp_tokens enable row level security;

-- Users can see and revoke their own connections (for a future
-- Settings → Connections screen). Only the function's service context
-- (via a SECURITY DEFINER RPC) inserts new rows.
create policy mcp_tokens_owner_select on public.mcp_tokens
  for select using (user_id = auth.uid());
create policy mcp_tokens_owner_update on public.mcp_tokens
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid() and revoked_at is not null);
```

Tokens are stored as **hashes only**. Raw values live in the client.

## Tool catalog — v1

Each tool is a thin wrapper over an existing Supabase RPC / table. Names use
MCP conventions (snake_case verbs). Return shapes are **LLM-friendly**: money
as numbers with a currency field; dates as ISO strings; identifiers included so
the model can chain tools.

### Reads (Phase 1 — ship first)

| Tool | Backed by | Args | Returns |
|---|---|---|---|
| `get_earnings_summary` | `load_insights_overview` | `period: "this_month"\|"last_month"\|"this_year"\|"last_year"\|{start,end}` | `{ gross_earned, received, outstanding, days_worked, payment_count, per_day_avg, currency }` |
| `get_gigs` | `load_filtered_gigs` | `filter?: "all"\|"active"\|"payments_due"\|"missing_payment"\|"missing_dates"`, `search?`, `limit?` | `[{ id, title, work_dates[], gross_earned, received, outstanding, company, project, status }]` |
| `get_gig` | `gigs_with_names` + related RPCs | `gig_id` | Full gig detail incl. dates, payments, bumps |
| `get_upcoming` | `load_filtered_gigs` filtered | `days_ahead?: 7` | `[{ gig_id, title, next_date, days_away, location }]` |
| `get_needs_attention` | `load_needs_attention` | — | `{ payments_due, missing_pay_info, missing_dates, starts_tomorrow }` |
| `get_payments` | `gig_payments` + `gigs(title)` | `period?`, `gig_id?` | Payment rows w/ gross/net/date/method |
| `get_report` | `buildReport()` (reused from web) | `report_id: "earnings"\|"payments"\|"grossNet"\|"gigs"\|"companies"\|"documents"\|"taxReady"`, `period` | The report's summary + table rows (structured, not PDF) |
| `get_opportunities` | `opportunities` + optional `gigfit` RPC | `location?`, `date_range?`, `sources?`, `eligible_only?`, `limit?` | `[{ id, title, company, location, work_date, apply_by, pay_min, pay_rate, fit_tier?, fit_label?, matched?, blockers? }]` |
| `get_opportunity` | `opportunities` row | `opportunity_id` | Full detail incl. apply target, image, requirements, GigFit result |
| `get_saved_opportunities` | `saved_opportunities` + `opportunities` | — | Array of opportunities |
| `get_applied_opportunities` | `applied_opportunities` + `opportunities` | — | Array of opportunities with `applied_at` + `method` |
| `get_documents` | `documents` (+ `gigs(title)`) | `year?`, `gig_id?`, `type?` | Doc rows (metadata only — **no signed URLs to models**) |

### Small, reversible writes (Phase 2)

| Tool | Table/RPC | Args |
|---|---|---|
| `save_opportunity` | upsert `saved_opportunities` | `opportunity_id` |
| `unsave_opportunity` | delete `saved_opportunities` | `opportunity_id` |
| `mark_applied` | upsert `applied_opportunities` | `opportunity_id`, `method?: "email"\|"url"\|"manual"` |
| `unmark_applied` | delete `applied_opportunities` | `opportunity_id` |
| `mark_paid` | update `gigs.user_marked_paid` | `gig_id`, `paid: boolean` |

### Money-moving writes (Phase 3)

| Tool | Table/RPC | Args |
|---|---|---|
| `add_payment` | insert `gig_payments` | `gig_id`, `gross_pay`, `net_pay?`, `pay_date`, `payment_method?`, `notes?` |
| `add_opportunity_to_my_gigs` | `add_opportunity_to_my_gigs` RPC | `opportunity_id`, `status: "availability_check"\|"booked"`, `dates[]` |
| `create_project` | insert `projects` | `name` |
| `create_company` | insert `companies` | `name`, `kind: "gig"\|"payroll"` |

### Full create (Phase 4, deferred)

| Tool | Table/RPC | Args |
|---|---|---|
| `add_gig` | insert `gigs` + `gig_dates` | `title`, `dates[]`, `pay_type`, `pay_amount`, `company?`, `project?`, `location?`, `notes?` |

### Prompts (canned starter queries)

MCP has a `prompts/` primitive — a few one-tap prompts to teach users what to
ask:

- "How much did I make last month?"
- "What's outstanding?"
- "New Atlanta opportunities that match me"
- "Log a $200 payment for {gig}"

## Design rules

- **RLS is the only authorization layer.** No app-level "is this user allowed"
  checks — Supabase handles it. Same as web/mobile.
- **LLM-friendly shapes.** Money as numbers with a currency field; dates as
  ISO strings. The model formats for the user.
- **Never leak signed URLs or secrets** into tool responses — document tools
  return metadata only; the user opens the actual file in the app.
- **Errors are structured, not stack traces.** `{ code: "gig_not_found", message: "…" }`
  so the model can explain them.
- **Rate limiting** per user token (start at 60 calls/min); log every tool
  call to a `mcp_audit` table for debugging + trust.
- **Write confirmations are the client's job**, but every write tool's
  description carries "This mutates data — please confirm before calling" so
  clients that surface descriptions have the signal.
- **No PII to the vendor by default.** Never send email, phone, or free-text
  notes fields unless the tool being called specifically returns them; the
  model gets IDs + display fields by default.

## Rollout plan

**Phase 0 — foundations (1–2 days)**
- `supabase/functions/mcp/` scaffolded with MCP SDK + Streamable HTTP handler.
- OAuth authorize/callback wired to Supabase auth; `mcp_tokens` table created.
- One demo tool: `whoami` returning the signed-in email.
- Verify from Claude Desktop end-to-end.

**Phase 1 — reads (biggest reach, lowest risk)**
- All read tools above.
- Publish to Claude/ChatGPT connector directories with OAuth setup.
- Success metric: 10 test users can answer "how much did I make last month"
  and "what's outstanding" from Claude.

**Phase 2 — small, safe writes**
- `save_opportunity`, `unsave_opportunity`, `mark_applied`, `unmark_applied`,
  `mark_paid`. Low-blast-radius and easily reversible.

**Phase 3 — money-moving writes**
- `add_payment`, `add_opportunity_to_my_gigs`, project/company create.
- Optional guardrail: any write whose stated amount exceeds a user-set
  threshold requires the model to re-echo it back before we accept.

**Phase 4 — `add_gig`**
- Full create flow. Ship after we've watched real usage of the smaller writes.

**Phase 5 — user visibility**
- A "Connected AI apps" panel in `/settings` that lists rows from `mcp_tokens`
  (client_name, last_used_at) and lets the user revoke each.

## Honest caveats

- **MCP TS SDK is Node-first.** Deno compat is generally fine — budget a
  half-day for the first Streamable HTTP handler on `Deno.serve` in case the
  SDK's built-in HTTP helper isn't Deno-clean. Not a blocker; standard adapter
  work.
- **Cold starts** on Edge Functions can be 100–500ms. Noticeable but tolerable
  in interactive AI chat; users are used to LLM latency.
- **Concurrency & execution-time limits** exist on Edge Functions. Fine for
  beta; monitor at scale. If we outgrow it, the same TypeScript ports cleanly
  to Vercel/Fly/Render — that's a future problem to solve when it appears.
- **MCP spec is evolving.** Auth patterns and transport details will keep
  tightening through 2025. Pin SDK versions; recheck client (Claude/ChatGPT)
  docs before promising specific behavior in user-facing copy.

## Related work

- **iOS Siri.** Separate track. Build App Intents in the mobile app; each
  intent calls the same Supabase RPCs this MCP server calls. Not on this
  server's roadmap.
- **A web `/settings` "Connected AI apps" panel** (Phase 5) — lists user's own
  rows from `mcp_tokens` for revoke-from-web control. Not required for launch.
