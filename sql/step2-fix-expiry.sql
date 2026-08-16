-- ============================================================================
-- STEP 2 — run this in the Supabase SQL editor (AFTER Step 1: deploy ingest-rss).
--
-- Reverses the false "past work_date" expiries, backfills expires_at on existing
-- rows, and installs a range-aware auto-expire that keys on expires_at (the last
-- shoot day) instead of the first day of a range.
--
-- Just paste the whole thing and run it. Idempotent — safe to re-run.
-- ============================================================================

-- A. Reverse the FALSE expiries: rows the date job expired ("past work_date")
--    whose date is actually still in the future (or open-ended). Genuinely
--    past-dated gigs and booked/filled expiries are left alone.
update public.opportunities
set status = 'active',
    notes  = nullif(
               btrim(regexp_replace(
                 notes, '^Auto-expired: past work_date \([0-9-]+\)( \| )?', '')),
               ''),
    updated_at = now()
where status = 'expired'
  and deleted_at is null
  and notes like 'Auto-expired: past work_date%'
  and (work_date is null or work_date >= current_date);

-- B. Backfill expires_at = end of the work_date day for every dated row that
--    lacks it, so the range-aware expiry below has something to key on.
update public.opportunities
set expires_at = (work_date::timestamptz + interval '1 day' - interval '1 second'),
    updated_at = now()
where expires_at is null
  and work_date is not null
  and deleted_at is null;

-- C. Range-aware auto-expire: expire only once a gig is genuinely over — its
--    expires_at (last shoot day) when known, else the single work_date.
create or replace function public.auto_expire_opportunities()
returns integer language plpgsql as $$
declare n integer;
begin
  update public.opportunities o
  set status = 'expired',
      notes = 'Auto-expired: shoot ended '
              || to_char(coalesce(o.expires_at, o.work_date::timestamptz), 'YYYY-MM-DD')
              || case when o.notes is not null and o.notes <> ''
                        and o.notes not like 'Auto-expired:%'
                      then ' | ' || o.notes else '' end,
      updated_at = now()
  where o.status = 'active'
    and o.deleted_at is null
    and coalesce(o.expires_at, (o.work_date::timestamptz + interval '1 day')) < now();
  get diagnostics n = row_count;
  return n;
end $$;

grant execute on function public.auto_expire_opportunities() to authenticated, service_role;

do $$
begin
  perform cron.unschedule('auto-expire-opportunities');
exception when others then null;
end $$;

select cron.schedule(
  'auto-expire-opportunities',
  '5,25,45 * * * *',
  $$ select public.auto_expire_opportunities(); $$
);
