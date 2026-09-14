<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Subscriptions & entitlements

Web reads the production Supabase `entitlements` table directly under RLS with the same rules mobile uses (`utils/useEntitlement.js`). Do not add a web-specific RPC or a second entitlement contract — see `docs/entitlements-schema.md` for the shared schema, current-entitlement rules, provider normalization, and where `/account/billing` and the Apple/Google portals slot in.

# Work roles vs opportunity work types

Two different concepts that both use the word "role" or "work". Do not conflate them.

**`WORK_ROLES` — the user's occupation.** Lives on `public.profiles.work_roles text[]`. Authoritative catalog is `public.work_roles_catalog` (14 rows today: Background Actor, Stand-In / Photo Double, Actor, Voice Actor, Model, Production Assistant, Camera, Grip & Electric, Sound, Hair & Makeup, Wardrobe, Art Department, Locations, Other). Written only through the `set_work_roles(text[], text)` RPC — a BEFORE UPDATE trigger on profiles rejects direct writes to the role columns from clients. The trigger is the sole authoritative enforcement mechanism: per-column REVOKEs are no-ops in this project because `authenticated` holds table-wide UPDATE on `public.profiles`. `has_performer_role()` is the single self-only server-side authority for whether the SIGNED-IN user's roles include any performer role (derived from `work_roles_catalog.is_performer` + `auth.uid()`); never hard-code a list of performer keys. Web reads via `getWorkRolesCatalog()` / `getProfileWithWorkRoles()` / `hasPerformerRole()` in `src/lib/backoffice.ts`; writes via `updateWorkRoles()` server action in `src/lib/backoffice-actions.ts`. Mobile reads via `useLoadWorkRolesCatalogGET`, writes via `setWorkRolesPOST` (`apis/SupabaseAPIApi.js`).

**`WORK_TYPES` / `work_type` — a casting requirement on an OPPORTUNITY.** Lives on `opportunity.casting_specs.work_type`; option list is `WORK_TYPE_OPTIONS` in mobile `utils/opportunityFilters.js` and, on web, is referenced by the Opportunities filter chips. Purely opportunity-side; never stored on a user or `performer_profiles`.

Adding a new user work role is a `work_roles_catalog` UPSERT via SQL — no client deploy is required to persist a new value. Clients render an unknown key with a de-snake-cased fallback label until they refresh their catalog cache.

Onboarding state: derived directly from `profiles.work_roles_set_at` — no grandfathering column, no launch-date cutoff, no forced middleware redirect. Two states:

- `work_roles_set_at IS NULL` → not yet answered. Users see the optional unified Work Profile banner on Today and retain legacy GigFit behavior. They are NOT blocked from any surface.
- `work_roles_set_at IS NOT NULL` → answered. Role-aware behavior: performer/mixed keep GigFit, crew-only suppress performer-specific GigFit UI.

The normal signup path routes new accounts through the pre-account wizard at `/signup`. Flow branches on whether any selected role is a performer role:

- **Performer / mixed** — Work Roles → Where → GigFit Profile (existing performer fields, optional) → Opportunities Preview → Create Account → intent-based landing (default `/opportunities`).
- **Crew-only** — Work Roles → Where → Create Account → `/today`. GigDock provides gig-management value to crew workers before we have crew opportunity inventory, so their onboarding intentionally skips GigFit Details and the Opportunities Preview. If they had an explicit per-opportunity return path (`/opportunities/<id>?do=save|applied`), that's preserved.

`/signup/complete` claims the server-side draft and persists; reaching the product with NULL work_roles_set_at is an acceptable state.

# Work Markets (universal)

Location preference is universal, not performer-specific. Lives on `public.profiles.work_markets text[]` alongside `profiles.work_markets_set_at`. Written only through the `set_work_markets(text[])` RPC — the same `enforce_work_roles_via_rpc` trigger that guards the work-role columns also rejects direct writes to these two. Codes come from `public.markets` (anonymous-readable). Web reads via the extended `getProfileWithWorkRoles()` / `getMarketsCatalog()` in `src/lib/backoffice.ts`; writes via `updateWorkMarkets()` in `src/lib/backoffice-actions.ts`.

`performer_profiles.markets` is deprecated but not yet dropped. Web stops reading and writing it entirely. **Two-way synchronization** keeps universal + legacy in sync during the Draftbit transition (migration `gigfit_and_markets_sync_v2`): (a) `set_work_markets()` writes to BOTH `profiles.work_markets` and the caller's default `performer_profiles.markets`; (b) an AFTER INSERT/UPDATE trigger on `performer_profiles.markets` mirrors legacy writes from released mobile builds INTO `profiles.work_markets`. Both directions guard against recursion via a transaction-local GUC (`gigdock.legacy_market_sync_ok`). The legacy `gigfit(p_profile_id)` wrapper's `coalesce` fallback remains as belt-and-suspenders. Rough phase plan: (1) additive columns + backfill + web cutover + two-way sync — DONE; (2) Draftbit adopts `profiles.work_markets`; (3) sync + coalesce removed once audit shows zero legacy writes for 14+ days; (4) column dropped.

# GigFit (universal)

Matching lives server-side in one core Postgres function, `public.gigfit_match(work_roles, work_markets, ...optional performer criteria...)`. Three entry points share it:

- `public.gigfit_preview(...)` — anonymous public wrapper, used by the pre-account Opportunity Preview.
- `public.gigfit_for_user()` — authenticated generic. Sources `work_roles` + `work_markets` from `profiles`. Loads performer criteria (`performer_profiles`) ONLY when at least one selected work_role is `is_performer` — crew-only users NEVER inherit stale performer data even if an old row exists.
- `public.gigfit(p_profile_id)` — legacy wrapper preserved for mobile. Reads universal work_roles + work_markets from `profiles`; markets fall back to `performer_profiles.markets` when the universal field is empty (transitional).

Universal signals (both trigger tri-state matching):

- **Market** — soft. `opportunities.match_state` compared against user's `work_markets`. Mismatch → soft "Outside your markets"; match → `location` matched.
- **Role** — soft, tri-state. Each user role_key carries `opportunity_work_types` and `opportunity_role_families` in `work_roles_catalog` (mapping seeded by `sql/work-roles-catalog-mapping.sql`). Compared against `opportunities.casting_specs.work_type` and `opportunities.role_families`.
  - MATCH: overlap → `role` matched.
  - MISMATCH: opportunity has structured classification and no overlap → soft "Different work role from yours".
  - UNKNOWN: opportunity has no structured role classification → SILENT (never counted as mismatch).

`opportunities.role_families text[]` is a coarse classifier populated by a conservative keyword backfill over title/summary/requirements (see `sql/opportunity-role-families.sql`). The backfill only labels rows the extractor did NOT already mark with a performer `casting_specs.work_type`; performer castings that use crew vocabulary as scene description ("background talent portraying camera operators") stay unclassified. Future extractor patches should emit `role_families` natively at ingest.

**User-facing rating vocabulary is only Strong / Good / Poor.** Two additional server-side tier values exist internally but never render as a rating badge: `open` (not enough signal for a responsible rating) and `ineligible` (a hard blocker prevents matching). The blocker reason for an `ineligible` result may still be surfaced as descriptive text without the "ineligible" label. Never percentages.

**Tier rule** (`gigfit_and_markets_sync_v2`): `strong` requires a special-signal match (skills / vehicles) OR ≥3 matched signals total. **`good` requires ≥1 matched signal OTHER than `location`** — location alone yields `open` (no badge). This prevents "Good match" from being manufactured out of a market match on an opportunity where the user has no other overlap.

Completeness (`src/lib/gigfit.ts`) is split by scope: `universalFieldsSet(...)` counts `work_roles` and `work_markets`; `performerFieldsSet(...)` counts `gender`/`ethnicity`/`date_of_birth`/`union_status`/`height_inches`. `canRunGigFit(ctx)` returns true when the user has ANY universal signal — crew-only users are eligible without a performer_profiles row.

# Onboarding drafts (pre-account handoff)

`public.onboarding_drafts` holds the pre-account wizard's captured selections between the "Create account" click and `/signup/complete`. Table has deny-all RLS; every touch goes through SECURITY DEFINER RPCs:

- `create_onboarding_draft(p_data jsonb, p_intended_email text) returns uuid` — anon+auth. Stores the payload plus a SHA-256 hash of the normalized intended email. Returns the opaque `draft_id`.
- `update_onboarding_draft(p_draft_id, p_data)` — anon+auth. Unused by the current wizard (state is client-only until account submit) but available for future resume flows.
- `claim_onboarding_draft(p_draft_id) returns jsonb` — authenticated only. Requires `auth.email()` to hash to the stored owner hash. Returns the JSON payload once. Race-safe.
- `purge_expired_onboarding_drafts()` — service_role only; also called opportunistically by `create_onboarding_draft`.

Sensitive fields (gender / ethnicity / dob / union / height) NEVER go into Supabase user_metadata — the auth handoff carries ONLY the opaque `pending_draft_id`. `/signup/complete` claims the draft, calls `persistOnboardingDraft(...)` to write work_roles + work_markets + optional performer_profiles row, verifies persistence, and clears the metadata. The `(app)` layout has a narrow transient guard that redirects any signed-in user with `pending_draft_id` metadata AND `work_roles_set_at IS NULL` back to `/signup/complete` — ONLY that combination; existing users with unset roles but no pending draft are never redirected.
