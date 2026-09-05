-- Full Pro entitlement summary for the signed-in user.
--
-- has_active_entitlement returns only a bool — enough to gate features but not
-- enough to render Settings → Plan (renewal date, provider, cancel-at-period-end,
-- price, complimentary source). This RPC returns the single row the Plan panel
-- needs, scoped through auth.uid() under SECURITY DEFINER so the entitlements
-- table's RLS stays as-is.
--
-- Result rules mirror has_active_entitlement:
--   • product ∈ ('pro','premium') — legacy 'premium' is the same product.
--   • status  ∈ ('active','trialing','canceled') — 'canceled' is still returned
--     while the paid-through window has not lapsed (cancel-at-period-end state).
--   • current_period_end is null (evergreen comp) OR in the future.
--   • when multiple qualify, the longest-lived one wins (null period first).

create or replace function public.get_active_pro_entitlement()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.entitlements%rowtype;
begin
  select *
    into v_row
    from public.entitlements
    where user_id = auth.uid()
      and product in ('pro', 'premium')
      and status in ('active', 'trialing', 'canceled')
      and (current_period_end is null or current_period_end > now())
    order by (current_period_end is null) desc,
             current_period_end desc
    limit 1;
  if not found then
    return null;
  end if;
  return jsonb_build_object(
    'product',            v_row.product,
    'provider',           v_row.provider,
    'status',             v_row.status,
    'current_period_end', v_row.current_period_end,
    'external_ref',       v_row.external_ref,
    'metadata',           coalesce(v_row.metadata, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.get_active_pro_entitlement() from public;
grant execute on function public.get_active_pro_entitlement() to authenticated;
