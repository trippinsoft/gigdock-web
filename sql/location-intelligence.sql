-- ============================================================================
-- Location intelligence: source home market + fix mis-guessed states
-- (run in the Supabase SQL editor)
--
-- Problem: for an ambiguous city with no state in the post ("Fayetteville &
-- surrounding areas"), the extractor guessed a state (AR) when the caster
-- (Rose Locke Casting) is an Atlanta / GA company — it's Fayetteville, GA.
--
-- Fix: give each source a home_state. A casting company almost always casts for
-- its own market, so when a post doesn't name a state we trust the source's
-- market instead of the model's guess. (The ingest-rss update uses this column;
-- deploy it alongside this script.)
-- ============================================================================

-- 1. Source home market.
alter table public.sources add column if not exists home_state text;

-- Rose Locke Casting is an Atlanta-market company — its ambiguous cities
-- (Fayetteville, Newnan, Covington, …) are Georgia, not AR/NC/TN.
update public.sources set home_state = 'GA' where name = 'Rose Locke Casting';

-- 2. Repair the posts already mis-tagged AR for this caster (Fayetteville = GA).
--    Fixes match_state (drives feed filtering + GigFit) and the shown location.
update public.opportunities
set match_state = 'GA',
    location    = regexp_replace(coalesce(location, ''), '\yAR\y', 'GA'),
    updated_at  = now()
where source = 'Rose Locke Casting'
  and match_state = 'AR';

-- ---------------------------------------------------------------------------
-- REVIEW HELPERS (SELECTs — run, eyeball, act as needed)
-- ---------------------------------------------------------------------------

-- A) All sources + their home_state, so you can set the rest you know:
--      update public.sources set home_state = 'GA' where name = 'Destination Casting';
--    select name, type, active, home_state from public.sources order by name;

-- B) Active posts sitting in a state via an AMBIGUOUS city name (candidates for a
--    wrong guess). Cross-check the source's real market before changing.
--    select id, title, source, location, match_state, work_date
--    from public.opportunities
--    where status = 'active' and deleted_at is null
--      and (
--        location ilike '%fayetteville%' or location ilike '%columbus%' or
--        location ilike '%springfield%'  or location ilike '%franklin%'  or
--        location ilike '%athens%'       or location ilike '%rome%'      or
--        location ilike '%manchester%'   or location ilike '%decatur%'   or
--        location ilike '%auburn%'       or location ilike '%greenville%'
--      )
--    order by match_state, source;
