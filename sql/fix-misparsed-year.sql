-- Repair opportunities whose shoot date was given a BOGUS past year by the
-- extractor (e.g. a flyer's "9/5 & 9/6" that came back as 2006-09-05, so the gig
-- was born expired). The opportunities table has no work_date_end column — the
-- range end lives in expires_at — so we re-anchor both work_date and expires_at.
--
-- We shift each bogus year forward to the CURRENT year, preserving month/day (and
-- the time-of-day on expires_at). We do NOT force a date into the future: if the
-- corrected last day is still in the past, the gig really is over and stays
-- expired. A row is un-expired only when its corrected expires_at is still ahead.

-- STEP 1 — PREVIEW. Run this first to see exactly what would change.
select
  id, title, status,
  work_date  as old_work_date,
  work_date  + make_interval(years =>
                 (extract(year from current_date)::int - extract(year from work_date)::int))
             as new_work_date,
  expires_at as old_expires_at,
  expires_at + make_interval(years =>
                 (extract(year from current_date)::int - extract(year from expires_at)::int))
             as new_expires_at
from opportunities
where work_date is not null
  and extract(year from work_date) < extract(year from current_date)
order by new_work_date;

-- STEP 2 — APPLY. Once the preview looks right, run this UPDATE.
update opportunities o
set work_date  = o.work_date
                 + make_interval(years =>
                     (extract(year from current_date)::int - extract(year from o.work_date)::int)),
    expires_at = case
                   when o.expires_at is not null then
                     o.expires_at + make_interval(years =>
                       (extract(year from current_date)::int - extract(year from o.expires_at)::int))
                 end,
    status = case
               when o.status = 'expired'
                    and o.expires_at is not null
                    and o.expires_at + make_interval(years =>
                          (extract(year from current_date)::int
                           - extract(year from o.expires_at)::int)) >= now()
               then 'active'
               else o.status
             end
where o.work_date is not null
  and extract(year from o.work_date) < extract(year from current_date);
