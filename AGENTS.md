<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Subscriptions & entitlements

Web reads the production Supabase `entitlements` table directly under RLS with the same rules mobile uses (`utils/useEntitlement.js`). Do not add a web-specific RPC or a second entitlement contract — see `docs/entitlements-schema.md` for the shared schema, current-entitlement rules, provider normalization, and where `/account/billing` and the Apple/Google portals slot in.

# Work roles vs opportunity work types

Two different concepts that both use the word "role" or "work". Do not conflate them.

**`WORK_ROLES` — the user's occupation.** Lives on `public.profiles.work_roles text[]`. Authoritative catalog is `public.work_roles_catalog` (14 rows today: Background Actor, Stand-In / Photo Double, Actor, Voice Actor, Model, Production Assistant, Camera, Grip & Electric, Sound, Hair & Makeup, Wardrobe, Art Department, Locations, Other). Written only through the `set_work_roles(text[], text)` RPC — a BEFORE UPDATE trigger on profiles rejects direct writes to the role columns from clients. `has_performer_role(uuid)` is the single server-side authority for whether a user's roles include any performer role (derived from `work_roles_catalog.is_performer`); never hard-code a list of performer keys. Web reads via `getWorkRolesCatalog()` / `getProfileWithWorkRoles()` / `hasPerformerRole(userId)` in `src/lib/backoffice.ts`; writes via `updateWorkRoles()` server action in `src/lib/backoffice-actions.ts`. Mobile reads via `useLoadWorkRolesCatalogGET`, writes via `setWorkRolesPOST` (`apis/SupabaseAPIApi.js`).

**`WORK_TYPES` / `work_type` — a casting requirement on an OPPORTUNITY.** Lives on `opportunity.casting_specs.work_type`; option list is `WORK_TYPE_OPTIONS` in mobile `utils/opportunityFilters.js` and, on web, is referenced by the Opportunities filter chips. Purely opportunity-side; never stored on a user or `performer_profiles`.

Adding a new user work role is a `work_roles_catalog` UPSERT via SQL — no client deploy is required to persist a new value. Clients render an unknown key with a de-snake-cased fallback label until they refresh their catalog cache.

Grandfathering: `profiles.work_roles_grandfathered_at` is set at migration time for every row that predates the launch. `work_roles_set_at IS NULL AND work_roles_grandfathered_at IS NOT NULL` → grandfathered (soft banner). `work_roles_set_at IS NULL AND work_roles_grandfathered_at IS NULL` → new user (must complete onboarding).
