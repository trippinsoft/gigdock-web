-- ============================================================================
-- GigFit — universal matching core (Phase B)
--
-- Establishes THREE entry points that all share one matching implementation:
--
--   gigfit_match(...) — pure function, no auth. Takes universal inputs
--                       (work_roles, work_markets) plus optional
--                       performer-specific inputs. Used directly by
--                       gigfit_preview and indirectly by the two auth
--                       wrappers. Single source of truth.
--
--   gigfit_preview(...) — anonymous public wrapper for pre-account
--                       Opportunity Preview during the signup wizard.
--                       Same signature as gigfit_match; grants execute
--                       to anon + authenticated.
--
--   gigfit_for_user() — authenticated generic entry. Resolves the caller
--                       via auth.uid(). Loads universal signals from
--                       public.profiles. If (and only if) at least one
--                       selected work_role is a performer role, ALSO
--                       loads performer-specific criteria from the
--                       user's default performer_profiles row. Crew-only
--                       users never inherit stale performer data.
--
--   gigfit(p_profile_id uuid) — LEGACY wrapper preserved for mobile
--                       compatibility. Loads the performer profile by id,
--                       then reads work_roles + work_markets from
--                       public.profiles for that user, falling back to
--                       the legacy performer_profiles.markets when
--                       profiles.work_markets is empty (Draftbit hasn't
--                       yet moved to the universal column). Delegates
--                       to gigfit_match with all criteria populated.
--
-- Tri-state role signal (correction #1 from the plan):
--   MATCH    — opportunity's casting_specs.work_type ∈ user_work_types
--              OR opportunity.role_families ∩ user_role_families non-empty
--              → append 'role' to matched
--   MISMATCH — opportunity has structured role classification and it does
--              NOT overlap with the user's targets → soft blocker
--              "Different work role from yours"
--   UNKNOWN  — opportunity has no usable structured role signal
--              → neither match nor blocker (silent)
--
-- Universal market signal: soft, same behavior as before but sources
-- markets from profiles.work_markets (universal) instead of
-- performer_profiles.markets.
--
-- Poor / Good / Strong tiering is preserved unchanged. Missing information
-- must never fabricate a mismatch — it can only reduce confidence and
-- prevent Strong.
--
-- Idempotent. Safe to re-run.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- gigfit_match — core matcher. No auth, no row lookups except the
-- opportunity scan and (for the tri-state role signal) a small lookup
-- against work_roles_catalog for the user's role_key targets.
-- ---------------------------------------------------------------------------
create or replace function public.gigfit_match(
  p_work_roles         text[],
  p_work_markets       text[],
  p_gender             text        default null,
  p_ethnicity          text[]      default null,
  p_date_of_birth      date        default null,
  p_union_status       text        default null,
  p_height_inches      int         default null,
  p_pay_minimum        numeric     default null,
  p_work_types_wanted  text[]      default null,
  p_skills             text[]      default null,
  p_vehicles           text[]      default null
) returns table(
  opportunity_id uuid,
  eligible       boolean,
  tier           text,
  label          text,
  color          text,
  matched        text[],
  blockers       text[]
)
language plpgsql
stable
set search_path = public, pg_temp
as $$
declare
  o record;
  m text[];
  b_hard text[];
  b_soft text[];
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
  v_user_work_types    text[] := array[]::text[];
  v_user_role_families text[] := array[]::text[];
  o_role_families text[];
  o_work_type text;
  role_signal_present boolean;
begin
  v_age := case when p_date_of_birth is not null
                then extract(year from age(current_date, p_date_of_birth))::int
                else null end;
  pu := public.canon_union(p_union_status);

  -- Resolve the union of opportunity-side signals for the user's roles.
  -- Any role_key not in catalog yields empty arrays and does not
  -- contribute to matching (safe for future/other keys).
  if p_work_roles is not null and array_length(p_work_roles, 1) is not null then
    select coalesce(array_agg(distinct wt), array[]::text[]),
           coalesce(array_agg(distinct rf), array[]::text[])
      into v_user_work_types, v_user_role_families
      from public.work_roles_catalog c
      left join lateral unnest(c.opportunity_work_types)    as wt on true
      left join lateral unnest(c.opportunity_role_families) as rf on true
     where c.role_key = any(p_work_roles)
       and c.is_active;
    v_user_work_types    := array_remove(coalesce(v_user_work_types,    '{}'), null);
    v_user_role_families := array_remove(coalesce(v_user_role_families, '{}'), null);
  end if;

  for o in
    select id,
           match_state,
           pay_min,
           coalesce(casting_specs, '{}'::jsonb) as c,
           coalesce(role_families, '{}'::text[]) as rf
      from public.opportunities
     where status = 'active' and deleted_at is null
  loop
    m := '{}';
    b_hard := '{}';
    b_soft := '{}';
    c := o.c;
    o_role_families := o.rf;
    o_work_type := nullif(c->>'work_type', '');

    -- ---------------------------------------------------------------------
    -- Universal signal: location. Soft — markets are a preference.
    -- Sourced from p_work_markets (profiles.work_markets, universal).
    -- ---------------------------------------------------------------------
    if o.match_state is not null and array_length(p_work_markets, 1) is not null then
      if o.match_state = any(p_work_markets) then
        m := array_append(m, 'location');
      else
        b_soft := array_append(b_soft, 'Outside your markets (' || o.match_state || ')');
      end if;
    end if;

    -- ---------------------------------------------------------------------
    -- Universal signal: role. Tri-state.
    --   MATCH    → append 'role' to matched
    --   MISMATCH → soft blocker (never hard-blocks; a curious user can
    --             still apply outside their stated roles)
    --   UNKNOWN  → silent (no match, no blocker)
    --
    -- We treat the opportunity as "has structured role classification" if
    -- casting_specs.work_type is set OR role_families is non-empty. If
    -- neither, we say UNKNOWN and never mismatch.
    --
    -- Absent user role targets (v_user_* both empty) also degrades to
    -- silent — a user with no work_roles set exerts no role preference.
    -- ---------------------------------------------------------------------
    if array_length(v_user_work_types, 1) is not null
       or array_length(v_user_role_families, 1) is not null then
      if (o_work_type is not null and o_work_type = any(v_user_work_types))
         or (cardinality(o_role_families) > 0
             and o_role_families && v_user_role_families) then
        m := array_append(m, 'role');
      else
        role_signal_present := (o_work_type is not null)
                               or (cardinality(o_role_families) > 0);
        if role_signal_present then
          b_soft := array_append(b_soft, 'Different work role from yours');
        end if;
        -- If neither side has structured signal: silent (UNKNOWN).
      end if;
    end if;

    -- ---------------------------------------------------------------------
    -- Performer-specific gates below. Each one activates only when its
    -- corresponding parameter is non-null — a crew-only user (all
    -- p_gender / p_ethnicity / p_date_of_birth / p_union_status /
    -- p_height_inches null) exerts NO performer-specific matching at all.
    -- ---------------------------------------------------------------------

    -- Gate: gender (inclusive — "all genders" open to everyone).
    if p_gender is not null
       and jsonb_typeof(c->'gender') = 'array'
       and jsonb_array_length(c->'gender') > 0 then
      select array_agg(cg) into g_wanted
        from (
          select public.canon_gender(x) as cg
            from jsonb_array_elements_text(c->'gender') as x
        ) s
       where cg <> '';
      if g_wanted is null then
        null;                       -- open to all → no gate
      elsif public.canon_gender(p_gender) = any(g_wanted) then
        m := array_append(m, 'gender');
      else
        b_hard := array_append(b_hard, 'Gender doesn''t match');
      end if;
    end if;

    -- Gate: ethnicity (inclusive — "open to all" is open to everyone).
    if p_ethnicity is not null
       and array_length(p_ethnicity, 1) is not null
       and jsonb_typeof(c->'ethnicity') = 'array'
       and jsonb_array_length(c->'ethnicity') > 0 then
      select array_agg(ce) into e_wanted
        from (
          select public.canon_ethnicity(x) as ce
            from jsonb_array_elements_text(c->'ethnicity') as x
        ) s
       where ce <> '';
      if e_wanted is null then
        null;                       -- open to all → no gate
      elsif exists (
        select 1 from unnest(p_ethnicity) pe
         where public.canon_ethnicity(pe) = any(e_wanted)
      ) then
        m := array_append(m, 'ethnicity');
      else
        b_hard := array_append(b_hard, 'Ethnicity doesn''t match');
      end if;
    end if;

    -- Gate: age (within range = match; ≤5y = soft; >5y = hard).
    if v_age is not null
       and ((c->>'age_min') is not null or (c->>'age_max') is not null) then
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

    -- Gate: height (physical — ≤1" match, ≤3" soft, >3" hard).
    v_hlo := (nullif(c->>'height_min_inches', ''))::int;
    v_hhi := (nullif(c->>'height_max_inches', ''))::int;
    if p_height_inches is not null and p_height_inches > 0
       and (v_hlo is not null or v_hhi is not null) then
      v_h := p_height_inches;
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

    -- Soft: union (waivers make this flexible).
    cu := public.canon_union(c->>'union_status');
    if cu <> '' and cu <> 'either' and pu <> '' and pu <> 'either' then
      if pu = cu then
        m := array_append(m, 'union');
      else
        b_soft := array_append(b_soft, 'Union (' || cu || ') differs from yours');
      end if;
    end if;

    -- Soft: pay floor.
    if p_pay_minimum is not null and o.pay_min is not null and o.pay_min < p_pay_minimum then
      b_soft := array_append(b_soft, 'Pay ($' || o.pay_min || ') below your $' || p_pay_minimum || ' minimum');
    end if;

    -- ---------------------------------------------------------------------
    -- Emit hard-blocker rows.
    -- ---------------------------------------------------------------------
    if array_length(b_hard, 1) is not null then
      opportunity_id := o.id;
      eligible := false;
      tier := 'ineligible';
      label := 'Not eligible';
      color := 'amber';
      matched := m;
      blockers := b_hard || b_soft;
      return next;
      continue;
    end if;

    -- Only soft factors off → Poor match (still eligible / applyable).
    if array_length(b_soft, 1) is not null then
      opportunity_id := o.id;
      eligible := true;
      tier := 'poor';
      label := 'Poor match';
      color := 'zinc';
      matched := m;
      blockers := b_soft;
      return next;
      continue;
    end if;

    -- Bonus matches (add specificity, never gate).
    if p_work_types_wanted is not null
       and o_work_type is not null
       and o_work_type = any(p_work_types_wanted) then
      m := array_append(m, 'type');
    end if;
    if p_skills is not null and array_length(p_skills, 1) is not null
       and jsonb_typeof(c->'skills') = 'array'
       and exists (select 1 from jsonb_array_elements_text(c->'skills') s where s = any(p_skills)) then
      m := array_append(m, 'skill');
    end if;
    if p_vehicles is not null and array_length(p_vehicles, 1) is not null
       and jsonb_typeof(c->'vehicle') = 'array'
       and exists (select 1 from jsonb_array_elements_text(c->'vehicle') v where v = any(p_vehicles)) then
      m := array_append(m, 'vehicle');
    end if;

    -- Tier by specificity — labels unchanged: Poor / Good / Strong.
    has_special := ('skill' = any(m)) or ('vehicle' = any(m));
    if has_special or coalesce(array_length(m, 1), 0) >= 3 then
      tier := 'strong'; label := 'Strong match'; color := 'green';
    elsif coalesce(array_length(m, 1), 0) >= 1 then
      tier := 'good';  label := 'Good match';   color := 'blue';
    else
      tier := 'open';  label := 'Open call';    color := 'zinc';
    end if;

    opportunity_id := o.id;
    eligible := true;
    matched := m;
    blockers := '{}';
    return next;
  end loop;
end $$;

revoke execute on function public.gigfit_match(text[],text[],text,text[],date,text,int,numeric,text[],text[],text[]) from public;
grant  execute on function public.gigfit_match(text[],text[],text,text[],date,text,int,numeric,text[],text[],text[]) to anon, authenticated;


-- ---------------------------------------------------------------------------
-- gigfit_preview — anonymous public wrapper. Same signature as
-- gigfit_match. Used by the pre-account Opportunity Preview.
-- ---------------------------------------------------------------------------
create or replace function public.gigfit_preview(
  p_work_roles         text[],
  p_work_markets       text[],
  p_gender             text        default null,
  p_ethnicity          text[]      default null,
  p_date_of_birth      date        default null,
  p_union_status       text        default null,
  p_height_inches      int         default null,
  p_pay_minimum        numeric     default null,
  p_work_types_wanted  text[]      default null,
  p_skills             text[]      default null,
  p_vehicles           text[]      default null
) returns table(
  opportunity_id uuid, eligible boolean, tier text, label text, color text,
  matched text[], blockers text[]
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select * from public.gigfit_match(
    p_work_roles, p_work_markets, p_gender, p_ethnicity, p_date_of_birth,
    p_union_status, p_height_inches, p_pay_minimum, p_work_types_wanted,
    p_skills, p_vehicles
  )
$$;

revoke execute on function public.gigfit_preview(text[],text[],text,text[],date,text,int,numeric,text[],text[],text[]) from public;
grant  execute on function public.gigfit_preview(text[],text[],text,text[],date,text,int,numeric,text[],text[],text[]) to anon, authenticated;


-- ---------------------------------------------------------------------------
-- gigfit_for_user — authenticated generic entry.
-- Does NOT require a performer_profiles row. Loads universal signals from
-- profiles. If ANY selected work_role is is_performer, ALSO loads the
-- user's default performer_profiles row and passes its criteria along.
-- Crew-only users get universal-only matching even if a stale
-- performer_profiles row still exists from a previous role selection.
-- ---------------------------------------------------------------------------
create or replace function public.gigfit_for_user()
returns table(
  opportunity_id uuid, eligible boolean, tier text, label text, color text,
  matched text[], blockers text[]
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid;
  v_roles text[];
  v_markets text[];
  v_has_performer boolean;
  v_perf public.performer_profiles%rowtype;
  v_use_perf boolean := false;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select work_roles, work_markets
    into v_roles, v_markets
    from public.profiles
   where user_id = v_uid;

  v_roles   := coalesce(v_roles,   '{}'::text[]);
  v_markets := coalesce(v_markets, '{}'::text[]);

  -- Crew-vs-performer gate: only load performer criteria when the user's
  -- selected roles contain at least one is_performer role.
  select exists (
    select 1 from public.work_roles_catalog c
     where c.role_key = any(v_roles)
       and c.is_performer
       and c.is_active
  ) into v_has_performer;

  if v_has_performer then
    select * into v_perf
      from public.performer_profiles
     where user_id = v_uid and is_default
     limit 1;
    v_use_perf := found;
  end if;

  return query select * from public.gigfit_match(
    v_roles,
    v_markets,
    case when v_use_perf then v_perf.gender          else null end,
    case when v_use_perf then v_perf.ethnicity       else null end,
    case when v_use_perf then v_perf.date_of_birth   else null end,
    case when v_use_perf then v_perf.union_status    else null end,
    case when v_use_perf then v_perf.height_inches   else null end,
    case when v_use_perf then v_perf.pay_minimum     else null end,
    case when v_use_perf then v_perf.work_types_wanted else null end,
    case when v_use_perf then v_perf.skills          else null end,
    case when v_use_perf then v_perf.vehicles        else null end
  );
end $$;

revoke execute on function public.gigfit_for_user() from public;
grant  execute on function public.gigfit_for_user() to authenticated;


-- ---------------------------------------------------------------------------
-- gigfit(p_profile_id uuid) — LEGACY wrapper. Preserved for mobile.
-- Reads universal signals from profiles when populated; falls back to the
-- legacy performer_profiles.markets for the market signal when
-- profiles.work_markets is empty (so a Draftbit-native user whose
-- markets have not yet been backfilled/migrated still matches on
-- location). Performer-specific criteria still come from the requested
-- performer_profiles row.
-- ---------------------------------------------------------------------------
create or replace function public.gigfit(p_profile_id uuid)
returns table(
  opportunity_id uuid, eligible boolean, tier text, label text, color text,
  matched text[], blockers text[]
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_perf public.performer_profiles%rowtype;
  v_roles text[];
  v_markets_universal text[];
  v_markets text[];
begin
  select * into v_perf from public.performer_profiles where id = p_profile_id;
  if not found then
    return;
  end if;

  select work_roles, work_markets
    into v_roles, v_markets_universal
    from public.profiles
   where user_id = v_perf.user_id;

  v_roles := coalesce(v_roles, '{}'::text[]);
  -- Prefer universal work_markets; fall back to legacy performer_profiles.markets
  -- while Draftbit continues to write there. Coalesce is removed in a later
  -- phase once the audit shows zero legacy writes for 14+ days.
  v_markets := case
    when v_markets_universal is not null and cardinality(v_markets_universal) > 0 then v_markets_universal
    else coalesce(v_perf.markets, '{}'::text[])
  end;

  return query select * from public.gigfit_match(
    v_roles,
    v_markets,
    v_perf.gender,
    v_perf.ethnicity,
    v_perf.date_of_birth,
    v_perf.union_status,
    v_perf.height_inches,
    v_perf.pay_minimum,
    v_perf.work_types_wanted,
    v_perf.skills,
    v_perf.vehicles
  );
end $$;

-- Grants preserved as they were.
revoke execute on function public.gigfit(uuid) from public;
grant  execute on function public.gigfit(uuid) to authenticated;
