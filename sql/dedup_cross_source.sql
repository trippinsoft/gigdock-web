-- ============================================================================
-- Cross-source duplicate detection  (run in the Supabase SQL editor)
--
-- Catches the SAME gig posted more than once — by the same casting company
-- (a repost) or by a different source/aggregator — that slips past the exact-
-- hash ingest fingerprint (ingest-rss). Runs AFTER the fact via pg_cron; never
-- touches the frozen ingest rows.
--
-- "Same gig" = ALL of:
--   • >= 2 shared distinctive title tokens (same production)
--   • same first work_date
--   • same pay_min
--   • compatible state           (equal, OR either side null)
--   • compatible gender & ethnicity (unspecified on either side = compatible)
--
-- WINNER RULE (updated):
--   Within a duplicate group, keep ONE survivor, chosen by:
--     1. the company (`source`) that introduced the gig FIRST wins
--        -> a later aggregator repost can never take the slot from the original
--     2. within that winning company, keep its LATEST post
--        -> a company reposting an updated call shows the current version
--     3. stable tiebreak by id
--   Everyone else in the group -> status = 'hidden', notes point to the survivor
--   (auditable in the Hidden tab, fully reversible).
--
--   In short: "same company -> newest wins; across companies -> original wins."
--
-- Depends on canon_gender()/canon_ethnicity() from gigfit_function.sql.
-- Idempotent — safe to run repeatedly.
-- ============================================================================

-- Distinctive tokens from a title: >= 4 chars, minus generic casting/role words
-- and common studio/platform names (which would otherwise falsely link unrelated
-- gigs that merely share "netflix", "casting", etc.).
create or replace function public.title_tokens(t text)
returns text[] language sql immutable as $$
  select coalesce(array_agg(distinct tok), '{}')
  from unnest(regexp_split_to_array(lower(coalesce(t, '')), '[^a-z0-9]+')) as tok
  where length(tok) >= 4
    and tok not in (
      'casting','call','calls','stand','standin','background','featured','extra',
      'extras','needed','seeking','talent','actor','actors','role','roles','work',
      'shoot','model','models','double','doubles','principal','photo','photos',
      'crew','cast','audition','auditions','booking','submit','submission',
      'film','films','series','video','videos','commercial','commercials',
      'production','productions','project','projects','paid','union','nonunion',
      'feature','features','movie','movies','show','shows','scene','scenes',
      'netflix','disney','amazon','prime','hulu','marvel','paramount','warner',
      'universal','peacock','apple','sony','showtime','starz','lionsgate'
    );
$$;

-- Canonicalized gender / ethnicity arrays for an opportunity's casting_specs
-- (open-ended values dropped). Empty array = "unspecified".
create or replace function public.opp_genders(specs jsonb)
returns text[] language sql immutable as $$
  select coalesce(array_agg(distinct cg) filter (where cg <> ''), '{}')
  from (
    select public.canon_gender(g) as cg
    from jsonb_array_elements_text(
      case when jsonb_typeof(specs->'gender') = 'array' then specs->'gender' else '[]'::jsonb end
    ) g
  ) s;
$$;

create or replace function public.opp_ethnicities(specs jsonb)
returns text[] language sql immutable as $$
  select coalesce(array_agg(distinct ce) filter (where ce <> ''), '{}')
  from (
    select public.canon_ethnicity(e) as ce
    from jsonb_array_elements_text(
      case when jsonb_typeof(specs->'ethnicity') = 'array' then specs->'ethnicity' else '[]'::jsonb end
    ) e
  ) s;
$$;

-- Main pass: keep one survivor per duplicate group (original company's latest
-- post), hide the rest.
create or replace function public.dedup_cross_source()
returns integer language plpgsql as $$
declare
  n integer := 0;
begin
  with active as (
    select id, source, posted_at, work_date, pay_min, match_state, title, casting_specs
    from public.opportunities
    where status = 'active' and deleted_at is null
  ),
  -- Unordered "same gig" pairs.
  pairs as (
    select a.id as a_id, b.id as b_id
    from active a
    join active b
      on a.id < b.id
      and a.work_date is not null and a.work_date = b.work_date
      and a.pay_min   is not null and a.pay_min   = b.pay_min
      and (a.match_state is null or b.match_state is null or a.match_state = b.match_state)
      and cardinality(array(
            select unnest(public.title_tokens(a.title))
            intersect
            select unnest(public.title_tokens(b.title))
          )) >= 2
      and (cardinality(public.opp_genders(a.casting_specs)) = 0
           or cardinality(public.opp_genders(b.casting_specs)) = 0
           or public.opp_genders(a.casting_specs) && public.opp_genders(b.casting_specs))
      and (cardinality(public.opp_ethnicities(a.casting_specs)) = 0
           or cardinality(public.opp_ethnicities(b.casting_specs)) = 0
           or public.opp_ethnicities(a.casting_specs) && public.opp_ethnicities(b.casting_specs))
  ),
  -- Symmetric adjacency + each node linked to itself, so every active row has a
  -- neighborhood (its duplicate group) even if it matched nothing.
  adj as (
    select a_id as x, b_id as m from pairs
    union
    select b_id as x, a_id as m from pairs
    union
    select id   as x, id   as m from active
  ),
  -- Neighborhood members with their attributes.
  neigh as (
    select distinct nb.x, a.id as m_id, a.source, a.posted_at
    from adj nb
    join active a on a.id = nb.m
  ),
  -- Ownership time = earliest post from a given company within this neighborhood.
  src_first as (
    select x, m_id, posted_at,
           min(posted_at) over (partition by x, source) as source_first
    from neigh
  ),
  -- Rank each neighborhood: original company first, then that company's latest.
  ranked as (
    select x, m_id,
           row_number() over (
             partition by x
             order by source_first asc, posted_at desc, m_id asc
           ) as rnk
    from src_first
  ),
  canonical as (
    select x, m_id as canonical_id
    from ranked
    where rnk = 1
  )
  update public.opportunities o
  set status = 'hidden',
      notes = 'Cross-source duplicate of ' || c.canonical_id
              || case when o.notes is not null and o.notes <> '' then ' | ' || o.notes else '' end,
      updated_at = now()
  from canonical c
  where o.id = c.x
    and c.canonical_id <> o.id
    and o.status = 'active' and o.deleted_at is null;

  get diagnostics n = row_count;
  return n;
end;
$$;

grant execute on function public.title_tokens(text)    to authenticated, anon, service_role;
grant execute on function public.opp_genders(jsonb)     to authenticated, anon, service_role;
grant execute on function public.opp_ethnicities(jsonb) to authenticated, anon, service_role;
grant execute on function public.dedup_cross_source()   to authenticated, service_role;

-- Keep the every-10-minutes schedule (idempotent).
do $$
begin
  perform cron.unschedule('dedup-cross-source');
exception when others then null;
end $$;

select cron.schedule(
  'dedup-cross-source',
  '8,18,28,38,48,58 * * * *',
  $$ select public.dedup_cross_source(); $$
);

-- ============================================================================
-- ONE-TIME CATCH-UP  (safe to re-run)
-- Reverse earlier mis-hides so the corrected rule re-evaluates from scratch:
-- un-hide rows this dedup previously hid (identified by their note), strip the
-- stale note, then run the corrected pass so the RIGHT copy survives.
-- Only revives non-stale rows; manual hides (no dedup note) are left alone.
-- ============================================================================
update public.opportunities
set status = 'active',
    notes = nullif(btrim(regexp_replace(notes,
              'Cross-source duplicate of [0-9a-fA-F-]+( \| )?', '')), ''),
    updated_at = now()
where status = 'hidden'
  and notes like 'Cross-source duplicate of %'
  and (work_date is null or work_date >= current_date);

select public.dedup_cross_source();
