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

Grandfathering: no dedicated column. Uses the existing verified `profiles.created_at` against a `WORK_ROLES_LAUNCH_DATE` constant set at Phase 2 launch time (not during Phase 1a — anyone who signs up in the interim is treated as an existing/grandfathered user by that later logic). `work_roles_set_at IS NULL AND created_at < WORK_ROLES_LAUNCH_DATE` → grandfathered (soft banner). `work_roles_set_at IS NULL AND created_at >= WORK_ROLES_LAUNCH_DATE` → new user (must complete onboarding).
