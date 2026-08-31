-- OAuth 2.1 authorization server for the GigDock MCP endpoint.
-- Applied to production 2026-08-31 (migration: mcp_oauth).
--
-- GigDock (www.gigdock.co) is the authorization server; the mcp Edge
-- Function is the resource server. Public clients (Claude, ChatGPT) register
-- via Dynamic Client Registration, send the user to /oauth/authorize for
-- consent, and exchange a PKCE-protected code for a gd_ access token stored
-- in mcp_tokens — the SAME table personal tokens use, so the MCP function
-- and Settings revoke list need no changes. Access tokens from OAuth expire
-- (personal tokens don't); refresh tokens rotate on every use.
--
-- Web surface (next app, production main): /.well-known/oauth-authorization-server,
-- /.well-known/oauth-protected-resource[/mcp], /api/oauth/register,
-- /api/oauth/token, /oauth/authorize (consent page).

-- ---- clients -------------------------------------------------------------
create table if not exists public.oauth_clients (
  client_id uuid primary key default gen_random_uuid(),
  client_name text not null,
  redirect_uris text[] not null,
  created_at timestamptz not null default now()
);
alter table public.oauth_clients enable row level security;

-- ---- authorization codes ---------------------------------------------------
create table if not exists public.oauth_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  client_id uuid not null references public.oauth_clients(client_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  redirect_uri text not null,
  code_challenge text not null,
  scope text not null default 'read',
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.oauth_codes enable row level security;

-- ---- extend mcp_tokens for OAuth-issued tokens -----------------------------
alter table public.mcp_tokens
  add column if not exists client_id uuid references public.oauth_clients(client_id) on delete cascade,
  add column if not exists expires_at timestamptz,
  add column if not exists refresh_token_hash text unique;

-- Expired OAuth tokens must stop working (personal tokens have null expiry).
create or replace function public.mcp__auth(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
  v_id uuid;
begin
  if p_token is null or p_token !~ '^gd_' then
    raise exception 'invalid_token' using errcode = '28000';
  end if;
  select t.user_id, t.id into v_user, v_id
  from public.mcp_tokens t
  where t.token_hash = encode(sha256(p_token::bytea), 'hex')
    and t.revoked_at is null
    and (t.expires_at is null or t.expires_at > now());
  if v_user is null then
    raise exception 'invalid_token' using errcode = '28000';
  end if;
  update public.mcp_tokens set last_used_at = now() where mcp_tokens.id = v_id;
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_user, 'role', 'authenticated')::text,
    true
  );
  return v_user;
end;
$$;

-- ---- helpers ---------------------------------------------------------------
create or replace function public.oauth__rand(p_prefix text)
returns text
language sql
volatile
as $$
  select p_prefix || replace(replace(replace(encode(gen_random_bytes(24), 'base64'), '+', ''), '/', ''), '=', '');
$$;

create or replace function public.oauth__b64url_sha256(p text)
returns text
language sql
immutable
as $$
  select replace(replace(rtrim(encode(sha256(p::bytea), 'base64'), '='), '+', '-'), '/', '_');
$$;

-- ---- Dynamic Client Registration (RFC 7591) --------------------------------
create or replace function public.oauth_register_client(
  p_client_name text,
  p_redirect_uris text[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := left(coalesce(nullif(btrim(p_client_name), ''), 'MCP client'), 100);
  v_uri text;
  v_id uuid;
begin
  if p_redirect_uris is null or array_length(p_redirect_uris, 1) is null
     or array_length(p_redirect_uris, 1) > 10 then
    raise exception 'invalid_redirect_uris';
  end if;
  foreach v_uri in array p_redirect_uris loop
    if v_uri !~ '^https://' and v_uri !~ '^http://localhost' and v_uri !~ '^http://127\.0\.0\.1' then
      raise exception 'invalid_redirect_uris';
    end if;
  end loop;
  -- crude abuse guard on an unauthenticated endpoint
  if (select count(*) from public.oauth_clients where created_at > now() - interval '1 hour') > 100 then
    raise exception 'rate_limited';
  end if;
  insert into public.oauth_clients (client_name, redirect_uris)
  values (v_name, p_redirect_uris)
  returning client_id into v_id;
  return jsonb_build_object(
    'client_id', v_id,
    'client_name', v_name,
    'redirect_uris', to_jsonb(p_redirect_uris)
  );
end;
$$;

-- Public client metadata for the consent page (name + uri validation).
create or replace function public.oauth_client_info(p_client_id uuid)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'client_id', c.client_id,
    'client_name', c.client_name,
    'redirect_uris', to_jsonb(c.redirect_uris)
  )
  from public.oauth_clients c
  where c.client_id = p_client_id;
$$;

-- ---- consent approval → authorization code (signed-in user) ---------------
create or replace function public.oauth_issue_code(
  p_client_id uuid,
  p_redirect_uri text,
  p_code_challenge text,
  p_scope text default 'read'
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_code text;
begin
  if v_user is null then
    raise exception 'not_signed_in';
  end if;
  if not exists (
    select 1 from public.oauth_clients c
    where c.client_id = p_client_id and p_redirect_uri = any (c.redirect_uris)
  ) then
    raise exception 'invalid_client_or_redirect';
  end if;
  if p_code_challenge is null or length(p_code_challenge) < 43 or length(p_code_challenge) > 128 then
    raise exception 'invalid_code_challenge';
  end if;
  v_code := public.oauth__rand('gda_');
  insert into public.oauth_codes (code_hash, client_id, user_id, redirect_uri, code_challenge, scope, expires_at)
  values (
    encode(sha256(v_code::bytea), 'hex'),
    p_client_id, v_user, p_redirect_uri, p_code_challenge,
    coalesce(nullif(btrim(p_scope), ''), 'read'),
    now() + interval '10 minutes'
  );
  return v_code;
end;
$$;

-- ---- token endpoint: authorization_code grant (PKCE) -----------------------
create or replace function public.oauth_exchange_code(
  p_code text,
  p_code_verifier text,
  p_client_id uuid,
  p_redirect_uri text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_access text;
  v_refresh text;
  v_name text;
begin
  select * into r
  from public.oauth_codes c
  where c.code_hash = encode(sha256(p_code::bytea), 'hex')
    and c.used_at is null
    and c.expires_at > now();
  if r is null or r.client_id is distinct from p_client_id
     or r.redirect_uri is distinct from p_redirect_uri then
    raise exception 'invalid_grant';
  end if;
  if public.oauth__b64url_sha256(p_code_verifier) is distinct from r.code_challenge then
    raise exception 'invalid_grant';
  end if;
  update public.oauth_codes set used_at = now() where id = r.id;

  select client_name into v_name from public.oauth_clients where client_id = p_client_id;
  v_access := public.oauth__rand('gd_');
  v_refresh := public.oauth__rand('gdr_');
  insert into public.mcp_tokens (user_id, name, token_hash, token_prefix, client_id, expires_at, refresh_token_hash)
  values (
    r.user_id,
    coalesce(v_name, 'MCP client'),
    encode(sha256(v_access::bytea), 'hex'),
    left(v_access, 9),
    p_client_id,
    now() + interval '30 days',
    encode(sha256(v_refresh::bytea), 'hex')
  );
  return jsonb_build_object(
    'access_token', v_access,
    'refresh_token', v_refresh,
    'token_type', 'Bearer',
    'expires_in', 30 * 24 * 3600,
    'scope', r.scope
  );
end;
$$;

-- ---- token endpoint: refresh_token grant (rotating) ------------------------
create or replace function public.oauth_refresh_token(
  p_refresh_token text,
  p_client_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_access text;
  v_refresh text;
begin
  select * into r
  from public.mcp_tokens t
  where t.refresh_token_hash = encode(sha256(p_refresh_token::bytea), 'hex')
    and t.revoked_at is null;
  if r is null or r.client_id is distinct from p_client_id then
    raise exception 'invalid_grant';
  end if;
  v_access := public.oauth__rand('gd_');
  v_refresh := public.oauth__rand('gdr_');
  update public.mcp_tokens
  set token_hash = encode(sha256(v_access::bytea), 'hex'),
      token_prefix = left(v_access, 9),
      refresh_token_hash = encode(sha256(v_refresh::bytea), 'hex'),
      expires_at = now() + interval '30 days',
      last_used_at = now()
  where id = r.id;
  return jsonb_build_object(
    'access_token', v_access,
    'refresh_token', v_refresh,
    'token_type', 'Bearer',
    'expires_in', 30 * 24 * 3600,
    'scope', 'read'
  );
end;
$$;

-- ---- grants ----------------------------------------------------------------
-- register / client_info / exchange / refresh are called by the web route
-- handlers with the anon key; the code/verifier/refresh-token ARE the
-- credentials. issue_code requires a signed-in user (consent).
revoke all on function public.oauth_register_client(text, text[]) from public;
grant execute on function public.oauth_register_client(text, text[]) to anon, authenticated, service_role;
revoke all on function public.oauth_client_info(uuid) from public;
grant execute on function public.oauth_client_info(uuid) to anon, authenticated, service_role;
revoke all on function public.oauth_issue_code(uuid, text, text, text) from public, anon;
grant execute on function public.oauth_issue_code(uuid, text, text, text) to authenticated;
revoke all on function public.oauth_exchange_code(text, text, uuid, text) from public;
grant execute on function public.oauth_exchange_code(text, text, uuid, text) to anon, authenticated, service_role;
revoke all on function public.oauth_refresh_token(text, uuid) from public;
grant execute on function public.oauth_refresh_token(text, uuid) to anon, authenticated, service_role;
revoke all on function public.oauth__rand(text) from public, anon, authenticated;
revoke all on function public.oauth__b64url_sha256(text) from public, anon, authenticated;
