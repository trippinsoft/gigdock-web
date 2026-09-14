-- ============================================================================
-- Signup-completion hardening v3
--
-- Fixes two bugs that produced /signup/complete "verify_failed" and silent
-- data loss for mixed-user signups:
--
--   A) sync_legacy_performer_markets_to_universal fired on the AFTER
--      INSERT of a fresh performer_profiles row from persistOnboardingDraft,
--      where new.markets was the column default '{}'. The trigger then
--      overwrote profiles.work_markets — which set_work_markets had just
--      populated — back to '{}'. Fix: on INSERT, only sync when the new
--      row's markets is non-empty. UPDATE behavior is unchanged (an old
--      client legitimately clearing legacy markets still propagates).
--
--   B) set_work_roles / set_work_markets did UPDATE public.profiles ...
--      WHERE user_id = auth.uid() with no ROW_COUNT check. If the profile
--      row was absent for any reason (handle_new_user timing edge case,
--      RLS side-effect, etc.) the UPDATE silently affected 0 rows, the
--      RPC returned void, persistOnboardingDraft treated it as success,
--      and the completion page's verify read then saw work_roles_set_at
--      still NULL → verify_failed. Fix: raise loudly (SQLSTATE P0002) when
--      the UPDATE affects 0 rows so callers get a diagnosable error
--      instead of a silent no-op.
--
-- Both changes are `create or replace` — no schema mutation. Idempotent.
-- ============================================================================


-- (A) Sync trigger: skip INSERT with empty markets.
create or replace function public.sync_legacy_performer_markets_to_universal()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_current text[];
begin
  if new.is_default is not true then return new; end if;

  -- Only fire on real changes.
  if TG_OP = 'UPDATE' and new.markets is not distinct from old.markets then
    return new;
  end if;

  -- FIX: on INSERT, an empty new.markets is the column default — not an
  -- intentional user write. Do NOT propagate '{}' back into universal
  -- profiles.work_markets, which may have just been populated by
  -- set_work_markets earlier in the same signup handoff. This was the
  -- persistOnboardingDraft mixed-user data-loss bug.
  if TG_OP = 'INSERT' and cardinality(coalesce(new.markets, '{}'::text[])) = 0 then
    return new;
  end if;

  if coalesce(current_setting('gigdock.legacy_market_sync_ok', true), 'false') = 'true' then
    return new;
  end if;

  select work_markets into v_current from public.profiles where user_id = new.user_id;
  if v_current is not distinct from coalesce(new.markets, '{}'::text[]) then
    return new;
  end if;

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


-- (B) set_work_roles — raise on 0-row UPDATE.
create or replace function public.set_work_roles(
  p_role_keys    text[],
  p_other_detail text default null
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid          uuid;
  dedup_keys   text[];
  invalid_keys text[];
  other_norm   text;
  v_rows       int;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if p_role_keys is null or array_length(p_role_keys, 1) is null then
    raise exception 'At least one work role is required' using errcode = '22023';
  end if;
  dedup_keys := (select array_agg(k order by k) from (select distinct unnest(p_role_keys) as k) sub);
  select array_agg(k) into invalid_keys
    from unnest(dedup_keys) as k
   where not exists (select 1 from public.work_roles_catalog c where c.role_key = k and c.is_active);
  if invalid_keys is not null then
    raise exception 'Unknown or inactive work_role keys: %', invalid_keys using errcode = '22023';
  end if;
  if 'other' = any(dedup_keys) then
    other_norm := nullif(btrim(coalesce(p_other_detail, '')), '');
    if other_norm is not null and length(other_norm) > 60 then
      other_norm := left(other_norm, 60);
    end if;
  else
    other_norm := null;
  end if;

  perform set_config('gigdock.set_work_roles_ok', 'true', true);
  begin
    update public.profiles
       set work_roles       = dedup_keys,
           work_roles_other = other_norm,
           work_roles_set_at = now()
     where user_id = uid;
    get diagnostics v_rows = row_count;
    perform set_config('gigdock.set_work_roles_ok', 'false', true);
  exception when others then
    perform set_config('gigdock.set_work_roles_ok', 'false', true);
    raise;
  end;

  -- FIX: fail loudly when the profile row is missing for the caller.
  -- Previously this silently affected 0 rows and callers treated it as
  -- success, causing /signup/complete verify to fail after the RPC
  -- returned OK.
  if v_rows = 0 then
    raise exception 'Profile row missing for authenticated user (user_id=%). Cannot set work_roles.', uid
      using errcode = 'P0002';
  end if;
end $$;

revoke execute on function public.set_work_roles(text[], text) from public;
grant  execute on function public.set_work_roles(text[], text) to authenticated;


-- (B) set_work_markets — raise on 0-row UPDATE to profiles. The legacy
-- sync-back to performer_profiles is allowed to match 0 rows (crew-only
-- users have no performer_profiles row and that's intentional).
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
  v_rows        int;
begin
  uid := auth.uid();
  if uid is null then raise exception 'Not authenticated' using errcode = '42501'; end if;
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

  perform set_config('gigdock.set_work_roles_ok', 'true', true);
  begin
    update public.profiles
       set work_markets = dedup_codes, work_markets_set_at = now()
     where user_id = uid;
    get diagnostics v_rows = row_count;
    perform set_config('gigdock.set_work_roles_ok', 'false', true);
  exception when others then
    perform set_config('gigdock.set_work_roles_ok', 'false', true);
    raise;
  end;

  if v_rows = 0 then
    raise exception 'Profile row missing for authenticated user (user_id=%). Cannot set work_markets.', uid
      using errcode = 'P0002';
  end if;

  -- TEMPORARY legacy sync-back to performer_profiles.markets. Matching
  -- 0 rows here is intentional for crew-only users; do NOT raise on
  -- that.
  perform set_config('gigdock.legacy_market_sync_ok', 'true', true);
  begin
    update public.performer_profiles set markets = dedup_codes where user_id = uid and is_default = true;
    perform set_config('gigdock.legacy_market_sync_ok', 'false', true);
  exception when others then
    perform set_config('gigdock.legacy_market_sync_ok', 'false', true);
    raise;
  end;
end $$;

revoke execute on function public.set_work_markets(text[]) from public;
grant  execute on function public.set_work_markets(text[]) to authenticated;
