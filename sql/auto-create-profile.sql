-- ============================================================================
-- Auto-create a public.profiles row for every new auth.users insert.
--
-- BACKGROUND
-- Supabase auth lives in `auth.users`. Our application uses a separate
-- `public.profiles` table keyed by `user_id` (uuid, primary key). The mobile
-- app's Register/Login screens explicitly POST to /rest/v1/profiles after
-- signup; the web app's signup only calls supabase.auth.signUp and did NOT
-- create the profiles row, so web signups ended up with an auth account and
-- no profile row. Effect: the auth account works and they can log in, but
-- personalized surfaces that read profiles.display_name (e.g. the Today
-- greeting) show a degraded, generic state.
--
-- This trigger makes profile creation a DB guarantee — whichever app or
-- provider inserts into auth.users, the corresponding profiles row appears.
--
-- Applied to production 2026-08-29 (see conversation notes on the affected
-- users). Idempotent — safe to re-run.
-- ============================================================================

-- 1) The trigger function. SECURITY DEFINER so it can write to public.profiles
--    from the auth schema's trigger context. `on conflict do nothing` makes it
--    a no-op if a row already exists (mobile create path, backfills, etc.).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, email)
  values (new.id, new.email)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

-- 2) The trigger itself. Drop-and-recreate is safe because the function above
--    is idempotent.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3) One-time backfill for any auth users that predate the trigger.
--    Uses NOT EXISTS instead of ON CONFLICT to avoid depending on the primary
--    key column name (belt-and-suspenders — `on conflict (user_id)` also works
--    here since user_id is the PK).
insert into public.profiles (user_id, email)
select u.id, u.email
from auth.users u
where not exists (
  select 1 from public.profiles p where p.user_id = u.id
);
