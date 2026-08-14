-- ============================================================================
-- Markets we serve — a small admin-managed list that drives the GigFit profile
-- "Regions" picker (and anywhere else we want a canonical served-markets list)
-- WITHOUT a website redeploy. Edit it in the admin "Markets" tab; the picker
-- reads it live. Run this once in the Supabase SQL editor.
-- ============================================================================

create table if not exists public.markets (
  code       text primary key,            -- state / province code, e.g. 'GA'
  name       text not null,               -- display name, e.g. 'Georgia'
  active     boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now()
);

alter table public.markets enable row level security;

-- Anyone can read the served-markets list (it powers the public picker).
drop policy if exists markets_read on public.markets;
create policy markets_read on public.markets
  for select to anon, authenticated using (true);

-- Only curators can add / edit / remove markets.
drop policy if exists markets_write on public.markets;
create policy markets_write on public.markets
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_curator))
  with check (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_curator));

-- Seed the common production markets (safe to re-run; won't overwrite edits).
insert into public.markets (code, name, sort_order) values
  ('GA','Georgia',1), ('CA','California',2), ('NY','New York',3), ('NM','New Mexico',4),
  ('IL','Illinois',5), ('LA','Louisiana',6), ('TX','Texas',7), ('NC','North Carolina',8),
  ('NV','Nevada',9), ('FL','Florida',10), ('ON','Ontario',11), ('BC','British Columbia',12)
on conflict (code) do nothing;
