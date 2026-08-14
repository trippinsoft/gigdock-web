-- ============================================================================
-- ORDER OF OPERATIONS
--   1. Re-run the updated dedup_cross_source.sql first.
--   2. Run this file to reconcile (re-decide hides from a clean slate) + validate.
-- ============================================================================

-- ---- Step 1: un-hide prior DETERMINISTIC dedup hides so the corrected rule
--             re-decides. Leaves AI-adjudicator hides (marked "(AI)") in place,
--             and non-stale rows only. Manual hides (no dedup note) are untouched.
update public.opportunities
set status = 'active',
    notes = nullif(btrim(regexp_replace(notes,
              'Cross-source duplicate of [0-9a-fA-F-]+( \| )?', '')), ''),
    updated_at = now()
where status = 'hidden'
  and notes like 'Cross-source duplicate of %'
  and notes not like '%(AI)%'
  and (work_date is null or work_date >= current_date);

-- ---- Step 2: re-run the dedup. Returns how many it hid this pass.
select public.dedup_cross_source() as newly_hidden;

-- ============================================================================
-- VALIDATION
-- ============================================================================

-- A) Coverage: how enriched is the active set now? (want null_role_key ~ 0)
select
  count(*)                                            as active_total,
  count(*) filter (where role_key is null)            as null_role_key,
  count(*) filter (where production_name is not null) as have_production
from public.opportunities
where status = 'active' and deleted_at is null;

-- B) Any ACTIVE duplicate groups left with an identical role_key? Ideally empty.
--    (Only catches exact role_key matches; near-worded keys won't show.)
select role_key, work_date, pay_min, match_state,
       count(*) as still_active,
       array_agg(source order by posted_at) as sources
from public.opportunities
where status = 'active' and deleted_at is null and role_key is not null
group by role_key, work_date, pay_min, match_state
having count(*) > 1
order by still_active desc;

-- C) What the pass hid and the survivor it points to. kept_source should be the
--    primary caster (the one credited), not an aggregator.
select o.source, o.title, o.work_date, o.pay_min, o.role_key,
       c.source as kept_source, c.title as kept_title
from public.opportunities o
left join public.opportunities c
  on c.id = nullif(substring(o.notes from 'Cross-source duplicate of ([0-9a-fA-F-]+)'), '')::uuid
where o.status = 'hidden' and o.notes like 'Cross-source duplicate of %'
order by o.updated_at desc
limit 50;
