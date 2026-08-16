-- ============================================================================
-- STEP 3 — run this in the Supabase SQL editor, then send me the result.
--
-- Something is still writing "Auto-expired: past work_date (…)" — a separate job
-- that expires on the raw work_date. It will keep re-expiring rows on the FIRST
-- day of a range until it's changed. This lists your scheduled jobs so we can
-- find it. (If nothing here mentions expiry, that logic lives in an edge
-- function — grep your functions for `past work_date` and send me that file.)
-- ============================================================================

select jobid, jobname, schedule, command
from cron.job
order by jobname;
