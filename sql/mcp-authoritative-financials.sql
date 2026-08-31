-- MCP contract: GigDock owns financial logic; tools return answers, not
-- ingredients. Applied 2026-08-31 (migration: mcp_authoritative_financials).
--
-- ChatGPT (and any other MCP client) previously reconstructed pay from
-- list_gigs: conflicting rate_text vs pay_flat_rate, gig_dates without
-- status, and arithmetic over every listed date. That produced wrong
-- numbers. These wrappers:
--   1. Slim list_gigs to discovery fields (status on every date; no
--      legacy rate text; no raw rate that invites rate × days).
--   2. Add get_gig_financials and get_earnings_by_company, both backed
--      by the same calculators the app uses (calculate_gig_earned_amount
--      / calc_gig_date_gross_earned). Only status 'worked' earns.
--   3. Label earned vs received so the model does not mix them up.

-- ---------------------------------------------------------------------------
-- Helpers (internal; called only from mcp_* after mcp__auth)
-- ---------------------------------------------------------------------------

create or replace function public.mcp__status_label(p_status text)
returns text
language sql
immutable
as $$
  select case p_status
    when 'availability_checked' then 'Availability check'
    when 'booked' then 'Booked'
    when 'worked' then 'Worked'
    when 'paid' then 'Paid'
    else coalesce(p_status, 'Unknown')
  end;
$$;

create or replace function public.mcp__pay_type_label(p_pay_type text)
returns text
language sql
immutable
as $$
  select case p_pay_type
    when 'dayRate' then 'day_rate'
    when 'flatRate' then 'flat_rate'
    when 'hourly' then 'hourly'
    when 'guaranteedMin' then 'guaranteed_minimum'
    else coalesce(nullif(p_pay_type, ''), 'unknown')
  end;
$$;

-- Canonical pay object. Structured fields only — never rate_text.
create or replace function public.mcp__pay_object(
  p_pay_type text,
  p_pay_flat_rate numeric,
  p_pay_hourly_rate numeric,
  p_pay_minimum_amount numeric,
  p_pay_minimum_hours numeric,
  p_pay_currency text,
  p_is_unpaid boolean
)
returns jsonb
language sql
immutable
as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'type', public.mcp__pay_type_label(p_pay_type),
    'amount', case
      when coalesce(p_is_unpaid, false) then 0
      when p_pay_type in ('dayRate', 'flatRate') then p_pay_flat_rate
      when p_pay_type = 'hourly' then p_pay_hourly_rate
      when p_pay_type = 'guaranteedMin' then p_pay_minimum_amount
      else null
    end,
    'hours', case
      when p_pay_type = 'guaranteedMin' then p_pay_minimum_hours
      else null
    end,
    'currency', coalesce(nullif(p_pay_currency, ''), 'USD'),
    'unpaid', coalesce(p_is_unpaid, false)
  ));
$$;

-- Per-date earned, matching calculate_gig_earned_amount:
--   not worked            → 0
--   base_pay_applies=false → bumps only
--   otherwise              → calc_gig_date_gross_earned (includes bumps)
create or replace function public.mcp__date_earned(
  p_status text,
  p_base_pay_applies boolean,
  p_bumps numeric,
  p_pay_type text,
  p_hours_total numeric,
  p_pay_minimum_amount numeric,
  p_pay_minimum_hours numeric,
  p_pay_hourly_rate numeric,
  p_pay_flat_rate numeric,
  p_ot_starts_after_hours numeric,
  p_ot_multiplier numeric
)
returns numeric
language sql
stable
as $$
  select case
    when p_status is distinct from 'worked' then 0
    when not coalesce(p_base_pay_applies, true) then round(coalesce(p_bumps, 0), 2)
    else public.calc_gig_date_gross_earned(
      p_pay_type,
      p_hours_total,
      p_pay_minimum_amount,
      p_pay_minimum_hours,
      p_pay_hourly_rate,
      p_pay_flat_rate,
      p_ot_starts_after_hours,
      p_ot_multiplier,
      coalesce(p_bumps, 0)
    )
  end;
$$;

create or replace function public.mcp__money(p numeric)
returns text
language sql
immutable
as $$
  select '$' || trim(to_char(round(coalesce(p, 0), 2), 'FM999999990.00'));
$$;

-- Plain-language reason the model can quote instead of inventing rate × days.
create or replace function public.mcp__date_reason(
  p_status text,
  p_base_pay_applies boolean,
  p_bumps numeric,
  p_pay_type text,
  p_pay_flat_rate numeric,
  p_pay_hourly_rate numeric,
  p_pay_minimum_amount numeric,
  p_earned numeric
)
returns text
language sql
immutable
as $$
  select case
    when p_status is distinct from 'worked' then
      public.mcp__status_label(p_status) || ' — does not earn.'
    when not coalesce(p_base_pay_applies, true) then
      'Bump-only day — the user turned off base pay for this date. Earned '
      || public.mcp__money(p_earned) || ' in bumps.'
    when p_pay_type = 'dayRate' and coalesce(p_bumps, 0) = 0 then
      'Worked; ' || public.mcp__money(p_pay_flat_rate) || ' day rate. Earned ' || public.mcp__money(p_earned) || '.'
    when p_pay_type = 'dayRate' then
      'Worked; ' || public.mcp__money(p_pay_flat_rate) || ' day rate + '
      || public.mcp__money(p_bumps) || ' bump. Earned ' || public.mcp__money(p_earned) || '.'
    when p_pay_type = 'flatRate' then
      'Worked; flat rate ' || public.mcp__money(p_pay_flat_rate)
      || case when coalesce(p_bumps, 0) <> 0 then ' + ' || public.mcp__money(p_bumps) || ' bump' else '' end
      || '. Earned ' || public.mcp__money(p_earned) || '.'
    when p_pay_type = 'hourly' then
      'Worked; hourly pay'
      || case when coalesce(p_bumps, 0) <> 0 then ' + ' || public.mcp__money(p_bumps) || ' bump' else '' end
      || '. Earned ' || public.mcp__money(p_earned) || '.'
    when p_pay_type = 'guaranteedMin' then
      'Worked; guaranteed minimum ' || public.mcp__money(p_pay_minimum_amount)
      || case when coalesce(p_bumps, 0) <> 0 then ' + ' || public.mcp__money(p_bumps) || ' bump' else '' end
      || '. Earned ' || public.mcp__money(p_earned) || '.'
    else
      'Worked. Earned ' || public.mcp__money(p_earned) || '.'
  end;
$$;

create or replace function public.mcp__assistant_guard(p_gross numeric)
returns text
language sql
immutable
as $$
  select 'Report ' || public.mcp__money(p_gross)
    || ' as the user''s earnings. That number is final. '
    || 'A worked day can be bump-only: the user turned off base pay, so that day earns bumps only. '
    || 'Do not multiply the day rate by every worked day. '
    || 'If they ask why, quote dates[].reason.';
$$;

create or replace function public.mcp__shortcut_warning(
  p_pay_type text,
  p_amount numeric,
  p_worked_days integer,
  p_gross numeric,
  p_bump_only_days integer default 0
)
returns text
language sql
immutable
as $$
  select case
    when coalesce(p_bump_only_days, 0) > 0 then
      p_worked_days::text || ' worked days include ' || p_bump_only_days::text
      || ' bump-only day(s) where the user turned off base pay. '
      || 'Do not multiply every worked day by ' || public.mcp__money(p_amount)
      || '. Report ' || public.mcp__money(p_gross) || '.'
    when p_pay_type in ('dayRate', 'flatRate')
      and coalesce(p_amount, 0) > 0
      and coalesce(p_worked_days, 0) > 0
      and round(p_amount * p_worked_days, 2) is distinct from round(p_gross, 2)
    then p_worked_days::text || ' worked days × ' || public.mcp__money(p_amount)
      || ' would be ' || public.mcp__money(p_amount * p_worked_days)
      || '. That is not how this gig is paid (bumps and/or bump-only days). Report '
      || public.mcp__money(p_gross) || '.'
    else null
  end;
$$;

-- Every date on a gig, with status + server-computed earned. RLS via auth.uid().
create or replace function public.mcp__gig_dates(
  p_gig_id uuid,
  p_start date default null,
  p_end date default null
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(row_json order by (row_json->>'date')), '[]'::jsonb)
  from (
    select jsonb_build_object(
      'date', gd.date,
      'status', coalesce(gd.status_for_day, 'unknown'),
      'status_label', public.mcp__status_label(gd.status_for_day),
      'earns', gd.status_for_day = 'worked',
      'bump_only', gd.status_for_day = 'worked' and not coalesce(gd.base_pay_applies, true),
      'hours', gd.hours_total,
      'base_pay_applies', coalesce(gd.base_pay_applies, true),
      'bumps', round(coalesce(gd.bumps, 0), 2),
      'earned', public.mcp__date_earned(
        gd.status_for_day,
        gd.base_pay_applies,
        gd.bumps,
        g.pay_type::text,
        gd.hours_total,
        g.pay_minimum_amount,
        g.pay_minimum_hours,
        g.pay_hourly_rate,
        g.pay_flat_rate,
        g.ot_starts_after_hours,
        g.ot_multiplier
      ),
      'reason', public.mcp__date_reason(
        gd.status_for_day,
        gd.base_pay_applies,
        gd.bumps,
        g.pay_type::text,
        g.pay_flat_rate,
        g.pay_hourly_rate,
        g.pay_minimum_amount,
        public.mcp__date_earned(
          gd.status_for_day,
          gd.base_pay_applies,
          gd.bumps,
          g.pay_type::text,
          gd.hours_total,
          g.pay_minimum_amount,
          g.pay_minimum_hours,
          g.pay_hourly_rate,
          g.pay_flat_rate,
          g.ot_starts_after_hours,
          g.ot_multiplier
        )
      )
    ) as row_json
    from public.gig_dates gd
    join public.gigs g on g.id = gd.gig_id
    where gd.gig_id = p_gig_id
      and gd.user_id = auth.uid()
      and gd.deleted_at is null
      and (p_start is null or gd.date >= p_start)
      and (p_end is null or gd.date <= p_end)
  ) d;
$$;

-- Discovery-shaped gig (no legacy rate_text, no raw rate × days ingredients).
create or replace function public.mcp__gig_discovery(p_gig public.gigs)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', p_gig.id,
    'title', p_gig.title,
    'company', (select name from public.companies c where c.id = p_gig.gig_company_id),
    'payroll_company', (select name from public.companies c where c.id = p_gig.payroll_company_id),
    'project', (select title from public.projects p where p.id = p_gig.project_id),
    'status', p_gig.status_overall,
    'pay_type', public.mcp__pay_type_label(p_gig.pay_type::text),
    'currency', coalesce(nullif(p_gig.pay_currency, ''), 'USD'),
    'gross_earned', public.calculate_gig_earned_amount(p_gig.id),
    'received', coalesce((
      select sum(gp.gross_pay)
      from public.gig_payments gp
      where gp.gig_id = p_gig.id
        and gp.user_id = auth.uid()
        and gp.deleted_at is null
    ), 0),
    'outstanding', public.calculate_gig_earned_amount(p_gig.id) - coalesce((
      select sum(gp.gross_pay)
      from public.gig_payments gp
      where gp.gig_id = p_gig.id
        and gp.user_id = auth.uid()
        and gp.deleted_at is null
    ), 0),
    'dates', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'date', gd.date,
        'status', coalesce(gd.status_for_day, 'unknown'),
        'status_label', public.mcp__status_label(gd.status_for_day),
        'earns', gd.status_for_day = 'worked',
        'bump_only', gd.status_for_day = 'worked' and not coalesce(gd.base_pay_applies, true)
      ) order by gd.date), '[]'::jsonb)
      from public.gig_dates gd
      where gd.gig_id = p_gig.id
        and gd.user_id = auth.uid()
        and gd.deleted_at is null
    )
  );
$$;

-- ---------------------------------------------------------------------------
-- get_earnings — same calculators, clearer labels
-- ---------------------------------------------------------------------------

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
    'answer', 'The user earned ' || public.mcp__money(e.gross_earned) || ' gross'
      || case
           when p_start is not null or p_end is not null then ' in this window'
           else ' all-time'
         end || '. Report this number. Do not recalculate it.',
    'assistant_instructions', public.mcp__assistant_guard(e.gross_earned),
    'currency', 'USD',
    'start_date', p_start,
    'end_date', p_end,
    'gross_earned', e.gross_earned,
    'received', e.total_paid,
    'outstanding', e.remaining,
    'received_percent', e.received_percent,
    'gig_count', e.gig_count,
    'days_worked', w.days_worked,
    'avg_per_day', w.avg_per_day,
    'avg_per_gig', w.avg_per_gig,
    'definitions', jsonb_build_object(
      'gross_earned', 'What the user earned from worked dates. Booked and availability-check dates earn nothing. This number is authoritative — do not recompute it.',
      'received', 'Cash recorded as received. Can include payments for work done in an earlier period, so received may exceed earned in the same window.',
      'outstanding', 'gross_earned minus received on the gigs in this result.',
      'days_worked', 'Count of dates whose status is worked.'
    )
  ) into v
  from public.load_earnings_summary(p_start, p_end) e
  left join public.load_work_summary(p_start, p_end) w on true;
  return coalesce(v, '{}'::jsonb);
end;
$$;

-- ---------------------------------------------------------------------------
-- list_gigs — discovery only
-- ---------------------------------------------------------------------------

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
  v_search text := nullif(btrim(coalesce(p_search, '')), '');
begin
  perform public.mcp__auth(p_token);
  if p_filter is not null and p_filter not in ('payments_due', 'missing_payment', 'missing_dates') then
    raise exception 'invalid_filter';
  end if;

  select coalesce(jsonb_agg(item order by sort_at desc nulls last), '[]'::jsonb)
  into v
  from (
    select
      public.mcp__gig_discovery(g) as item,
      g.updated_at as sort_at
    from public.gigs g
    left join public.companies gc on gc.id = g.gig_company_id
    left join public.companies pc on pc.id = g.payroll_company_id
    left join public.projects pr on pr.id = g.project_id
    left join lateral (
      select coalesce(sum(gp.gross_pay), 0) as total_paid
      from public.gig_payments gp
      where gp.gig_id = g.id
        and gp.user_id = auth.uid()
        and gp.deleted_at is null
    ) pt on true
    left join lateral (
      select count(*)::int as date_count
      from public.gig_dates gd
      where gd.gig_id = g.id
        and gd.user_id = auth.uid()
        and gd.deleted_at is null
    ) dc on true
    where g.user_id = auth.uid()
      and g.active = true
      and g.deleted_at is null
      and (
        v_search is null
        or g.title ilike '%' || v_search || '%'
        or coalesce(gc.name, '') ilike '%' || v_search || '%'
        or coalesce(pc.name, '') ilike '%' || v_search || '%'
        or coalesce(pr.title, '') ilike '%' || v_search || '%'
      )
      and (
        p_filter is null
        or (
          p_filter = 'payments_due'
          and coalesce(g.is_unpaid, false) = false
          and public.calculate_gig_earned_amount(g.id) > coalesce(pt.total_paid, 0)
        )
        or (
          p_filter = 'missing_payment'
          and coalesce(g.is_unpaid, false) = false
          and (
            g.pay_type is null
            or (g.pay_type::text in ('flatRate', 'dayRate') and coalesce(g.pay_flat_rate, 0) = 0)
            or (g.pay_type::text = 'hourly' and coalesce(g.pay_hourly_rate, 0) = 0)
            or (
              g.pay_type::text = 'guaranteedMin'
              and (coalesce(g.pay_minimum_amount, 0) = 0 or coalesce(g.pay_minimum_hours, 0) = 0)
            )
          )
        )
        or (p_filter = 'missing_dates' and dc.date_count = 0)
      )
  ) listed;

  return jsonb_build_object(
    'gigs', coalesce(v, '[]'::jsonb),
    'note', 'Discovery only. To answer how much someone earned, call get_earnings, get_earnings_by_company, or get_gig_financials and use that tool''s answer field. Never multiply a rate by the number of dates.'
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- get_gig_financials — authoritative one-gig answer
-- ---------------------------------------------------------------------------

create or replace function public.mcp_get_gig_financials(
  p_token text,
  p_gig_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
  g public.gigs;
  v_dates jsonb;
  v_gross numeric;
  v_paid numeric;
  v_date_sum numeric;
  v_issues jsonb := '[]'::jsonb;
begin
  v_user := public.mcp__auth(p_token);
  select * into g
  from public.gigs
  where id = p_gig_id
    and user_id = v_user
    and deleted_at is null;
  if g.id is null then
    return jsonb_build_object(
      'error', 'gig_not_found',
      'message', 'No gig with that id for this user.'
    );
  end if;

  v_dates := public.mcp__gig_dates(g.id);
  v_gross := public.calculate_gig_earned_amount(g.id);
  select coalesce(sum(gp.gross_pay), 0) into v_paid
  from public.gig_payments gp
  where gp.gig_id = g.id
    and gp.user_id = v_user
    and gp.deleted_at is null;

  select coalesce(sum((d->>'earned')::numeric), 0) into v_date_sum
  from jsonb_array_elements(v_dates) d;

  if round(v_date_sum, 2) is distinct from round(v_gross, 2) then
    v_issues := v_issues || jsonb_build_array(
      format('Sum of per-date earned (%s) differs from gig gross_earned (%s). Report gross_earned.', v_date_sum, v_gross)
    );
  end if;

  return jsonb_build_object(
    'answer', 'The user earned ' || public.mcp__money(v_gross) || ' gross on "' || g.title || '"'
      || case when (
        select count(*) from public.gig_dates gd
        where gd.gig_id = g.id and gd.user_id = v_user and gd.deleted_at is null
          and gd.status_for_day = 'worked' and not coalesce(gd.base_pay_applies, true)
      ) > 0 then '. One or more worked days are bump-only (base pay turned off by the user)'
      else '' end
      || '. Report this number.',
    'assistant_instructions', public.mcp__assistant_guard(v_gross),
    'shortcut_is_wrong', public.mcp__shortcut_warning(
      g.pay_type::text,
      g.pay_flat_rate,
      (
        select count(*)::int
        from public.gig_dates gd
        where gd.gig_id = g.id
          and gd.user_id = v_user
          and gd.deleted_at is null
          and gd.status_for_day = 'worked'
      ),
      v_gross,
      (
        select count(*)::int
        from public.gig_dates gd
        where gd.gig_id = g.id
          and gd.user_id = v_user
          and gd.deleted_at is null
          and gd.status_for_day = 'worked'
          and not coalesce(gd.base_pay_applies, true)
      )
    ),
    'id', g.id,
    'title', g.title,
    'company', (select name from public.companies where id = g.gig_company_id),
    'payroll_company', (select name from public.companies where id = g.payroll_company_id),
    'project', (select title from public.projects where id = g.project_id),
    'status', g.status_overall,
    'currency', coalesce(nullif(g.pay_currency, ''), 'USD'),
    'gross_earned', v_gross,
    'received', v_paid,
    'outstanding', round(v_gross - v_paid, 2),
    'worked_days', (
      select count(*)::int
      from public.gig_dates gd
      where gd.gig_id = g.id
        and gd.user_id = v_user
        and gd.deleted_at is null
        and gd.status_for_day = 'worked'
    ),
    'bump_only_days', (
      select count(*)::int
      from public.gig_dates gd
      where gd.gig_id = g.id
        and gd.user_id = v_user
        and gd.deleted_at is null
        and gd.status_for_day = 'worked'
        and not coalesce(gd.base_pay_applies, true)
    ),
    'dates', v_dates,
    'data_quality', case
      when jsonb_array_length(v_issues) > 0 then jsonb_build_object('status', 'warning', 'issues', v_issues)
      else jsonb_build_object('status', 'ok', 'issues', jsonb_build_array())
    end,
    'definitions', jsonb_build_object(
      'answer', 'The sentence to tell the user. Use this dollar amount.',
      'gross_earned', 'Same amount as answer. Do not recompute from a day rate or date count.',
      'dates.reason', 'Why that date earned what it did. Bump-only days are intentional: the user turned off base pay.',
      'bump_only', 'Worked day with base pay turned off. Earns bumps only. Not an error.',
      'shortcut_is_wrong', 'Reminder not to multiply day rate × every worked day when bump-only days exist.'
    )
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- get_earnings_by_company — authoritative company / title match
-- ---------------------------------------------------------------------------

create or replace function public.mcp_get_earnings_by_company(
  p_token text,
  p_company text,
  p_start date default null,
  p_end date default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
  v_q text := nullif(btrim(coalesce(p_company, '')), '');
  v_gigs jsonb;
  v_gross numeric := 0;
  v_paid numeric := 0;
  v_worked int := 0;
begin
  v_user := public.mcp__auth(p_token);
  if v_q is null or char_length(v_q) < 2 then
    return jsonb_build_object(
      'error', 'company_required',
      'message', 'Pass a company name, casting director, or gig title (at least 2 characters).'
    );
  end if;

  with matched as (
    select
      g.id,
      g.title,
      gc.name as company,
      pc.name as payroll_company,
      pr.title as project,
      case
        when gc.name ilike '%' || v_q || '%' then 'company'
        when pc.name ilike '%' || v_q || '%' then 'payroll_company'
        when g.title ilike '%' || v_q || '%' then 'title'
        else 'title'
      end as matched_on,
      dt.dates,
      coalesce((
        select sum((d->>'earned')::numeric)
        from jsonb_array_elements(dt.dates) d
      ), 0) as gross_earned,
      (
        select count(*)::int
        from jsonb_array_elements(dt.dates) d
        where (d->>'earns')::boolean
      ) as worked_days,
      (
        select count(*)::int
        from jsonb_array_elements(dt.dates) d
        where coalesce((d->>'bump_only')::boolean, false)
      ) as bump_only_days,
      (
        select coalesce(sum(gp.gross_pay), 0)
        from public.gig_payments gp
        where gp.gig_id = g.id
          and gp.user_id = v_user
          and gp.deleted_at is null
          and (p_start is null or gp.pay_date >= p_start)
          and (p_end is null or gp.pay_date <= p_end)
      ) as received,
      public.mcp__shortcut_warning(
        g.pay_type::text,
        g.pay_flat_rate,
        (
          select count(*)::int
          from jsonb_array_elements(dt.dates) d
          where (d->>'earns')::boolean
        ),
        coalesce((
          select sum((d->>'earned')::numeric)
          from jsonb_array_elements(dt.dates) d
        ), 0),
        (
          select count(*)::int
          from jsonb_array_elements(dt.dates) d
          where coalesce((d->>'bump_only')::boolean, false)
        )
      ) as shortcut_is_wrong
    from public.gigs g
    left join public.companies gc on gc.id = g.gig_company_id
    left join public.companies pc on pc.id = g.payroll_company_id
    left join public.projects pr on pr.id = g.project_id
    left join lateral (select public.mcp__gig_dates(g.id, p_start, p_end) as dates) dt on true
    where g.user_id = v_user
      and g.active = true
      and g.deleted_at is null
      and (
        coalesce(gc.name, '') ilike '%' || v_q || '%'
        or coalesce(pc.name, '') ilike '%' || v_q || '%'
        or g.title ilike '%' || v_q || '%'
      )
  ),
  in_window as (
    select * from matched m
    where (p_start is null and p_end is null)
       or jsonb_array_length(m.dates) > 0
  )
  select
    coalesce(jsonb_agg(jsonb_build_object(
      'id', iw.id,
      'title', iw.title,
      'company', iw.company,
      'payroll_company', iw.payroll_company,
      'project', iw.project,
      'matched_on', iw.matched_on,
      'gross_earned', iw.gross_earned,
      'received', iw.received,
      'outstanding', round(iw.gross_earned - iw.received, 2),
      'worked_days', iw.worked_days,
      'bump_only_days', iw.bump_only_days,
      'shortcut_is_wrong', iw.shortcut_is_wrong,
      'dates', iw.dates
    ) order by iw.title), '[]'::jsonb),
    coalesce(sum(iw.gross_earned), 0),
    coalesce(sum(iw.received), 0),
    coalesce(sum(iw.worked_days), 0)::int
  into v_gigs, v_gross, v_paid, v_worked
  from in_window iw;

  return jsonb_build_object(
    'answer', case
      when jsonb_array_length(coalesce(v_gigs, '[]'::jsonb)) = 0
        then 'No gigs matched "' || v_q || '".'
      else 'The user earned ' || public.mcp__money(v_gross) || ' gross from "' || v_q || '"'
        || case
             when p_start is not null or p_end is not null then ' in this window'
             else ''
           end
        || case when coalesce((
             select sum(coalesce((g->>'bump_only_days')::int, 0))
             from jsonb_array_elements(coalesce(v_gigs, '[]'::jsonb)) g
           ), 0) > 0
           then '. At least one worked day is bump-only (the user turned off base pay that day)'
           else '' end
        || '. Report this number. Do not recalculate it.'
    end,
    'assistant_instructions', case
      when jsonb_array_length(coalesce(v_gigs, '[]'::jsonb)) = 0 then null
      else public.mcp__assistant_guard(v_gross)
    end,
    'shortcut_is_wrong', (
      select g->>'shortcut_is_wrong'
      from jsonb_array_elements(coalesce(v_gigs, '[]'::jsonb)) g
      where nullif(g->>'shortcut_is_wrong', '') is not null
      limit 1
    ),
    'query', v_q,
    'currency', 'USD',
    'start_date', p_start,
    'end_date', p_end,
    'gross_earned', v_gross,
    'received', v_paid,
    'outstanding', round(v_gross - v_paid, 2),
    'worked_days', v_worked,
    'bump_only_days', coalesce((
      select sum(coalesce((g->>'bump_only_days')::int, 0))
      from jsonb_array_elements(coalesce(v_gigs, '[]'::jsonb)) g
    ), 0),
    'gig_count', jsonb_array_length(coalesce(v_gigs, '[]'::jsonb)),
    'gigs', coalesce(v_gigs, '[]'::jsonb),
    'message', case
      when jsonb_array_length(coalesce(v_gigs, '[]'::jsonb)) = 0
        then 'No gigs matched that company, payroll company, or title.'
      else null
    end,
    'definitions', jsonb_build_object(
      'answer', 'The sentence to tell the user. Use this dollar amount.',
      'gross_earned', 'Same amount as answer. Sum of dates.earned. Do not recompute from rates or date counts.',
      'dates.reason', 'Why that date earned what it did. Bump-only days are intentional: the user turned off base pay.',
      'bump_only', 'Worked day with base pay turned off. Earns bumps only. Not an error.',
      'shortcut_is_wrong', 'Reminder not to multiply day rate × every worked day when bump-only days exist.'
    )
  );
end;
$$;

revoke all on function public.mcp__status_label(text) from public, anon, authenticated;
revoke all on function public.mcp__pay_type_label(text) from public, anon, authenticated;
revoke all on function public.mcp__pay_object(text, numeric, numeric, numeric, numeric, text, boolean) from public, anon, authenticated;
revoke all on function public.mcp__money(numeric) from public, anon, authenticated;
revoke all on function public.mcp__date_reason(text, boolean, numeric, text, numeric, numeric, numeric, numeric) from public, anon, authenticated;
revoke all on function public.mcp__assistant_guard(numeric) from public, anon, authenticated;
drop function if exists public.mcp__shortcut_warning(text, numeric, integer, numeric);
revoke all on function public.mcp__shortcut_warning(text, numeric, integer, numeric, integer) from public, anon, authenticated;
revoke all on function public.mcp__date_earned(text, boolean, numeric, text, numeric, numeric, numeric, numeric, numeric, numeric, numeric) from public, anon, authenticated;
drop function if exists public.mcp__gig_dates(uuid);
revoke all on function public.mcp__gig_dates(uuid, date, date) from public, anon, authenticated;
revoke all on function public.mcp__gig_discovery(public.gigs) from public, anon, authenticated;
revoke all on function public.mcp_get_gig_financials(text, uuid) from public, anon, authenticated;
revoke all on function public.mcp_get_earnings_by_company(text, text, date, date) from public, anon, authenticated;

grant execute on function public.mcp_get_gig_financials(text, uuid) to service_role;
grant execute on function public.mcp_get_earnings_by_company(text, text, date, date) to service_role;
grant execute on function public.mcp_get_earnings(text, date, date) to service_role;
grant execute on function public.mcp_list_gigs(text, text, text) to service_role;
