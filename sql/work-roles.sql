-- ============================================================================
-- Work roles: Phase 1 (shared schema + compatibility)
--
-- BACKGROUND
-- GigDock's user model previously assumed every user was a performer. We are
-- separating "what kind of work do you do" (user occupation) from the
-- performer/casting profile so crew users are not forced through casting
-- questions. See docs/architecture (approved recommendation).
--
-- This file introduces:
--   1. profiles work-role columns (work_roles, work_roles_other,
--      work_roles_set_at). No dedicated grandfather-marker column — we use
--      the existing verified public.profiles.created_at against a
--      WORK_ROLES_LAUNCH_DATE constant chosen at Phase 2 launch. This means
--      anyone who signs up between Phase 1a and Phase 2 launch is still
--      treated as an existing/grandfathered user by that later logic.
--   2. work_roles_catalog — the authoritative catalog of allowed role keys,
--      labels, categories, and is_performer flag. THE catalog. Not a mirror.
--   3. A validating RPC set_work_roles(text[], text) that is the only
--      sanctioned writer of the role columns. A BEFORE UPDATE trigger on
--      profiles blocks any other write path so the RPC cannot be bypassed
--      by clients hitting PostgREST directly. The trigger is the sole
--      authoritative enforcement mechanism: per-column REVOKEs against
--      anon/authenticated would be no-ops in this project because both
--      roles hold table-wide UPDATE on public.profiles (audited 2026-09-12
--      via the Supabase MCP), and revoking table-wide UPDATE and re-granting
--      dozens of columns individually would create brittle per-column
--      maintenance on every future profiles change.
--   4. has_performer_role() — a single self-only server-side authority for
--      whether the SIGNED-IN user's work roles include any performer role,
--      derived from work_roles_catalog.is_performer. Self-only: no user_id
--      argument, so one user cannot inspect another user's performer state.
--      Both surfaces call this helper rather than maintaining their own
--      hard-coded performer key lists.
--
-- Idempotent — safe to re-run. Applied to May 22 Backup <date> as rehearsal
-- and to production RolePay <date> after review.
-- ============================================================================


-- 1) work_roles_catalog =====================================================
create table if not exists public.work_roles_catalog (
  role_key      text primary key,
  label         text not null,
  category      text not null check (category in ('performing','crew','other')),
  is_performer  boolean not null,
  sort_order    integer not null,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.work_roles_catalog enable row level security;

-- Public read (needed for the picker on anonymous marketing pages later and
-- for authenticated screens). Writes are restricted to service_role (default
-- Supabase grant); no policy for INSERT/UPDATE/DELETE is defined.
drop policy if exists work_roles_catalog_select_all on public.work_roles_catalog;
create policy work_roles_catalog_select_all
  on public.work_roles_catalog
  for select
  using (true);

-- Seed the catalog. Upsert so re-running preserves DB-managed additions.
insert into public.work_roles_catalog (role_key, label, category, is_performer, sort_order)
values
  ('background_actor',       'Background Actor',         'performing', true,  100),
  ('stand_in_photo_double',  'Stand-In / Photo Double',  'performing', true,  200),
  ('actor',                  'Actor',                    'performing', true,  300),
  ('voice_actor',            'Voice Actor',              'performing', true,  400),
  ('model',                  'Model',                    'performing', true,  500),
  ('production_assistant',   'Production Assistant',     'crew',       false, 1000),
  ('camera',                 'Camera',                   'crew',       false, 1100),
  ('grip_electric',          'Grip & Electric',          'crew',       false, 1200),
  ('sound',                  'Sound',                    'crew',       false, 1300),
  ('hair_makeup',            'Hair & Makeup',            'crew',       false, 1400),
  ('wardrobe',               'Wardrobe',                 'crew',       false, 1500),
  ('art_department',         'Art Department',           'crew',       false, 1600),
  ('locations',              'Locations',                'crew',       false, 1700),
  ('other',                  'Other',                    'other',      false, 9999)
on conflict (role_key) do update
  set label        = excluded.label,
      category     = excluded.category,
      is_performer = excluded.is_performer,
      sort_order   = excluded.sort_order,
      updated_at   = now();


-- 2) profiles columns =======================================================
-- New columns only. No grandfather-marker column: grandfathering uses the
-- existing verified profiles.created_at column against a
-- WORK_ROLES_LAUNCH_DATE constant set at Phase 2 launch (users created
-- before that timestamp are treated as existing users). Intentionally NO
-- GIN index in Phase 1 — add one when a real "find users by role" query
-- surfaces.
alter table public.profiles
  add column if not exists work_roles       text[]      not null default '{}'::text[],
  add column if not exists work_roles_other text,
  add column if not exists work_roles_set_at timestamptz;


-- 3) Enforce set_work_roles as the only writer ==============================
-- BEFORE UPDATE trigger rejects any change to the work-role columns that did
-- not originate inside set_work_roles(). We prove that origin via a
-- transaction-local GUC that only set_work_roles is allowed to set. The
-- service_role bypass keeps admin/backfill scripts working.
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
  then
    raise exception 'Work-role columns can only be modified via set_work_roles()';
  end if;

  return new;
end $$;

drop trigger if exists enforce_work_roles_via_rpc_trg on public.profiles;
create trigger enforce_work_roles_via_rpc_trg
  before update on public.profiles
  for each row execute function public.enforce_work_roles_via_rpc();


-- 4) set_work_roles(): the sanctioned writer ================================
-- SECURITY DEFINER so it bypasses RLS on profiles (we validate the target
-- user ourselves via auth.uid()). Sets the transaction-local guard so the
-- enforce trigger admits the write. `search_path` pinned to `public,
-- pg_temp` (defender against search-path shim attacks); every object is
-- schema-qualified. Validates:
--   - caller is authenticated
--   - at least one role provided
--   - every provided key exists AND is active in work_roles_catalog
--   - deduplicates + orders keys for reproducibility
--   - work_roles_other is only kept when 'other' is selected, otherwise NULL
--   - work_roles_other is capped at 60 characters
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
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  if p_role_keys is null or array_length(p_role_keys, 1) is null then
    raise exception 'At least one work role is required' using errcode = '22023';
  end if;

  -- Deduplicate + stable order
  dedup_keys := (
    select array_agg(k order by k)
      from (select distinct unnest(p_role_keys) as k) sub
  );

  -- Reject anything not in the active catalog
  select array_agg(k)
    into invalid_keys
    from unnest(dedup_keys) as k
   where not exists (
     select 1 from public.work_roles_catalog c
      where c.role_key = k and c.is_active
   );
  if invalid_keys is not null then
    raise exception 'Unknown or inactive work_role keys: %', invalid_keys
      using errcode = '22023';
  end if;

  -- Normalize work_roles_other. Only meaningful when 'other' is in the set.
  if 'other' = any(dedup_keys) then
    other_norm := nullif(btrim(coalesce(p_other_detail, '')), '');
    if other_norm is not null and length(other_norm) > 60 then
      other_norm := left(other_norm, 60);
    end if;
  else
    other_norm := null;
  end if;

  -- Admit this write to the enforce trigger for THIS transaction only.
  perform set_config('gigdock.set_work_roles_ok', 'true', true);

  update public.profiles
     set work_roles       = dedup_keys,
         work_roles_other = other_norm,
         work_roles_set_at = now()
   where user_id = uid;
end $$;

revoke execute on function public.set_work_roles(text[], text) from public;
grant  execute on function public.set_work_roles(text[], text) to authenticated;


-- 5) has_performer_role(): self-only server-side authority ==================
-- No arguments. Derives the caller from auth.uid(). Prevents one user from
-- inspecting another user's performer state. Backed by
-- work_roles_catalog.is_performer — there is no hard-coded list of performer
-- role keys on either surface; both call this helper.
create or replace function public.has_performer_role()
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid;
begin
  uid := auth.uid();
  if uid is null then
    return false;
  end if;
  return exists (
    select 1
      from public.profiles p
      join public.work_roles_catalog c
        on c.role_key = any(p.work_roles)
       and c.is_performer
       and c.is_active
     where p.user_id = uid
  );
end $$;

revoke execute on function public.has_performer_role() from public;
grant  execute on function public.has_performer_role() to authenticated;
