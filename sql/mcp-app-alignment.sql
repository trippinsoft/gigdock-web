-- Keep MCP, Insights, Today, and Payments on one pay path.
-- Applied 2026-08-31 (migration: mcp_app_alignment).
--
-- Rule: each money question uses the same RPC the matching screen uses.
--   Insights / Reports / "this year" / "this month"
--     → load_insights_overview  (period worked dates; bump-only honored)
--   Today "earned this month"
--     → load_month_earned_summary, which is Insights gross_earned
--   Payments / gig remaining / all-time outstanding
--     → calculate_gig_earned_amount − paid
--   MCP is a thin wrapper. It must not have a third formula.
--
-- Inclusive MCP dates (start_date / end_date) convert to Insights'
-- exclusive end by adding one day. Calendar year 2026 = 2026-01-01
-- through 2026-12-31, same as Insights Year 2026.

-- Inclusive MCP window → Insights [start, end_exclusive).
create or replace function public.mcp__window_exclusive(p_start date, p_end date)
returns table (start_date date, end_exclusive date, bucket text)
language sql
stable
as $$
  select
    coalesce(p_start, date '1900-01-01'),
    coalesce(p_end, current_date) + 1,
    case
      when (coalesce(p_end, current_date) + 1 - coalesce(p_start, date '1900-01-01')) > 45
        then 'year'
      else 'month'
    end;
$$;

-- Today "earned this month" — same number as Insights for that window.
-- Callers already pass an exclusive end (first of next month / next year).
create or replace function public.load_month_earned_summary(
  p_start_date date,
  p_end_date date
)
returns numeric
language sql
security definer
set search_path to 'public'
as $$
  select coalesce(
    (public.load_insights_overview(p_start_date, p_end_date, 'month')->>'gross_earned')::numeric,
    0
  );
$$;

-- get_earnings: no dates = Today all-time (load_earnings_summary).
-- With dates = Insights for that inclusive window.
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
  v_window boolean := p_start is not null or p_end is not null;
  v_start date;
  v_end_exclusive date;
  v_bucket text;
  v_insights jsonb;
  v_gross numeric;
  v_received numeric;
  v_outstanding numeric;
  v_days int;
  v_gigs int;
  v_avg numeric;
  v_scope text;
  v_year int;
  e record;
  v_work record;
begin
  perform public.mcp__auth(p_token);

  if v_window then
    select win.start_date, win.end_exclusive, win.bucket
      into v_start, v_end_exclusive, v_bucket
    from public.mcp__window_exclusive(p_start, p_end) win;
    v_insights := public.load_insights_overview(v_start, v_end_exclusive, v_bucket);
    v_gross := coalesce((v_insights->>'gross_earned')::numeric, 0);
    v_received := coalesce((v_insights->>'received')::numeric, 0);
    v_outstanding := coalesce((v_insights->>'outstanding')::numeric, 0);
    v_days := coalesce((v_insights->>'days_worked')::int, 0);
    v_gigs := coalesce((v_insights->>'gigs_worked')::int, 0);
    v_avg := coalesce((v_insights->>'average_per_work_day')::numeric, 0);
    if p_start is not null
      and p_end is not null
      and p_start = date_trunc('year', p_start)::date
      and p_end = (date_trunc('year', p_start) + interval '1 year' - interval '1 day')::date
    then
      v_year := extract(year from p_start)::int;
      v_scope := 'calendar year ' || v_year::text;
    else
      v_scope := coalesce(p_start::text, 'the beginning') || ' through ' || coalesce(p_end::text, 'today');
    end if;

    return jsonb_build_object(
      'answer', 'The user earned ' || public.mcp__money(v_gross) || ' gross (' || v_scope || '). Report this number. Do not recalculate it.',
      'assistant_instructions', public.mcp__assistant_guard(v_gross)
        || ' This matches Insights for the same dates.',
      'matches_screen', 'insights',
      'currency', 'USD',
      'start_date', p_start,
      'end_date', p_end,
      'gross_earned', v_gross,
      'received', v_received,
      'outstanding', v_outstanding,
      'gig_count', v_gigs,
      'days_worked', v_days,
      'avg_per_day', v_avg,
      'definitions', jsonb_build_object(
        'gross_earned', 'Insights gross for this window. Worked dates only. Bump-only days earn bumps only. Do not recompute.',
        'received', 'Payments recorded in this window. Can include pay for earlier work.',
        'outstanding', 'Period earned minus all-time received on those gigs. Same as Insights Outstanding.',
        'matches_screen', 'insights = Insights Year/Month for these dates.'
      )
    );
  end if;

  select * into e from public.load_earnings_summary(null, null);
  select * into v_work from public.load_work_summary(null, null);
  return jsonb_build_object(
    'answer', 'The user earned ' || public.mcp__money(e.gross_earned) || ' gross all-time. Report this number. Do not recalculate it.',
    'assistant_instructions', public.mcp__assistant_guard(e.gross_earned)
      || ' This is all-time, matching the Today screen totals — not Insights for a year.',
    'matches_screen', 'today_all_time',
    'currency', 'USD',
    'start_date', null,
    'end_date', null,
    'gross_earned', e.gross_earned,
    'received', e.total_paid,
    'outstanding', e.remaining,
    'received_percent', e.received_percent,
    'gig_count', e.gig_count,
    'days_worked', v_work.days_worked,
    'avg_per_day', v_work.avg_per_day,
    'avg_per_gig', v_work.avg_per_gig,
    'definitions', jsonb_build_object(
      'gross_earned', 'All-time earned from worked dates. Same as Today.',
      'outstanding', 'All-time earned minus all-time received.',
      'matches_screen', 'today_all_time = Today header, not Insights Year.'
    )
  );
end;
$$;

-- get_outstanding uses the same inclusive → exclusive conversion.
create or replace function public.mcp_get_outstanding(
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
  v_user uuid;
  v_start date;
  v_end_exclusive date;
  v_bucket text;
  v_insights jsonb;
  v_items jsonb := '[]'::jsonb;
  v_total numeric := 0;
  v_count int := 0;
  v_window boolean := p_start is not null or p_end is not null;
  v_scope text;
  v_attention record;
  v_year int;
begin
  v_user := public.mcp__auth(p_token);
  select * into v_attention from public.load_needs_attention();

  if v_window then
    select win.start_date, win.end_exclusive, win.bucket
      into v_start, v_end_exclusive, v_bucket
    from public.mcp__window_exclusive(p_start, p_end) win;
    v_insights := public.load_insights_overview(v_start, v_end_exclusive, v_bucket);
    v_items := coalesce(v_insights->'outstanding_items', '[]'::jsonb);
    v_total := coalesce((v_insights->>'outstanding')::numeric, 0);
    v_count := coalesce((v_insights->>'outstanding_gigs')::int, 0);
    if p_start is not null
      and p_end is not null
      and p_start = date_trunc('year', p_start)::date
      and p_end = (date_trunc('year', p_start) + interval '1 year' - interval '1 day')::date
    then
      v_year := extract(year from p_start)::int;
      v_scope := 'calendar year ' || v_year::text;
    else
      v_scope := coalesce(p_start::text, 'the beginning') || ' through ' || coalesce(p_end::text, 'today');
    end if;
  else
    select coalesce(jsonb_agg(item order by (item->>'outstanding')::numeric desc), '[]'::jsonb),
           coalesce(sum((item->>'outstanding')::numeric), 0),
           count(*)::int
    into v_items, v_total, v_count
    from (
      select jsonb_build_object(
        'gig_id', g.id,
        'title', g.title,
        'worked_date', (
          select min(gd.date)
          from public.gig_dates gd
          where gd.gig_id = g.id
            and gd.user_id = v_user
            and gd.deleted_at is null
            and gd.status_for_day = 'worked'
        ),
        'earned', public.calculate_gig_earned_amount(g.id),
        'received', coalesce(pt.total_paid, 0),
        'outstanding', round(public.calculate_gig_earned_amount(g.id) - coalesce(pt.total_paid, 0), 2)
      ) as item
      from public.gigs g
      left join lateral (
        select coalesce(sum(gp.gross_pay), 0) as total_paid
        from public.gig_payments gp
        where gp.gig_id = g.id
          and gp.user_id = v_user
          and gp.deleted_at is null
      ) pt on true
      where g.user_id = v_user
        and g.active = true
        and g.deleted_at is null
        and coalesce(g.is_unpaid, false) = false
        and public.calculate_gig_earned_amount(g.id) > coalesce(pt.total_paid, 0)
    ) due;
    v_scope := 'all-time';
  end if;

  return jsonb_build_object(
    'answer',
      'The user has ' || public.mcp__money(v_total)
      || ' outstanding from ' || v_count::text || ' gig'
      || case when v_count = 1 then '' else 's' end
      || ' (' || v_scope || '). Report this number. Do not recalculate it.',
    'assistant_instructions',
      'Report ' || public.mcp__money(v_total) || ' outstanding. '
      || 'That number is final. Use items[].outstanding; do not recompute from rates. '
      || case when v_window
           then 'This window matches Insights for the same dates. Bump-only days earn bumps only.'
           else 'This is all-time, matching Payments / Today — not a calendar year. For Insights Year YYYY pass start_date=YYYY-01-01 and end_date=YYYY-12-31.'
         end,
    'matches_screen', case when v_window then 'insights' else 'payments_all_time' end,
    'currency', 'USD',
    'scope', case when v_window then 'window' else 'all_time' end,
    'start_date', p_start,
    'end_date', p_end,
    'outstanding', round(v_total, 2),
    'outstanding_gigs', v_count,
    'items', coalesce(v_items, '[]'::jsonb),
    'payments_due_count', v_attention.payments_due_count,
    'payments_due_amount_all_time', v_attention.payments_due_amount,
    'missing_payment_count', v_attention.missing_payment_count,
    'missing_dates_count', v_attention.missing_dates_count,
    'definitions', jsonb_build_object(
      'answer', 'The sentence to tell the user. Use this dollar amount.',
      'outstanding', 'Earned minus received. Bump-only worked days earn bumps only, not the day/flat/hourly/guarantee rate.',
      'items', 'Gigs that still have remaining pay. Quote title + outstanding. Do not reconstruct.',
      'matches_screen', 'insights = Insights for the dates. payments_all_time = Payments outstanding / Today.',
      'payments_due_amount_all_time', 'All-time payments-due total. Ignore this when scope is window; use outstanding instead.'
    )
  );
end;
$$;

-- Compare the screens that must agree. Call as the signed-in user (or after
-- mcp__auth). ok=true means MCP can match the app for that year.
create or replace function public.mcp_check_app_alignment(p_year integer default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  y int := coalesce(p_year, extract(year from current_date)::int);
  v_start date := make_date(y, 1, 1);
  v_end_excl date := make_date(y + 1, 1, 1);
  v_insights jsonb;
  v_today numeric;
  v_checks jsonb := '[]'::jsonb;
  v_ok boolean := true;
  v_gross numeric;
  v_out numeric;
  v_today_ok boolean;
  v_sum numeric;
  v_sum_ok boolean;
begin
  if auth.uid() is null then
    return jsonb_build_object('error', 'not_signed_in');
  end if;

  v_insights := public.load_insights_overview(v_start, v_end_excl, 'year');
  v_today := public.load_month_earned_summary(v_start, v_end_excl);
  v_gross := coalesce((v_insights->>'gross_earned')::numeric, 0);
  v_out := coalesce((v_insights->>'outstanding')::numeric, 0);

  v_today_ok := round(v_today, 2) is not distinct from round(v_gross, 2);
  v_ok := v_ok and v_today_ok;
  v_checks := v_checks || jsonb_build_array(jsonb_build_object(
    'name', 'today_earned_matches_insights_gross',
    'ok', v_today_ok,
    'today_earned', v_today,
    'insights_gross', v_gross,
    'detail', 'Today "earned this month/year" must equal Insights gross for the same exclusive window.'
  ));

  select coalesce(sum((i->>'outstanding')::numeric), 0) into v_sum
  from jsonb_array_elements(coalesce(v_insights->'outstanding_items', '[]'::jsonb)) i;
  v_sum_ok := round(v_sum, 2) is not distinct from round(v_out, 2);
  v_ok := v_ok and v_sum_ok;
  v_checks := v_checks || jsonb_build_array(jsonb_build_object(
    'name', 'insights_outstanding_sums',
    'ok', v_sum_ok,
    'items_sum', v_sum,
    'insights_outstanding', v_out
  ));

  -- Gigs that only worked in this year: Insights outstanding = Payments remaining.
  v_checks := v_checks || coalesce((
    select jsonb_agg(jsonb_build_object(
      'name', 'gig_remaining_matches_insights',
      'ok', round((g->>'outstanding')::numeric, 2)
            is not distinct from round(greatest(
              public.calculate_gig_earned_amount((g->>'gig_id')::uuid)
              - coalesce((
                  select sum(gp.gross_pay)
                  from public.gig_payments gp
                  where gp.gig_id = (g->>'gig_id')::uuid
                    and gp.user_id = auth.uid()
                    and gp.deleted_at is null
                ), 0),
              0
            ), 2),
      'title', g->>'title',
      'insights_outstanding', (g->>'outstanding')::numeric,
      'payments_remaining', round(greatest(
        public.calculate_gig_earned_amount((g->>'gig_id')::uuid)
        - coalesce((
            select sum(gp.gross_pay)
            from public.gig_payments gp
            where gp.gig_id = (g->>'gig_id')::uuid
              and gp.user_id = auth.uid()
              and gp.deleted_at is null
          ), 0),
        0
      ), 2)
    ))
    from jsonb_array_elements(coalesce(v_insights->'gigs', '[]'::jsonb)) g
    where not exists (
      select 1 from public.gig_dates gd
      where gd.gig_id = (g->>'gig_id')::uuid
        and gd.user_id = auth.uid()
        and gd.deleted_at is null
        and gd.status_for_day = 'worked'
        and (gd.date < v_start or gd.date >= v_end_excl)
    )
  ), '[]'::jsonb);

  if exists (
    select 1 from jsonb_array_elements(v_checks) c
    where c->>'name' = 'gig_remaining_matches_insights' and (c->>'ok')::boolean is distinct from true
  ) then
    v_ok := false;
  end if;

  return jsonb_build_object(
    'ok', v_ok,
    'year', y,
    'window', jsonb_build_object('start', v_start, 'end_exclusive', v_end_excl),
    'insights_gross', v_gross,
    'insights_outstanding', v_out,
    'checks', v_checks
  );
end;
$$;

revoke all on function public.mcp__window_exclusive(date, date) from public, anon, authenticated;
revoke all on function public.mcp_check_app_alignment(integer) from public, anon;
grant execute on function public.mcp_check_app_alignment(integer) to authenticated, service_role;
grant execute on function public.mcp_get_earnings(text, date, date) to service_role;
grant execute on function public.mcp_get_outstanding(text, date, date) to service_role;
