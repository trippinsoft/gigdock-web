-- MCP personal access tokens + read-only tool wrappers.
-- Applied to production 2026-08-31 (migration: mcp_tokens_and_tools).
--
-- A token ("gd_...") identifies one GigDock user to the `mcp` Edge Function
-- (supabase/functions/mcp). Only the sha256 hash is stored. The mcp_* tool
-- functions validate the token, impersonate that user via request.jwt.claims,
-- and call the SAME RPCs the apps use (load_earnings_summary etc.), so
-- numbers can never diverge between the app and an AI assistant.
--
-- Grants: mcp_create_token / mcp_revoke_token are for signed-in users (the
-- Settings UI). The token-authenticated tools are service_role-only — the
-- Edge Function is the sole caller; the token inside the argument is the
-- real credential.

create extension if not exists pgcrypto;

create table if not exists public.mcp_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Assistant',
  token_hash text not null unique,
  token_prefix text not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create index if not exists mcp_tokens_user_idx on public.mcp_tokens (user_id);

alter table public.mcp_tokens enable row level security;

drop policy if exists "mcp_tokens_select_own" on public.mcp_tokens;
create policy "mcp_tokens_select_own"
  on public.mcp_tokens for select
  using (user_id = auth.uid());

-- Mint a token for the signed-in user. Plaintext is returned ONCE.
create or replace function public.mcp_create_token(p_name text default 'Assistant')
returns table (id uuid, token text, token_prefix text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_token text;
  v_prefix text;
  v_id uuid;
begin
  if v_user is null then
    raise exception 'not_signed_in';
  end if;
  v_token := 'gd_' || replace(replace(encode(gen_random_bytes(24), 'base64'), '+', ''), '/', '');
  v_token := replace(v_token, '=', '');
  v_prefix := left(v_token, 9);
  insert into public.mcp_tokens (user_id, name, token_hash, token_prefix)
  values (v_user, coalesce(nullif(btrim(p_name), ''), 'Assistant'), encode(sha256(v_token::bytea), 'hex'), v_prefix)
  returning mcp_tokens.id into v_id;
  return query select v_id, v_token, v_prefix;
end;
$$;

create or replace function public.mcp_revoke_token(p_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.mcp_tokens
  set revoked_at = now()
  where id = p_id and user_id = auth.uid() and revoked_at is null;
$$;

revoke all on function public.mcp_create_token(text) from public, anon;
grant execute on function public.mcp_create_token(text) to authenticated;
revoke all on function public.mcp_revoke_token(uuid) from public, anon;
grant execute on function public.mcp_revoke_token(uuid) to authenticated;

-- Validate a token and impersonate its user for the rest of the transaction.
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
    and t.revoked_at is null;
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

-- Tool: earnings + work summary for an optional date window.
create or replace function public.mcp_get_earnings(
  p_token text,
  p_start date default null,
  p_end date default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v jsonb;
begin
  perform public.mcp__auth(p_token);
  select jsonb_build_object(
    'start_date', p_start,
    'end_date', p_end,
    'gross_earned', e.gross_earned,
    'received', e.total_paid,
    'outstanding', e.remaining,
    'received_percent', e.received_percent,
    'gig_count', e.gig_count,
    'days_worked', w.days_worked,
    'avg_per_day', w.avg_per_day,
    'avg_per_gig', w.avg_per_gig
  ) into v
  from public.load_earnings_summary(p_start, p_end) e
  left join public.load_work_summary(p_start, p_end) w on true;
  return coalesce(v, '{}'::jsonb);
end;
$$;

-- Tool: the user's gigs (optionally a needs-attention bucket or search).
create or replace function public.mcp_list_gigs(
  p_token text,
  p_filter text default null,
  p_search text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v jsonb;
begin
  perform public.mcp__auth(p_token);
  if p_filter is not null and p_filter not in ('payments_due', 'missing_payment', 'missing_dates') then
    raise exception 'invalid_filter';
  end if;
  select public.load_filtered_gigs(p_filter, p_search, 'recent') into v;
  return coalesce(v, '[]'::jsonb);
end;
$$;

-- Tool: outstanding. Live definition (date window + itemized remaining) is in
-- sql/mcp-authoritative-financials.sql. Do not recreate the all-time-only
-- load_needs_attention wrapper — ChatGPT used that for "year" questions and
-- disagreed with Insights.

-- Only the Edge Function (service role) may execute the token-authenticated tools.
revoke all on function public.mcp__auth(text) from public, anon, authenticated;
revoke all on function public.mcp_get_earnings(text, date, date) from public, anon, authenticated;
revoke all on function public.mcp_list_gigs(text, text, text) from public, anon, authenticated;
grant execute on function public.mcp__auth(text) to service_role;
grant execute on function public.mcp_get_earnings(text, date, date) to service_role;
grant execute on function public.mcp_list_gigs(text, text, text) to service_role;
