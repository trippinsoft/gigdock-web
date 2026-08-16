-- ============================================================================
-- STEP 5 — run this LAST, only after Step 1 (ingest-rss deployed) and Step 4
-- (the old expiry job fixed). Run in the Supabase SQL editor.
--
-- Puts the wrongly stale-discarded reposts back to "pending" so the next ingest
-- pass reprocesses them with the range-aware logic. Running it before Step 1 is
-- deployed would just re-discard them on the old first-date logic.
-- ============================================================================

update public.raw_ingestions
set status = 'pending', error_detail = null, processed_at = null
where status = 'discarded'
  and error_detail like 'Stale:%';
