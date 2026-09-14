-- ============================================================================
-- Convergence v2: GigFit tier rule + Work Markets legacy sync
--
-- Two coupled changes, each guarded and idempotent:
--
--   A) Amend `gigfit_match` so `good` requires ≥1 matched signal OTHER than
--      `location`. Location-only matches now produce `open`, which the UI
--      renders as "no rating." (Strong / Good / Poor remain user-visible
--      tiers; open + ineligible are internal-only.)
--
--   B) Two-way Work Markets synchronization for the transitional period
--      while released mobile builds still read/write `performer_profiles.markets`:
--
--        - set_work_markets() now ALSO writes to the default
--          performer_profiles.markets row (if any) so old mobile builds
--          reading the legacy field see the up-to-date value.
--
--        - A new AFTER UPDATE OR INSERT trigger on performer_profiles.markets
--          synchronizes legacy writes INTO profiles.work_markets, so a
--          write from an old released mobile build is not silently ignored
--          by the existing coalesce fallback (which returned the older
--          universal value when both were non-empty).
--
--      Both directions guard against recursion via a transaction-local
--      GUC (`gigdock.legacy_market_sync_ok`). The compatibility layer is
--      TEMPORARY and marked TODO: remove once released mobile builds
--      have shipped the universal wiring and 14 consecutive days of zero
--      writes to performer_profiles.markets have been observed.
--
-- Nothing here is a schema change — safe to re-run.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- A) gigfit_match — replace with the amended tier rule.
-- Signature unchanged; only the tier computation changes.
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
  opportunity_id uuid, eligible boolean, tier text, label text, color text,
  matched text[], blockers text[]
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
  has_nonlocation_signal boolean;
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

    if o.match_state is not null and array_length(p_work_markets, 1) is not null then
      if o.match_state = any(p_work_markets) then
        m := array_append(m, 'location');
      else
        b_soft := array_append(b_soft, 'Outside your markets (' || o.match_state || ')');
      end if;
    end if;

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
      end if;
    end if;

    if p_gender is not null
       and jsonb_typeof(c->'gender') = 'array'
       and jsonb_array_length(c->'gender') > 0 then
      select array_agg(cg) into g_wanted
        from (select public.canon_gender(x) as cg from jsonb_array_elements_text(c->'gender') as x) s
       where cg <> '';
      if g_wanted is null then null;
      elsif public.canon_gender(p_gender) = any(g_wanted) then
        m := array_append(m, 'gender');
      else
        b_hard := array_append(b_hard, 'Gender doesn''t match');
      end if;
    end if;

    if p_ethnicity is not null
       and array_length(p_ethnicity, 1) is not null
       and jsonb_typeof(c->'ethnicity') = 'array'
       and jsonb_array_length(c->'ethnicity') > 0 then
      select array_agg(ce) into e_wanted
        from (select public.canon_ethnicity(x) as ce from jsonb_array_elements_text(c->'ethnicity') as x) s
       where ce <> '';
      if e_wanted is null then null;
      elsif exists (select 1 from unnest(p_ethnicity) pe where public.canon_ethnicity(pe) = any(e_wanted)) then
        m := array_append(m, 'ethnicity');
      else
        b_hard := array_append(b_hard, 'Ethnicity doesn''t match');
      end if;
    end if;

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
      if v_hdist <= 1 then m := array_append(m, 'height');
      elsif v_hdist <= 3 then b_soft := array_append(b_soft, 'Height ' || v_hlabel || ' vs ' || v_hrng);
      else b_hard := array_append(b_hard, 'Height ' || v_hlabel || ' outside ' || v_hrng);
      end if;
    end if;

    cu := public.canon_union(c->>'union_status');
    if cu <> '' and cu <> 'either' and pu <> '' and pu <> 'either' then
      if pu = cu then m := array_append(m, 'union');
      else b_soft := array_append(b_soft, 'Union (' || cu || ') differs from yours');
      end if;
    end if;

    if p_pay_minimum is not null and o.pay_min is not null and o.pay_min < p_pay_minimum then
      b_soft := array_append(b_soft, 'Pay ($' || o.pay_min || ') below your $' || p_pay_minimum || ' minimum');
    end if;

    if array_length(b_hard, 1) is not null then
      opportunity_id := o.id; eligible := false; tier := 'ineligible';
      label := 'Not eligible'; color := 'amber';
      matched := m; blockers := b_hard || b_soft;
      return next; continue;
    end if;

    if array_length(b_soft, 1) is not null then
      opportunity_id := o.id; eligible := true; tier := 'poor';
      label := 'Poor match'; color := 'zinc';
      matched := m; blockers := b_soft;
      return next; continue;
    end if;

    if p_work_types_wanted is not null and o_work_type is not null
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

    -- Tier by specificity. AMENDED: `good` now requires ≥1 matched signal
    -- OTHER than `location` — location alone is insufficient for Good.
    has_special := ('skill' = any(m)) or ('vehicle' = any(m));
    has_nonlocation_signal :=
      exists (select 1 from unnest(m) s where s <> 'location');
    if has_special or coalesce(array_length(m, 1), 0) >= 3 then
      tier := 'strong'; label := 'Strong match'; color := 'green';
    elsif has_nonlocation_signal then
      tier := 'good';   label := 'Good match';   color := 'blue';
    else
      tier := 'open';   label := 'Open call';    color := 'zinc';
    end if;

    opportunity_id := o.id; eligible := true; matched := m; blockers := '{}';
    return next;
  end loop;
end $$;

revoke execute on function public.gigfit_match(text[],text[],text,text[],date,text,int,numeric,text[],text[],text[]) from public;
grant  execute on function public.gigfit_match(text[],text[],text,text[],date,text,int,numeric,text[],text[],text[]) to anon, authenticated;


-- ---------------------------------------------------------------------------
-- B) Legacy Work Markets synchronization (TEMPORARY compatibility).
--
-- The universal source of truth is public.profiles.work_markets. Some
-- released mobile builds still read/write public.performer_profiles.markets
-- as their markets store. Until those builds have been fully replaced by the
-- upcoming Draftbit release that adopts the universal column, we keep the
-- two fields in sync in both directions.
--
-- TODO(remove-legacy-markets): drop this sync AND the coalesce fallback in
-- public.gigfit(uuid) once 14 consecutive days of Supabase logs show zero
-- writes to public.performer_profiles.markets from any client.
-- ---------------------------------------------------------------------------

-- Trigger: legacy → universal. Fires on writes to performer_profiles.markets
-- and mirrors the new value into the owner's profiles.work_markets row.
-- Recursion guard: skips itself when the transaction-local GUC
-- `gigdock.legacy_market_sync_ok` is 'true' — that GUC is set by
-- set_work_markets() when IT is doing the paired write into legacy.
create or replace function public.sync_legacy_performer_markets_to_universal()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_current text[];
begin
  -- Only mirror the default performer_profile's markets. Non-default rows
  -- are historical/secondary and don't participate in the universal view.
  if new.is_default is not true then
    return new;
  end if;

  -- No-op writes (same markets) don't need to fire.
  if TG_OP = 'UPDATE' and new.markets is not distinct from old.markets then
    return new;
  end if;

  -- Recursion guard.
  if coalesce(current_setting('gigdock.legacy_market_sync_ok', true), 'false') = 'true' then
    return new;
  end if;

  -- Read the current universal value to avoid unnecessary writes.
  select work_markets into v_current
    from public.profiles
   where user_id = new.user_id;

  if v_current is not distinct from coalesce(new.markets, '{}'::text[]) then
    return new;
  end if;

  -- Admit past the enforce trigger + set the recursion guard so any nested
  -- trigger this UPDATE causes stays a no-op. Cleared unconditionally after.
  perform set_config('gigdock.set_work_roles_ok',     'true', true);
  perform set_config('gigdock.legacy_market_sync_ok', 'true', true);
  begin
    update public.profiles
       set work_markets        = coalesce(new.markets, '{}'::text[]),
           work_markets_set_at = coalesce(work_markets_set_at, now())
     where user_id = new.user_id;
    perform set_config('gigdock.set_work_roles_ok',     'false', true);
    perform set_config('gigdock.legacy_market_sync_ok', 'false', true);
  exception when others then
    perform set_config('gigdock.set_work_roles_ok',     'false', true);
    perform set_config('gigdock.legacy_market_sync_ok', 'false', true);
    raise;
  end;

  return new;
end $$;

drop trigger if exists sync_legacy_performer_markets_to_universal_trg on public.performer_profiles;
create trigger sync_legacy_performer_markets_to_universal_trg
  after insert or update of markets on public.performer_profiles
  for each row execute function public.sync_legacy_performer_markets_to_universal();


-- Universal → legacy. Redefine set_work_markets() so it ALSO writes the
-- new value into the caller's default performer_profiles.markets row (if
-- any exists — crew-only users with no performer_profiles are simply
-- unaffected). Uses the same recursion guard.
create or replace function public.set_work_markets(p_codes text[])
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid           uuid;
  dedup_codes   text[];
  invalid_codes text[];
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if p_codes is null or array_length(p_codes, 1) is null then
    raise exception 'At least one work market is required' using errcode = '22023';
  end if;

  dedup_codes := (select array_agg(k order by k) from (select distinct unnest(p_codes) as k) sub);

  select array_agg(k) into invalid_codes
    from unnest(dedup_codes) as k
   where not exists (select 1 from public.markets c where c.code = k and c.active);
  if invalid_codes is not null then
    raise exception 'Unknown or inactive market codes: %', invalid_codes using errcode = '22023';
  end if;

  -- Universal write.
  perform set_config('gigdock.set_work_roles_ok', 'true', true);
  begin
    update public.profiles
       set work_markets = dedup_codes, work_markets_set_at = now()
     where user_id = uid;
    perform set_config('gigdock.set_work_roles_ok', 'false', true);
  exception when others then
    perform set_config('gigdock.set_work_roles_ok', 'false', true);
    raise;
  end;

  -- TEMPORARY: legacy sync-back. Also update the caller's default
  -- performer_profiles.markets so a released mobile build reading the
  -- legacy column sees the up-to-date value. Recursion guard prevents
  -- the AFTER trigger above from bouncing back.
  perform set_config('gigdock.legacy_market_sync_ok', 'true', true);
  begin
    update public.performer_profiles
       set markets = dedup_codes
     where user_id = uid and is_default = true;
    perform set_config('gigdock.legacy_market_sync_ok', 'false', true);
  exception when others then
    perform set_config('gigdock.legacy_market_sync_ok', 'false', true);
    raise;
  end;
end $$;

revoke execute on function public.set_work_markets(text[]) from public;
grant  execute on function public.set_work_markets(text[]) to authenticated;
