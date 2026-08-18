-- ============================================================================
-- gigfit() + height matching  (run in the Supabase SQL editor)
--
-- Adds a HEIGHT gate to the matcher, mirroring the age gate's philosophy:
--   • profile height within the stated range (± 1") -> counts as a match
--   • a little outside (<= 3")                       -> Poor match  (b_soft)
--   • well outside (> 3")                            -> Not eligible (b_hard)
-- Only fires when the gig states a height AND the profile has one. Gigs with no
-- stated height are unaffected. Pairs with casting_specs.height_min/max_inches
-- from the ingest-rss extraction.
--
-- ASSUMPTION: performer_profiles has an integer column `height_inches`
-- (total inches, e.g. 5'10" = 70). If your column is named differently, tell me
-- and I'll adjust the two `prof.height_inches` references.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.gigfit(p_profile_id uuid)
 RETURNS TABLE(opportunity_id uuid, eligible boolean, tier text, label text, color text, matched text[], blockers text[])
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  prof public.performer_profiles%rowtype;
  o record;
  m text[];
  b_hard text[];   -- immutable blockers (gender, ethnicity, far-off age/height) -> Not eligible
  b_soft text[];   -- subjective factors (near age/height, location, union, pay) -> Poor match
  v_age int;
  v_dist int;
  rng text;
  c jsonb;
  g_wanted text[];
  e_wanted text[];
  pu text;
  cu text;
  has_special boolean;
  v_h int; v_hlo int; v_hhi int; v_hdist int;
  v_hrng text; v_hlabel text;
begin
  select * into prof from public.performer_profiles where id = p_profile_id;
  if not found then
    return;  -- no such profile (or RLS blocked) -> no rows
  end if;

  v_age := case when prof.date_of_birth is not null
                then extract(year from age(current_date, prof.date_of_birth))::int
                else null end;
  pu := public.canon_union(prof.union_status);

  for o in
    select id, match_state, pay_min, coalesce(casting_specs, '{}'::jsonb) as c
    from public.opportunities
    where status = 'active' and deleted_at is null
  loop
    m := '{}';
    b_hard := '{}';
    b_soft := '{}';
    c := o.c;

    -- Soft: location (your markets are a preference — you can still travel/apply)
    if o.match_state is not null and array_length(prof.markets, 1) is not null then
      if o.match_state = any(prof.markets) then
        m := array_append(m, 'location');
      else
        b_soft := array_append(b_soft, 'Outside your markets (' || o.match_state || ')');
      end if;
    end if;

    -- Gate: gender. Inclusive — "all genders"/"any" is open to everyone; only a
    -- real, specific gender can gate.
    if jsonb_typeof(c->'gender') = 'array'
       and jsonb_array_length(c->'gender') > 0
       and prof.gender is not null then
      select array_agg(cg) into g_wanted
      from (
        select public.canon_gender(x) as cg
        from jsonb_array_elements_text(c->'gender') as x
      ) s
      where cg <> '';           -- drop open-ended values before gating
      if g_wanted is null then
        null;                   -- gig is open to all genders → no gate
      elsif public.canon_gender(prof.gender) = any(g_wanted) then
        m := array_append(m, 'gender');
      else
        b_hard := array_append(b_hard, 'Gender doesn''t match');
      end if;
    end if;

    -- Gate: ethnicity. Inclusive — a gig that names no ethnicity, or only says
    -- "all ethnicities welcome"/"open to all", is open to everyone. Only real,
    -- specific ethnicity values can gate.
    if jsonb_typeof(c->'ethnicity') = 'array'
       and jsonb_array_length(c->'ethnicity') > 0
       and array_length(prof.ethnicity, 1) is not null then
      select array_agg(ce) into e_wanted
      from (
        select public.canon_ethnicity(x) as ce
        from jsonb_array_elements_text(c->'ethnicity') as x
      ) s
      where ce <> '';           -- drop open-ended values before gating
      if e_wanted is null then
        null;                   -- gig is open to all ethnicities → no gate
      elsif exists (
        select 1 from unnest(prof.ethnicity) pe
        where public.canon_ethnicity(pe) = any(e_wanted)
      ) then
        m := array_append(m, 'ethnicity');
      else
        b_hard := array_append(b_hard, 'Ethnicity doesn''t match');
      end if;
    end if;

    -- Age: within the range = match; a few years outside = soft (casting flexes);
    -- far outside (>5 yrs, e.g. adult for a kids' role) = hard.
    if ((c->>'age_min') is not null or (c->>'age_max') is not null) and v_age is not null then
      if ((c->>'age_min') is null or v_age >= (c->>'age_min')::int)
         and ((c->>'age_max') is null or v_age <= (c->>'age_max')::int) then
        m := array_append(m, 'age');
      else
        v_dist := case
          when (c->>'age_min') is not null and v_age < (c->>'age_min')::int then (c->>'age_min')::int - v_age
          when (c->>'age_max') is not null and v_age > (c->>'age_max')::int then v_age - (c->>'age_max')::int
          else 999 end;
        rng := coalesce(c->>'age_min', 'any') || '–' || coalesce(c->>'age_max', 'any');
        if v_dist <= 5 then
          b_soft := array_append(b_soft, 'Age ' || v_age || ' vs ' || rng);
        else
          b_hard := array_append(b_hard, 'Age ' || v_age || ' outside ' || rng);
        end if;
      end if;
    end if;

    -- Height: a physical requirement (esp. stand-ins/photo-doubles matched to a
    -- principal). Within ~1" of the stated range = match; a little outside = soft
    -- (measurement flex); well outside = hard (genuinely can't be cast).
    v_hlo := (nullif(c->>'height_min_inches', ''))::int;
    v_hhi := (nullif(c->>'height_max_inches', ''))::int;
    if (v_hlo is not null or v_hhi is not null)
       and prof.height_inches is not null and prof.height_inches > 0 then
      v_h := prof.height_inches;
      v_hdist := case
        when v_hlo is not null and v_h < v_hlo then v_hlo - v_h
        when v_hhi is not null and v_h > v_hhi then v_h - v_hhi
        else 0 end;
      v_hlabel := format('%s''%s"', v_h / 12, v_h % 12);
      v_hrng :=
        case when v_hlo is not null then format('%s''%s"', v_hlo / 12, v_hlo % 12) else 'any' end
        || '–' ||
        case when v_hhi is not null then format('%s''%s"', v_hhi / 12, v_hhi % 12) else 'any' end;
      if v_hdist <= 1 then
        m := array_append(m, 'height');
      elsif v_hdist <= 3 then
        b_soft := array_append(b_soft, 'Height ' || v_hlabel || ' vs ' || v_hrng);
      else
        b_hard := array_append(b_hard, 'Height ' || v_hlabel || ' outside ' || v_hrng);
      end if;
    end if;

    -- Soft: union (waivers / fi-core / non-union joining make this flexible)
    cu := public.canon_union(c->>'union_status');
    if cu <> '' and cu <> 'either' and pu <> '' and pu <> 'either' then
      if pu = cu then
        m := array_append(m, 'union');
      else
        b_soft := array_append(b_soft, 'Union (' || cu || ') differs from yours');
      end if;
    end if;

    -- Soft: pay floor is your own preference
    if prof.pay_minimum is not null and o.pay_min is not null and o.pay_min < prof.pay_minimum then
      b_soft := array_append(b_soft, 'Pay ($' || o.pay_min || ') below your $' || prof.pay_minimum || ' minimum');
    end if;

    -- Hard blocker → genuinely can't be cast.
    if array_length(b_hard, 1) is not null then
      opportunity_id := o.id; eligible := false; tier := 'ineligible';
      label := 'Not eligible'; color := 'amber';
      matched := m; blockers := b_hard || b_soft;
      return next;
      continue;
    end if;

    -- Only soft factors off → a long shot the user can still apply to.
    if array_length(b_soft, 1) is not null then
      opportunity_id := o.id; eligible := true; tier := 'poor';
      label := 'Poor match'; color := 'zinc';
      matched := m; blockers := b_soft;
      return next;
      continue;
    end if;

    -- Bonus matches (add fit, never block)
    if (c->>'work_type') is not null
       and (c->>'work_type') = any(coalesce(prof.work_types_wanted, '{}')) then
      m := array_append(m, 'type');
    end if;
    if jsonb_typeof(c->'skills') = 'array' and array_length(prof.skills, 1) is not null
       and exists (select 1 from jsonb_array_elements_text(c->'skills') s where s = any(prof.skills)) then
      m := array_append(m, 'skill');
    end if;
    if jsonb_typeof(c->'vehicle') = 'array' and array_length(prof.vehicles, 1) is not null
       and exists (select 1 from jsonb_array_elements_text(c->'vehicle') v where v = any(prof.vehicles)) then
      m := array_append(m, 'vehicle');
    end if;

    -- Tier by specificity
    has_special := ('skill' = any(m)) or ('vehicle' = any(m));
    if has_special or coalesce(array_length(m, 1), 0) >= 3 then
      tier := 'strong'; label := 'Strong match'; color := 'green';
    elsif coalesce(array_length(m, 1), 0) >= 1 then
      tier := 'good'; label := 'Good match'; color := 'blue';
    else
      tier := 'open'; label := 'Open call'; color := 'zinc';
    end if;

    opportunity_id := o.id; eligible := true; matched := m; blockers := '{}';
    return next;
  end loop;
end;
$function$;
