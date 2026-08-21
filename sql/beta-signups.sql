-- Beta-tester interest list for the GigDock app landing page (/app).
-- Anonymous visitors can INSERT their name/email/platform; nobody can read the
-- list through the anon key (no SELECT policy), so emails stay private and are
-- only visible via the service role / Supabase dashboard.

create table if not exists public.beta_signups (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  platform    text not null check (platform in ('ios', 'android')),
  name        text,          -- optional (kept low-friction)
  city        text,          -- optional city / market
  user_agent  text,
  referrer    text,
  created_at  timestamptz not null default now()
);

-- One row per email is plenty; re-submits harmlessly update nothing.
create unique index if not exists beta_signups_email_key
  on public.beta_signups (lower(email));

alter table public.beta_signups enable row level security;

-- Allow anonymous + authenticated inserts, but no reads/updates/deletes for them.
drop policy if exists "beta_signups_insert" on public.beta_signups;
create policy "beta_signups_insert"
  on public.beta_signups
  for insert
  to anon, authenticated
  with check (true);

-- Pull the list from the SQL editor (service role) when you need testers:
--   select platform, count(*) from beta_signups group by platform;
--   select name, email, created_at from beta_signups
--     where platform = 'android' order by created_at;  -- e.g. your 12 Play testers
