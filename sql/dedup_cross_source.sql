-- ============================================================================
-- Cross-source duplicate detection (run in the Supabase SQL editor).
--
-- Problem: the ingest fingerprint is an exact hash, so the SAME gig posted by
-- TWO different sources (different title/source/wording) slips through as two
-- separate opportunities. This pass catches those AFTER the fact — it never
-- touches the frozen ingest.
--
-- "Same gig" = ALL of:
--   • >= 2 shared distinctive title tokens (same production, e.g. "lizard"+"music")
--   • same first work_date
--   • same pay_min
--   • same match_state          (separates a NC shoot from a GA shoot)
--   • compatible gender & ethnicity (unspecified on either side = compatible,
--     so female/black stays distinct from male/hispanic, but a source that just
--     omitted a spec still matches)
--
-- The EARLIEST-posted opportunity in each group stays active ("first company to
-- post it wins"); the rest are set to status='hidden' with a note pointing to the
-- canonical one, so they're auditable in the Hidden tab and fully reversible.
--
-- Depends on canon_gender()/canon_ethnicity() from gigfit_function.sql (run that
-- first). Idempotent — safe to run repeatedly.
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
      -- role / casting noise
      'casting','call','calls','stand','standin','background','featured','extra',
      'extras','needed','seeking','talent','actor','actors','role','roles','work',
      'shoot','model','models','double','doubles','principal','photo','photos',
      'crew','cast','audition','auditions','booking','submit','submission',
      -- generic descriptors
      'film','films','series','video','videos','commercial','commercials',
      'production','productions','project','projects','paid','union','nonunion',
      'feature','features','movie','movies','show','shows','scene','scenes',
      -- studios / platforms (distinctive but appear across unrelated gigs)
      'netflix','disney','amazon','prime','hulu','marvel','paramount','warner',
      'universal','peacock','apple','sony','showtime','starz','lionsgate'
    );
$$;

-- Canonicalized gender / ethnicity arrays for an opportunity's casting_specs
-- (open-ended values dropped). Empty array = "unspecified".
create or replace function public.opp_genders(specs jsonb)
returns text[] language sql immutable as $$
  select coalesce(
    array_agg(distinct cg) filter (where cg <> ''),
    '{}'
  )
  from (
    select public.canon_gender(g) as cg
    from jsonb_array_elements_text(
      case when jsonb_typeof(specs->'gender') = 'array' then specs->'gender' else '[]'::jsonb end
    ) g
  ) s;
$$;

create or replace function public.opp_ethnicities(specs jsonb)
returns text[] language sql immutable as $$
  select coalesce(
    array_agg(distinct ce) filter (where ce <> ''),
    '{}'
  )
  from (
    select public.canon_ethnicity(e) as ce
    from jsonb_array_elements_text(
      case when jsonb_typeof(specs->'ethnicity') = 'array' then specs->'ethnicity' else '[]'::jsonb end
    ) e
  ) s;
$$;

-- Main pass: hide later duplicates, keep the earliest-posted of each group.
create or replace function public.dedup_cross_source()
returns integer language plpgsql as $$
declare
  n integer := 0;
begin
  with dups as (
    select
      x.id as dup_id,
      (
        select y.id
        from public.opportunities y
        where y.status = 'active' and y.deleted_at is null and y.id <> x.id
          and (y.posted_at < x.posted_at or (y.posted_at = x.posted_at and y.id < x.id))
          and y.work_date is not null and y.work_date = x.work_date
          and y.pay_min is not null and y.pay_min = x.pay_min
          and y.match_state is not null and y.match_state = x.match_state
          and cardinality(array(
                select unnest(public.title_tokens(y.title))
                intersect
                select unnest(public.title_tokens(x.title))
              )) >= 2
          and (cardinality(public.opp_genders(y.casting_specs)) = 0
               or cardinality(public.opp_genders(x.casting_specs)) = 0
               or public.opp_genders(y.casting_specs) && public.opp_genders(x.casting_specs))
          and (cardinality(public.opp_ethnicities(y.casting_specs)) = 0
               or cardinality(public.opp_ethnicities(x.casting_specs)) = 0
               or public.opp_ethnicities(y.casting_specs) && public.opp_ethnicities(x.casting_specs))
        order by y.posted_at asc, y.id asc
        limit 1
      ) as canonical_id
    from public.opportunities x
    where x.status = 'active' and x.deleted_at is null
  )
  update public.opportunities o
  set status = 'hidden',
      notes = 'Cross-source duplicate of ' || d.canonical_id
              || case when o.notes is not null and o.notes <> '' then ' | ' || o.notes else '' end,
      updated_at = now()
  from dups d
  where o.id = d.dup_id and d.canonical_id is not null;

  get diagnostics n = row_count;
  return n;
end;
$$;

grant execute on function public.title_tokens(text)       to authenticated, anon, service_role;
grant execute on function public.opp_genders(jsonb)        to authenticated, anon, service_role;
grant execute on function public.opp_ethnicities(jsonb)    to authenticated, anon, service_role;
grant execute on function public.dedup_cross_source()      to authenticated, service_role;

-- One-time run (also safe to run manually any time):
--   select public.dedup_cross_source();

-- Schedule it a couple minutes after ingest/auto-activate each cycle.
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
