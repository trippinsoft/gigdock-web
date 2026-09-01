-- Complimentary GigDock Pro for every beta tester.
--
-- Pro is `entitlements.product = 'pro'` with status active/trialing
-- (see has_active_entitlement). Existing admin grants are left alone.
-- New auth users get the same complimentary row so testers who join
-- later in beta are not stuck on Free.
--
-- To end the giveaway: drop trigger on_auth_user_created_grant_beta_pro
-- and optionally set those rows' status to 'canceled'.

create or replace function public.grant_beta_pro(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null then
    return;
  end if;
  if exists (
    select 1 from public.entitlements e
    where e.user_id = p_user_id
      and e.product in ('pro', 'premium')
      and e.status in ('active', 'trialing')
      and (e.current_period_end is null or e.current_period_end > now())
  ) then
    return;
  end if;

  insert into public.entitlements (
    user_id, product, provider, status, current_period_end, external_ref, metadata
  ) values (
    p_user_id,
    'pro',
    'beta',
    'active',
    null,
    'beta-comp',
    jsonb_build_object('source', 'beta', 'note', 'Complimentary Pro for beta testers')
  );
end;
$$;

create or replace function public.handle_new_user_grant_beta_pro()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.grant_beta_pro(new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_grant_beta_pro on auth.users;
create trigger on_auth_user_created_grant_beta_pro
  after insert on auth.users
  for each row execute function public.handle_new_user_grant_beta_pro();

-- Backfill every existing account that is not already Pro.
select public.grant_beta_pro(u.id)
from auth.users u;
