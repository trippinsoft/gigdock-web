-- Repair opportunities whose shoot date was given a BOGUS past year by the
-- extractor (e.g. a flyer's "9/5 & 9/6" that came back as 2006-09-05).
--
-- Rule mirrors the ingest fix: a casting shoot never predates its post, so any
-- work_date whose YEAR is earlier than the current year is a misparse. We
-- re-anchor the month/day to the current year (or next year if that month/day
-- has already passed), shift expires_at the same way, and flip the row back to
-- 'active' when the corrected last day is still in the future.

-- STEP 1 — PREVIEW. Run this first to see exactly what would change.
with candidates as (
  select
    id, title, status, work_date, work_date_end, expires_at,
    -- re-anchor helper: keep month/day, move to this year, roll forward if past
    (case
       when make_date(extract(year from current_date)::int,
                      extract(month from work_date)::int,
                      extract(day  from work_date)::int) >= current_date
       then make_date(extract(year from current_date)::int,
                      extract(month from work_date)::int,
                      extract(day  from work_date)::int)
       else make_date(extract(year from current_date)::int + 1,
                      extract(month from work_date)::int,
                      extract(day  from work_date)::int)
     end) as fixed_work_date
  from opportunities
  where work_date is not null
    and extract(year from work_date) < extract(year from current_date)
)
select id, title, status,
       work_date  as old_work_date,
       fixed_work_date,
       expires_at as old_expires_at
from candidates
order by fixed_work_date;

-- STEP 2 — APPLY. Once the preview looks right, run this UPDATE.
-- It re-anchors work_date, carries work_date_end forward by the same offset,
-- rebuilds expires_at off the last day, and un-expires anything still upcoming.
with candidates as (
  select
    id, work_date, work_date_end,
    (case
       when make_date(extract(year from current_date)::int,
                      extract(month from work_date)::int,
                      extract(day  from work_date)::int) >= current_date
       then extract(year from current_date)::int
       else extract(year from current_date)::int + 1
     end) as target_year
  from opportunities
  where work_date is not null
    and extract(year from work_date) < extract(year from current_date)
),
fixed as (
  select
    c.id,
    make_date(c.target_year,
              extract(month from c.work_date)::int,
              extract(day  from c.work_date)::int) as new_work_date,
    case when c.work_date_end is not null then
      make_date(c.target_year + (extract(year from c.work_date_end)::int
                                 - extract(year from c.work_date)::int),
                extract(month from c.work_date_end)::int,
                extract(day  from c.work_date_end)::int)
    end as new_work_date_end
  from candidates c
)
update opportunities o
set work_date     = f.new_work_date,
    work_date_end = f.new_work_date_end,
    expires_at    = (coalesce(f.new_work_date_end, f.new_work_date)
                     + time '23:59:59') at time zone 'UTC',
    status = case
               when coalesce(f.new_work_date_end, f.new_work_date) >= current_date
                    and o.status = 'expired'
               then 'active'
               else o.status
             end
from fixed f
where o.id = f.id;
