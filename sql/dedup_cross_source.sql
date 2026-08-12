-- ============================================================================
-- Cross-source duplicate detection  (run in the Supabase SQL editor)
--
-- Catches the SAME gig posted more than once — by the same casting company
-- (a repost) or by a different source/aggregator — that slips past the exact-
-- hash ingest fingerprint (ingest-rss). Runs AFTER the fact via pg_cron; never
-- touches the frozen ingest rows.
--
-- "Same gig" = ALL of:
--   • same first work_date
--   • same pay_min
--   • compatible state           (equal, OR either side null)
--   • compatible gender & ethnicity (unspecified on either side = compatible)
--   • same IDENTITY, using the clean fields ingest-rss extracts:
--       - enriched rows (both have role_key): same role_key AND non-conflicting
--         production_name (either unknown, or equal). This survives aggregator
--         retitles — the production name may be missing on one copy, but the
--         canonical role still lines up — while keeping DIFFERENT roles of the
--         same production apart.
--       - legacy rows (no role_key yet): fall back to >= 2 shared title tokens.
--
-- WINNER RULE (updated):
--   Within a duplicate group, keep ONE survivor, chosen by:
--     1. optional manual override: a source you tag sources.is_aggregator = true
--        loses to any untagged source (default: no tags, so this is neutral)
--     2. the ORIGINAL, detected PER GIG: whichever post's own source name is
--        mentioned by a sibling post in the group (a reposter credits the real
--        caster, e.g. CL Casting's post titled "Rose Locke Casting - ..."). This
--        needs no tagging and works in either direction — the same company can be
--        original for one gig and the copier for another.
--     3. then the company (`source`) that introduced the gig FIRST
--     4. then that company's LATEST post (an updated repost shows the current one)
--     5. stable tiebreak by id
--   Everyone else in the group -> status = 'hidden', notes point to the survivor
--   (auditable in the Hidden tab, fully reversible).
--
-- Depends on canon_gender()/canon_ethnicity() from gigfit_function.sql.
-- Idempotent — safe to run repeatedly.
-- ============================================================================

-- Clean identity fields populated by ingest-rss extraction (nullable; legacy
-- rows stay null and fall back to the title heuristic below until re-enriched).
alter table public.opportunities add column if not exists production_name text;
alter table public.opportunities add column if not exists role_key text;

-- OPTIONAL manual override. The winner is normally decided per-gig (see WINNER
-- RULE above), so you do NOT need to tag anything. This flag only exists as an
-- escape hatch: if a specific feed is consistently a problem, tagging it makes it
-- lose every duplicate group. Default false = neutral.
--   update public.sources set is_aggregator = true where name = 'Some Feed';
alter table public.sources add column if not exists is_aggregator boolean not null default false;

-- Lowercased, punctuation-collapsed form for comparing free text.
create or replace function public.norm_text(t text)
returns text language sql immutable as $$
  select btrim(regexp_replace(lower(coalesce(t, '')), '[^a-z0-9]+', ' ', 'g'));
$$;

-- Distinctive tokens from a title: >= 3 chars (so size/role specs like "2xl",
-- "3xl", "6ft" count — aggregators often keep the spec but rewrite everything
-- else), minus generic casting/role/gender words and common studio/platform
-- names (which would otherwise falsely link unrelated gigs that merely share
-- "netflix", "casting", "man", etc.).
create or replace function public.title_tokens(t text)
returns text[] language sql immutable as $$
  select coalesce(array_agg(distinct tok), '{}')
  from unnest(regexp_split_to_array(lower(coalesce(t, '')), '[^a-z0-9]+')) as tok
  where length(tok) >= 3
    and tok not in (
      'casting','call','calls','stand','standin','background','featured','extra',
      'extras','needed','seeking','talent','actor','actors','role','roles','work',
      'shoot','model','models','double','doubles','principal','photo','photos',
      'crew','cast','audition','auditions','booking','submit','submission',
      'film','films','series','video','videos','commercial','commercials',
      'production','productions','project','projects','paid','union','nonunion',
      'feature','features','movie','movies','show','shows','scene','scenes',
      -- generic gender / people words (not distinctive to a production)
      'man','men','male','males','woman','women','female','females','guy','guys',
      'girl','girls','boy','boys','kid','kids','teen','teens','adult','adults',
      'and','the','for','with','who','are','you','your','new','old','any','all',
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

-- Distinctive tokens from a canonical role_key. Keeps the specific role noun /
-- spec (mover, nurse, driver, "2xl") but drops generic role CATEGORIES, so two
-- different roles in the same production ("background nurse" vs "background
-- driver") don't match on the shared category word.
create or replace function public.role_tokens(t text)
returns text[] language sql immutable as $$
  select coalesce(array_agg(distinct tok), '{}')
  from unnest(regexp_split_to_array(lower(coalesce(t, '')), '[^a-z0-9]+')) as tok
  where length(tok) >= 3
    and tok !~ '^[0-9]+$'                    -- drop pure numbers (weights, sizes)
    and tok not in (
      'the','and','for','role','roles','who','with','age','over','plus','any',
      'all','other','need','needed','seeking','type','types','look','looking',
      'must','can','will','are','portray','play',
      -- generic role categories (not distinctive between two roles)
      'featured','background','extra','extras','stand','standin','principal',
      'double','doubles','photo','model','models','actor','actors','actress',
      'talent','crew','cast','casting',
      -- gender / people words (identity is matched via casting_specs, not here,
      -- so "female" alone must never link two different roles)
      'male','males','female','females','man','men','woman','women','boy','boys',
      'girl','girls','kid','kids','teen','teens','adult','adults','person',
      'people','guy','guys','lady','ladies'
    );
$$;

-- Main pass: keep one survivor per duplicate group (original company's latest
-- post), hide the rest.
create or replace function public.dedup_cross_source()
returns integer language plpgsql as $$
declare
  n integer := 0;
begin
  with active as (
    select o.id, o.source, o.posted_at, o.work_date, o.pay_min, o.match_state,
           o.title, o.summary, o.casting_specs, o.production_name, o.role_key,
           coalesce(s.is_aggregator, false) as is_aggregator
    from public.opportunities o
    left join public.sources s on s.name = o.source
    where o.status = 'active' and o.deleted_at is null
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
      and (cardinality(public.opp_genders(a.casting_specs)) = 0
           or cardinality(public.opp_genders(b.casting_specs)) = 0
           or public.opp_genders(a.casting_specs) && public.opp_genders(b.casting_specs))
      and (cardinality(public.opp_ethnicities(a.casting_specs)) = 0
           or cardinality(public.opp_ethnicities(b.casting_specs)) = 0
           or public.opp_ethnicities(a.casting_specs) && public.opp_ethnicities(b.casting_specs))
      -- Identity check. Enriched rows (both have a role_key) compare on the CLEAN
      -- signature: same role, and productions that don't conflict. Un-enriched
      -- legacy rows fall back to the raw-title token heuristic.
      and case
        when a.role_key is not null and b.role_key is not null then
          (
            public.norm_text(a.role_key) = public.norm_text(b.role_key)
            or cardinality(array(
                 select unnest(public.role_tokens(a.role_key))
                 intersect
                 select unnest(public.role_tokens(b.role_key))
               )) >= 1
          )
          and (
            a.production_name is null or btrim(a.production_name) = ''
            or b.production_name is null or btrim(b.production_name) = ''
            or public.norm_text(a.production_name) = public.norm_text(b.production_name)
          )
        else
          cardinality(array(
            select unnest(public.title_tokens(a.title))
            intersect
            select unnest(public.title_tokens(b.title))
          )) >= 2
      end
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
    select distinct nb.x, a.id as m_id, a.source, a.posted_at, a.is_aggregator,
           a.title, a.summary
    from adj nb
    join active a on a.id = nb.m
  ),
  -- Per-gig "who is the original" signal: a member is likely the ORIGINAL when a
  -- SIBLING post in the same group names its source (e.g. CL Casting's post is
  -- titled "Rose Locke Casting - ...", so Rose Locke is credited => original).
  -- Decided fresh per group, works in either direction, needs no source tagging.
  refd as (
    select n1.x, n1.m_id, n1.source, n1.posted_at, n1.is_aggregator,
           exists (
             select 1 from neigh n2
             where n2.x = n1.x and n2.m_id <> n1.m_id
               and length(n1.source) >= 4
               and position(lower(n1.source) in
                     lower(coalesce(n2.title, '') || ' ' || coalesce(n2.summary, ''))) > 0
           ) as credited_by_peer
    from neigh n1
  ),
  -- Ownership time = earliest post from a given company within this neighborhood.
  src_first as (
    select x, m_id, posted_at, is_aggregator, credited_by_peer,
           min(posted_at) over (partition by x, source) as source_first
    from refd
  ),
  -- Rank each neighborhood:
  --   1. optional manual override: primary sources beat any you tag is_aggregator
  --   2. the source a sibling CREDITS (the original) beats an uncredited reposter
  --   3. then the company that introduced the gig first
  --   4. then that company's latest post
  ranked as (
    select x, m_id,
           row_number() over (
             partition by x
             order by is_aggregator asc, credited_by_peer desc,
                      source_first asc, posted_at desc, m_id asc
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
