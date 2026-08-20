-- Repair opportunities whose shoot date was given a BOGUS past year by the
-- extractor (e.g. a flyer's "9/5 & 9/6" that came back as 2006-09-05, so the gig
-- was born expired). This row also has a NULL expires_at, so the auto-expire cron
-- fell back to coalesce(expires_at, work_date + 1 day) = the 2006 date and killed it.
--
-- We shift each bogus year forward to the CURRENT year (preserving month/day) and
-- also set expires_at when it's null — end of the corrected work day, exactly how
-- ingest stores a single-day gig. We do NOT force a date into the future: if the
-- corrected last day is still past, the gig really is over and stays expired.
-- A row is un-expired only when its corrected expires_at is still ahead of now.

-- STEP 1 — PREVIEW. Run this first to confirm what STEP 2 will write.
with fix as (
  select
    id, title, status, work_date as old_work_date, expires_at as old_expires_at,
    (work_date + make_interval(years =>
       (extract(year from current_date)::int - extract(year from work_date)::int)))::date
      as new_work_date,
    case
      when expires_at is not null then
        expires_at + make_interval(years =>
          (extract(year from current_date)::int - extract(year from expires_at)::int))
      else
        (((work_date + make_interval(years =>
            (extract(year from current_date)::int - extract(year from work_date)::int)))::date
          + time '23:59:59') at time zone 'UTC')
    end as new_expires_at
  from opportunities
  where work_date is not null
    and extract(year from work_date) < extract(year from current_date)
)
select id, title, status, old_work_date, new_work_date, old_expires_at, new_expires_at,
       case when new_expires_at >= now() then 'active' else status end as new_status
from fix
order by new_work_date;

-- STEP 2 — APPLY. Once the preview looks right, run this UPDATE.
with fix as (
  select
    id,
    (work_date + make_interval(years =>
       (extract(year from current_date)::int - extract(year from work_date)::int)))::date
      as new_work_date,
    case
      when expires_at is not null then
        expires_at + make_interval(years =>
          (extract(year from current_date)::int - extract(year from expires_at)::int))
      else
        (((work_date + make_interval(years =>
            (extract(year from current_date)::int - extract(year from work_date)::int)))::date
          + time '23:59:59') at time zone 'UTC')
    end as new_expires_at
  from opportunities
  where work_date is not null
    and extract(year from work_date) < extract(year from current_date)
)
update opportunities o
set work_date  = f.new_work_date,
    expires_at = f.new_expires_at,
    status = case
               when o.status = 'expired' and f.new_expires_at >= now() then 'active'
               else o.status
             end
from fix f
where o.id = f.id;
