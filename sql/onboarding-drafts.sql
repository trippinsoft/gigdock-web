-- ============================================================================
-- Server-side pre-account onboarding drafts
--
-- Holds the wizard's captured selections (roles, markets, optional performer
-- bag) between account-submit and /signup/complete. The signup wizard
-- creates a draft on the final "Create account" step, receives an opaque
-- draft_id, and includes ONLY that id in supabase.auth.signUp options.data.
-- After email confirmation (or auto-confirm), /signup/complete claims the
-- draft using the current session's user id + email and persists the real
-- profile data.
--
-- Sensitive data (gender/ethnicity/dob/union/height) is NEVER placed into
-- auth user_metadata — it lives here, and this table's RLS is deny-all so
-- clients cannot read drafts directly. Access is only through the four
-- SECURITY DEFINER RPCs below.
--
-- Ownership binding: the draft carries a deterministic SHA-256 hash of the
-- normalized intended signup email. claim_onboarding_draft() requires the
-- authenticated user's email to hash to the same value before releasing
-- the JSON. Possession of the opaque UUID alone is not sufficient.
--
-- Idempotent. Safe to re-run.
-- ============================================================================


create table if not exists public.onboarding_drafts (
  draft_id            uuid primary key default gen_random_uuid(),
  data                jsonb not null,
  intended_email_hash text not null,                        -- SHA-256 hex of lower(trim(email))
  created_at          timestamptz not null default now(),
  expires_at          timestamptz not null default now() + interval '24 hours',
  claimed_by          uuid references auth.users(id) on delete set null,
  claimed_at          timestamptz
);

create index if not exists onboarding_drafts_unclaimed_expiry_idx
  on public.onboarding_drafts (expires_at)
  where claimed_by is null;

alter table public.onboarding_drafts enable row level security;
-- Deny-all: no INSERT / SELECT / UPDATE / DELETE policies for any role.
-- All access is through the SECURITY DEFINER RPCs below.

revoke all on public.onboarding_drafts from public, anon, authenticated;


-- ---------------------------------------------------------------------------
-- Deterministic email normalization + hash helper.
-- Lowercase + strip surrounding whitespace, then SHA-256 hex.
-- pgcrypto's digest() is resolved via search_path including `extensions`
-- (Supabase's default schema for pgcrypto).
-- ---------------------------------------------------------------------------
create or replace function public.onboarding_drafts_email_hash(p_email text)
returns text
language plpgsql
immutable
set search_path = public, extensions, pg_temp
as $$
begin
  return encode(digest(lower(btrim(coalesce(p_email, ''))), 'sha256'), 'hex');
end $$;


-- ---------------------------------------------------------------------------
-- Payload validation. Keeps drafts small and rejects payloads that reference
-- unknown/inactive role_keys or market codes.
-- ---------------------------------------------------------------------------
create or replace function public.onboarding_drafts_validate(p_data jsonb)
returns void
language plpgsql
stable
set search_path = public, pg_temp
as $$
declare
  v_size int;
  v_roles text[];
  v_markets text[];
  invalid text[];
begin
  if p_data is null or jsonb_typeof(p_data) <> 'object' then
    raise exception 'Draft data must be a JSON object' using errcode = '22023';
  end if;

  v_size := length(p_data::text);
  if v_size > 4096 then
    raise exception 'Draft payload too large (%B > 4KB)', v_size using errcode = '22023';
  end if;

  -- work_roles: array of active catalog role_keys.
  if p_data ? 'work_roles' then
    if jsonb_typeof(p_data->'work_roles') <> 'array' then
      raise exception 'work_roles must be an array' using errcode = '22023';
    end if;
    v_roles := array(
      select jsonb_array_elements_text(p_data->'work_roles')
    );
    select array_agg(k) into invalid
      from unnest(v_roles) as k
     where not exists (
       select 1 from public.work_roles_catalog c
        where c.role_key = k and c.is_active
     );
    if invalid is not null then
      raise exception 'Unknown or inactive work_role keys: %', invalid using errcode = '22023';
    end if;
  end if;

  -- work_markets: array of active market codes.
  if p_data ? 'work_markets' then
    if jsonb_typeof(p_data->'work_markets') <> 'array' then
      raise exception 'work_markets must be an array' using errcode = '22023';
    end if;
    v_markets := array(
      select jsonb_array_elements_text(p_data->'work_markets')
    );
    invalid := null;
    select array_agg(k) into invalid
      from unnest(v_markets) as k
     where not exists (
       select 1 from public.markets c
        where c.code = k and c.active
     );
    if invalid is not null then
      raise exception 'Unknown or inactive market codes: %', invalid using errcode = '22023';
    end if;
  end if;
end $$;


-- ---------------------------------------------------------------------------
-- create_onboarding_draft — anonymous & authenticated callers welcome.
-- Returns the opaque draft_id.
-- ---------------------------------------------------------------------------
create or replace function public.create_onboarding_draft(
  p_data           jsonb,
  p_intended_email text
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id   uuid;
  v_hash text;
begin
  if p_intended_email is null or btrim(p_intended_email) = '' then
    raise exception 'intended email is required' using errcode = '22023';
  end if;

  perform public.onboarding_drafts_validate(p_data);
  v_hash := public.onboarding_drafts_email_hash(p_intended_email);

  insert into public.onboarding_drafts (data, intended_email_hash)
       values (p_data, v_hash)
    returning draft_id into v_id;

  -- Opportunistic cleanup of expired unclaimed drafts.
  delete from public.onboarding_drafts
   where claimed_by is null and expires_at < now();

  return v_id;
end $$;

revoke execute on function public.create_onboarding_draft(jsonb, text) from public;
grant  execute on function public.create_onboarding_draft(jsonb, text) to anon, authenticated;


-- ---------------------------------------------------------------------------
-- update_onboarding_draft — rewrite the payload of an unclaimed draft.
-- Not used by the current wizard (client-only state until account submit)
-- but exposed for future "resume" flows.
-- ---------------------------------------------------------------------------
create or replace function public.update_onboarding_draft(
  p_draft_id uuid,
  p_data     jsonb
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.onboarding_drafts_validate(p_data);

  update public.onboarding_drafts
     set data = p_data
   where draft_id = p_draft_id
     and claimed_by is null
     and expires_at > now();

  if not found then
    raise exception 'Draft not found, already claimed, or expired' using errcode = '22023';
  end if;
end $$;

revoke execute on function public.update_onboarding_draft(uuid, jsonb) from public;
grant  execute on function public.update_onboarding_draft(uuid, jsonb) to anon, authenticated;


-- ---------------------------------------------------------------------------
-- claim_onboarding_draft — authenticated only.
-- Requires:
--   (a) the caller is authenticated,
--   (b) the caller's email hashes to the draft's stored intended_email_hash,
--   (c) the draft is either unclaimed OR previously claimed by the same
--       auth.uid() (allows idempotent retries).
-- Returns the JSON payload.
-- ---------------------------------------------------------------------------
create or replace function public.claim_onboarding_draft(
  p_draft_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid   uuid;
  v_email text;
  v_hash  text;
  d       public.onboarding_drafts%rowtype;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select email into v_email
    from auth.users
   where id = v_uid;
  if v_email is null then
    raise exception 'Authenticated user has no email' using errcode = '42501';
  end if;
  v_hash := public.onboarding_drafts_email_hash(v_email);

  -- Lock the row so a racing claim can't both succeed.
  select * into d
    from public.onboarding_drafts
   where draft_id = p_draft_id
     for update;

  if not found then
    raise exception 'Draft not found' using errcode = '22023';
  end if;

  if d.expires_at < now() then
    raise exception 'Draft expired' using errcode = '22023';
  end if;

  if d.intended_email_hash <> v_hash then
    raise exception 'Draft was created for a different email' using errcode = '42501';
  end if;

  if d.claimed_by is not null and d.claimed_by <> v_uid then
    raise exception 'Draft already claimed by a different account' using errcode = '42501';
  end if;

  if d.claimed_by is null then
    update public.onboarding_drafts
       set claimed_by = v_uid,
           claimed_at = now()
     where draft_id = p_draft_id;
  end if;

  return d.data;
end $$;

revoke execute on function public.claim_onboarding_draft(uuid) from public;
grant  execute on function public.claim_onboarding_draft(uuid) to authenticated;


-- ---------------------------------------------------------------------------
-- purge_expired_onboarding_drafts — housekeeping. Service role only.
-- Callable from a Supabase scheduled task if desired; also called
-- opportunistically inside create_onboarding_draft.
-- ---------------------------------------------------------------------------
create or replace function public.purge_expired_onboarding_drafts()
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count int;
begin
  delete from public.onboarding_drafts
   where claimed_by is null and expires_at < now();
  get diagnostics v_count = row_count;
  return v_count;
end $$;

revoke execute on function public.purge_expired_onboarding_drafts() from public, anon, authenticated;
