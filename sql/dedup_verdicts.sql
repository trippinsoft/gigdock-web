-- ============================================================================
-- LLM dedup adjudicator — verdict cache.
--
-- The `dedup-adjudicate` edge function blocks active opportunities into
-- candidate pairs (same shoot date + same pay + compatible state) that the
-- deterministic dedup missed, asks Haiku "same gig? which is the original?",
-- and hides the duplicate. Every verdict is cached here so a pair is never
-- judged (or paid for) twice. Run this once in the Supabase SQL editor.
-- ============================================================================

create table if not exists public.dedup_verdicts (
  a_id        uuid not null,          -- ordered so a_id < b_id (stable pair key)
  b_id        uuid not null,
  same        boolean not null,
  original_id uuid,                   -- the kept opportunity when same = true
  confidence  text,                   -- 'high' | 'low'
  reason      text,
  model       text,
  created_at  timestamptz not null default now(),
  primary key (a_id, b_id)
);

alter table public.dedup_verdicts enable row level security;

-- Curators can inspect verdicts; the edge function writes via the service role
-- (which bypasses RLS), so no write policy is needed.
drop policy if exists dedup_verdicts_curator_read on public.dedup_verdicts;
create policy dedup_verdicts_curator_read on public.dedup_verdicts
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_curator));
