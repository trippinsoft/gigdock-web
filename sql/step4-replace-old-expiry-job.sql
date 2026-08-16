-- ============================================================================
-- STEP 4 — run this in the Supabase SQL editor (after Steps 1–3).
--
-- The nightly job `expire-stale-opportunities` (cron jobid 3) expires on the raw
-- first-day work_date — the exact bug. This:
--   1. upgrades auto_expire_opportunities() to the FINAL version: range-aware
--      (keys on expires_at = last shoot day), and it also folds in the draft +
--      apply_by handling the old job did, so nothing is lost;
--   2. disables the old broken nightly job so it can't re-expire on the start date;
--   3. catch-up: revives any rows the old job wrongly expired that Step 2 didn't
--      reach (e.g. rows that had other notes), but only when the gig truly isn't over.
--
-- Paste the whole thing and run it. Idempotent — safe to re-run.
-- ============================================================================

-- 1. Final expiry function: a gig is "over" when its last shoot day (expires_at,
--    else work_date) has passed, OR its apply-by deadline has passed. Covers
--    active AND draft, matching the old job's scope.
create or replace function public.auto_expire_opportunities()
returns integer language plpgsql as $$
declare n integer;
begin
  update public.opportunities o
  set status = 'expired',
      notes = 'Auto-expired: '
              || case
                   when o.apply_by is not null and o.apply_by < current_date
                     then 'past apply_by (' || to_char(current_date, 'YYYY-MM-DD') || ')'
                   else 'shoot ended '
                        || to_char(coalesce(o.expires_at, o.work_date::timestamptz), 'YYYY-MM-DD')
                 end
              || case when o.notes is not null and o.notes <> ''
                        and o.notes not like 'Auto-expired:%'
                      then E'\n' || o.notes else '' end,
      updated_at = now()
  where o.status in ('active', 'draft')
    and o.deleted_at is null
    and (
         coalesce(o.expires_at, (o.work_date::timestamptz + interval '1 day')) < now()
      or (o.apply_by is not null and o.apply_by < current_date)
    );
  get diagnostics n = row_count;
  return n;
end $$;

grant execute on function public.auto_expire_opportunities() to authenticated, service_role;

-- 2. Disable the old broken nightly job (it's replaced by auto-expire-opportunities).
do $$
begin
  perform cron.unschedule('expire-stale-opportunities');
exception when others then null;
end $$;

-- 3. Catch-up revival: un-expire rows the old job wrongly killed on the start
--    date, but ONLY where the gig genuinely isn't over under the new rule.
--    (Booked/filled expiries and truly-past gigs are left expired.)
update public.opportunities
set status = 'active',
    notes  = nullif(btrim(regexp_replace(notes, E'\n?Auto-expired:[^\n]*', '', 'g')), ''),
    updated_at = now()
where status = 'expired'
  and deleted_at is null
  and notes like '%Auto-expired:%past work_date%'
  and coalesce(expires_at, (work_date::timestamptz + interval '1 day')) >= now()
  and (apply_by is null or apply_by >= current_date);

-- VALIDATION (optional) — should return the old nightly job GONE and the
-- range-aware one present:
--   select jobname, schedule from cron.job
--   where jobname in ('expire-stale-opportunities','auto-expire-opportunities');
