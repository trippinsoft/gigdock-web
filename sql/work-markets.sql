-- ============================================================================
-- Universal Work Markets on profiles (Phase 1, additive)
--
-- Moves market/location preference from the performer-specific
-- performer_profiles.markets into the universal profiles.work_markets so
-- crew users have a first-class location signal too. Mirrors the existing
-- work_roles pattern:
--
--   work_markets       text[]      — codes from public.markets (validated)
--   work_markets_set_at timestamptz — nullable "answered" marker
--
-- Written only through set_work_markets() — the enforce_work_roles_via_rpc
-- trigger is extended to reject direct writes to these columns from
-- clients, using the existing transaction-local GUC admission pattern.
--
-- Phase 1: additive. Mobile keeps writing performer_profiles.markets
-- (fallback preserved in the legacy gigfit() wrapper — see gigfit-core.sql).
-- Phase 2 (Draftbit ships universal): mobile moves to profiles.work_markets.
-- Phase 3 (audit shows zero legacy writes): remove the coalesce fallback.
-- Phase 4: drop performer_profiles.markets in a coordinated release.
--
-- Idempotent. Safe to re-run.
-- ============================================================================


-- 1) profiles columns =======================================================
alter table public.profiles
  add column if not exists work_markets        text[]      not null default '{}'::text[],
  add column if not exists work_markets_set_at timestamptz;


-- 2) Extend the enforce trigger to guard the new columns ====================
create or replace function public.enforce_work_roles_via_rpc()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  jwt_role text;
  guard    text;
begin
  jwt_role := coalesce(
    current_setting('request.jwt.claims', true)::jsonb->>'role',
    ''
  );
  if jwt_role = 'service_role' then
    return new;
  end if;

  guard := current_setting('gigdock.set_work_roles_ok', true);
  if guard = 'true' then
    return new;
  end if;

  if new.work_roles is distinct from old.work_roles
     or new.work_roles_other is distinct from old.work_roles_other
     or new.work_roles_set_at is distinct from old.work_roles_set_at
     or new.work_markets is distinct from old.work_markets
     or new.work_markets_set_at is distinct from old.work_markets_set_at
  then
    raise exception 'Work-role/market columns can only be modified via set_work_roles() or set_work_markets()';
  end if;

  return new;
end $$;

drop trigger if exists enforce_work_roles_via_rpc_trg on public.profiles;
create trigger enforce_work_roles_via_rpc_trg
  before update on public.profiles
  for each row execute function public.enforce_work_roles_via_rpc();


-- 3) set_work_markets(): sanctioned writer ==================================
-- SECURITY DEFINER + transaction-local GUC to admit the write past the
-- enforce trigger. Validates that every code exists AND is active in
-- public.markets. Requires ≥1 code (Profile UI can reintroduce a
-- clear_work_markets() later if we want to allow clearing; onboarding
-- already enforces ≥1 in the client).
create or replace function public.set_work_markets(
  p_codes text[]
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid          uuid;
  dedup_codes  text[];
  invalid_codes text[];
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  if p_codes is null or array_length(p_codes, 1) is null then
    raise exception 'At least one work market is required' using errcode = '22023';
  end if;

  dedup_codes := (
    select array_agg(k order by k)
      from (select distinct unnest(p_codes) as k) sub
  );

  select array_agg(k)
    into invalid_codes
    from unnest(dedup_codes) as k
   where not exists (
     select 1 from public.markets c
      where c.code = k and c.active
   );
  if invalid_codes is not null then
    raise exception 'Unknown or inactive market codes: %', invalid_codes
      using errcode = '22023';
  end if;

  perform set_config('gigdock.set_work_roles_ok', 'true', true);
  begin
    update public.profiles
       set work_markets        = dedup_codes,
           work_markets_set_at = now()
     where user_id = uid;
    perform set_config('gigdock.set_work_roles_ok', 'false', true);
  exception when others then
    perform set_config('gigdock.set_work_roles_ok', 'false', true);
    raise;
  end;
end $$;

revoke execute on function public.set_work_markets(text[]) from public;
grant  execute on function public.set_work_markets(text[]) to authenticated;


-- 4) Backfill work_markets from the union of performer_profiles.markets =====
-- One-shot idempotent backfill: for each user with any legacy markets and
-- no universal markets yet, take the deduped union across all their
-- performer_profiles rows.
--
-- The GUC admission is set once for the whole UPDATE so the trigger admits
-- every affected row; cleared immediately after.
select set_config('gigdock.set_work_roles_ok', 'true', true);

update public.profiles p
   set work_markets = agg.codes,
       work_markets_set_at = now()
  from (
    select pp.user_id,
           array_agg(distinct m order by m) as codes
      from public.performer_profiles pp,
           unnest(pp.markets) m
     where pp.markets is not null and cardinality(pp.markets) > 0
     group by pp.user_id
  ) agg
 where p.user_id = agg.user_id
   and p.work_markets_set_at is null
   and cardinality(p.work_markets) = 0;

select set_config('gigdock.set_work_roles_ok', 'false', true);
