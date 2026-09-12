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
--      work_roles_set_at, work_roles_grandfathered_at)
--   2. work_roles_catalog — the authoritative catalog of allowed role keys,
--      labels, categories, and is_performer flag. THE catalog. Not a mirror.
--   3. A validating RPC set_work_roles() that is the only sanctioned writer
--      of the role columns. A BEFORE UPDATE trigger blocks any other write
--      path so the RPC cannot be bypassed by clients hitting PostgREST
--      directly.
--   4. has_performer_role(user_id) — a single server-side authority for
--      whether a user's current work roles include any performer role,
--      derived from work_roles_catalog.is_performer. Both surfaces call this
--      helper rather than maintaining their own hard-coded performer key
--      lists.
--   5. A grandfather marker (work_roles_grandfathered_at) set to now() for
--      every profile that exists at migration time. We do NOT use
--      profiles.created_at for grandfathering because it is not read anywhere
--      in shipping code today and is not a reliable "when did this account
--      exist" signal for the trigger-created rows in production.
--
-- Idempotent — safe to re-run. Applied to production <date TBD>.
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

-- Public read (needed for the picker on the anonymous marketing pages later
-- and for authenticated screens). Writes are restricted to service_role
-- (default Supabase grant); no policy for INSERT/UPDATE/DELETE is defined.
drop policy if exists work_roles_catalog_select_all on public.work_roles_catalog;
create policy work_roles_catalog_select_all
  on public.work_roles_catalog
  for select
  using (true);

-- Seed the catalog. Uses upsert so re-running preserves DB-managed additions.
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
alter table public.profiles
  add column if not exists work_roles                 text[]      not null default '{}'::text[],
  add column if not exists work_roles_other           text,
  add column if not exists work_roles_set_at          timestamptz,
  add column if not exists work_roles_grandfathered_at timestamptz;

-- One-time grandfather marker: every row present at migration time is
-- flagged. New rows created after this migration have NULL, distinguishing
-- them from grandfathered users in later middleware logic.
update public.profiles
   set work_roles_grandfathered_at = now()
 where work_roles_grandfathered_at is null
   and work_roles_set_at is null;

-- Intentionally NO GIN index in Phase 1. Add one when a real
-- "find users by role" query surfaces.


-- 3) Enforce set_work_roles as the only writer ==============================
-- BEFORE UPDATE trigger rejects any change to the work-role columns that did
-- not originate inside set_work_roles(). We prove that origin via a
-- transaction-local GUC that only set_work_roles is allowed to set. The
-- server_role bypass keeps admin/backfill scripts working.
create or replace function public.enforce_work_roles_via_rpc()
returns trigger
language plpgsql
security invoker
set search_path = public
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
     or new.work_roles_grandfathered_at is distinct from old.work_roles_grandfathered_at
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
-- enforce trigger admits the write. Validates:
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
set search_path = public
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


-- 5) has_performer_role(): single server-side authority =====================
-- Derived from work_roles_catalog.is_performer. There is no hard-coded list
-- of performer role keys on either surface — both call this helper so adding
-- a new performer role in the catalog automatically propagates.
create or replace function public.has_performer_role(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.profiles p
      join public.work_roles_catalog c
        on c.role_key = any(p.work_roles)
       and c.is_performer
       and c.is_active
     where p.user_id = p_user_id
  );
$$;

revoke execute on function public.has_performer_role(uuid) from public;
grant  execute on function public.has_performer_role(uuid) to authenticated;
