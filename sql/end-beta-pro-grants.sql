-- ============================================================================
-- END AUTOMATIC BETA-PRO GRANTS
-- ============================================================================
--
-- Context
--   The complimentary Pro grant, introduced by sql/beta-pro-entitlements.sql
--   (commit 9c4fbda, "Grant complimentary Pro to every beta tester") and
--   applied to production out-of-band, installed:
--     * function public.handle_new_user_grant_beta_pro()
--     * trigger public.on_auth_user_created_grant_beta_pro on auth.users
--       AFTER INSERT, firing that function to insert a row into
--       public.entitlements with (provider='beta', product='pro',
--       status='active', current_period_end=null, external_ref='beta-comp').
--   The same original migration also backfilled one row per pre-existing
--   auth.users row.
--
--   The beta acquisition program is now closed to new users. Every future
--   Supabase signup — GigDock, ExtraJobs.co, or any other product sharing
--   this backend — must NOT receive complimentary Pro automatically.
--
-- What this migration does
--   1. Drops the trigger, ending the automatic grant on the very next
--      auth.users INSERT.
--   2. Drops the function, so no accidental future rewiring or manual
--      re-trigger can re-enable it silently.
--
-- What this migration deliberately does NOT do
--   * It does not touch a single row in public.entitlements. Existing
--     beta testers' complimentary Pro entitlements are preserved verbatim
--     — same id, same started_at, same current_period_end (null), same
--     external_ref ('beta-comp'), same metadata.
--   * It does not touch any other trigger or function on auth.users or
--     entitlements. Manually granted Pro (provider ∈ {partner, promo, admin})
--     and any future paid Pro (provider ∈ {stripe, apple, google}) are
--     unaffected.
--   * It does not introduce product-source conditional logic. The beta
--     acquisition policy is simply retired.
--
-- Safety
--   Both DROPs are idempotent (IF EXISTS). Re-running this file is a no-op.
--
-- Ordering
--   Apply after any pending migration that touches the entitlements table.
--   No table-level or column-level changes here.
-- ============================================================================

-- ---- Step 1: end the automatic grant.
drop trigger if exists on_auth_user_created_grant_beta_pro on auth.users;

-- ---- Step 2: remove the grant function so it cannot be re-invoked from
--             another trigger, an RPC, or the SQL editor by accident.
drop function if exists public.handle_new_user_grant_beta_pro();

-- ============================================================================
-- VALIDATION
--   Run each block below after applying this migration. Every expected
--   outcome is stated inline. NONE of these queries mutate data.
-- ============================================================================

-- A) Trigger is gone.
--    Expected: 0 rows.
select tgname
from   pg_trigger
where  tgname = 'on_auth_user_created_grant_beta_pro'
  and  not tgisinternal;

-- B) Function is gone.
--    Expected: 0 rows.
select n.nspname || '.' || p.proname as func
from   pg_proc p
join   pg_namespace n on n.oid = p.pronamespace
where  n.nspname = 'public'
  and  p.proname = 'handle_new_user_grant_beta_pro';

-- C) Existing complimentary Pro rows are preserved verbatim.
--    Expected: `beta_rows` count matches the count from immediately before
--    the migration (record it beforehand). All rows should still have
--    external_ref = 'beta-comp' and status IN ('active','trialing').
select
  count(*)                                                          as beta_rows,
  count(*) filter (where external_ref = 'beta-comp')                as beta_comp_rows,
  count(*) filter (where status in ('active','trialing'))           as active_or_trialing,
  count(*) filter (where lower(product) in ('pro','premium'))       as pro_or_premium,
  min(created_at)                                                   as earliest_grant,
  max(created_at)                                                   as latest_grant
from public.entitlements
where provider = 'beta';

-- D) No NEW beta-comp entitlements appear after the migration.
--    Run this once immediately after the migration to record the current
--    latest_grant timestamp, then again after any new signup activity has
--    happened. The `latest_grant` value MUST NOT advance.
--
--    Same query as (C) — kept separate so the intent is explicit.
select max(created_at) as latest_grant
from   public.entitlements
where  provider = 'beta'
  and  external_ref = 'beta-comp';

-- E) No orphaned trigger references. Should be empty.
select tgname, tgrelid::regclass
from   pg_trigger
where  tgname ilike '%beta_pro%'
  and  not tgisinternal;

-- F) Sanity: manually granted / paid entitlements are unchanged. Their
--    counts should match what they were before the migration.
--    (Nothing in this file touches these rows; the query is here so the
--    on-call operator has one place to confirm.)
select
  provider,
  count(*)                                                          as rows,
  count(*) filter (where status in ('active','trialing'))           as active_or_trialing
from   public.entitlements
where  provider is distinct from 'beta'
group  by provider
order  by provider;

-- ============================================================================
-- POST-MIGRATION EXPECTATIONS
--   * A newly created Supabase user (created after this migration was
--     applied) has NO row in public.entitlements. useEntitlement /
--     getPlan therefore resolves them as FREE.
--   * The existing beta cohort remains PRO. Their app UI, mobile UI,
--     server-side gates, alert path entitlement checks, and Manage
--     Subscription surfaces continue to function unchanged.
-- ============================================================================
