-- Insights / reports: honor bump-only worked days.
-- Applied 2026-08-31 (migration: insights_honor_bump_only).
--
-- load_insights_overview previously called calc_gig_date_gross_earned for
-- every worked date and ignored gig_dates.base_pay_applies. Unchecking
-- "Base pay applies to this day" is intentional: that day earns bumps only.
-- calculate_gig_earned_amount (Payments, MCP) already honors this. Insights
-- Year 2026 then showed $2,521.37 outstanding while Payments/MCP showed
-- $2,181.37 for the same year (Rose Locke $200 and Iron Jane $140 of the
-- gap were bump-only days counted as a full day/guarantee rate).
--
-- Same RPC is shared with mobile Insights and web reports.

create or replace function public.load_insights_overview(
  p_start_date date,
  p_end_date date,
  p_bucket text default 'month'::text
)
returns jsonb
language sql
security definer
set search_path to 'public'
as $function$
with worked_dates as (
  select gd.id, gd.gig_id, gd.date,
    coalesce(gd.base_pay_applies, true) as base_pay_applies,
    case
      when not coalesce(gd.base_pay_applies, true) then round(coalesce(gd.bumps, 0), 2)
      when g.pay_type::text = 'flatRate' then coalesce(gd.bumps, 0)
      else public.calc_gig_date_gross_earned(
        g.pay_type::text,
        gd.hours_total,
        g.pay_minimum_amount,
        g.pay_minimum_hours,
        g.pay_hourly_rate,
        g.pay_flat_rate,
        g.ot_starts_after_hours,
        g.ot_multiplier,
        coalesce(gd.bumps, 0)
      )
    end date_gross,
    g.pay_type::text pay_type,
    coalesce(g.pay_flat_rate, 0) flat_rate,
    g.title,
    g.gig_company_id,
    g.project_id
  from gig_dates gd
  join gigs g on g.id = gd.gig_id
  where gd.user_id = auth.uid()
    and g.user_id = auth.uid()
    and g.active = true
    and g.deleted_at is null
    and gd.deleted_at is null
    and gd.status_for_day = 'worked'
    and gd.date >= p_start_date
    and gd.date < p_end_date
),
period_gigs as (
  select gig_id,
    min(date) first_worked_date,
    max(date) last_worked_date,
    count(distinct date)::int days_worked,
    max(title) title,
    max(gig_company_id::text)::uuid gig_company_id,
    max(project_id::text)::uuid project_id,
    min(date) filter (where base_pay_applies) as flat_bucket_date,
    case
      when max(pay_type) = 'flatRate' then
        (case when bool_or(base_pay_applies) then max(flat_rate) else 0 end)
        + coalesce(sum(date_gross), 0)
      else coalesce(sum(date_gross), 0)
    end period_gross
  from worked_dates
  group by gig_id
),
payments as (
  select gp.gig_id, coalesce(sum(gp.gross_pay), 0) gross_paid,
    coalesce(sum(gp.net_pay) filter (where gp.net_pay > 0 and gp.pay_date >= p_start_date and gp.pay_date < p_end_date), 0) net_recorded,
    count(*) filter (where gp.gross_pay > 0 and gp.pay_date >= p_start_date and gp.pay_date < p_end_date)::int payment_count,
    count(*) filter (where gp.gross_pay > 0 and gp.net_pay > 0 and gp.pay_date >= p_start_date and gp.pay_date < p_end_date)::int net_payment_count
  from gig_payments gp
  join period_gigs pg on pg.gig_id = gp.gig_id
  where gp.user_id = auth.uid() and gp.deleted_at is null
  group by gp.gig_id
),
gig_rows as (
  select pg.*, coalesce(p.gross_paid, 0) gross_paid, coalesce(p.net_recorded, 0) net_recorded,
    coalesce(p.payment_count, 0) payment_count, coalesce(p.net_payment_count, 0) net_payment_count,
    greatest(pg.period_gross - coalesce(p.gross_paid, 0), 0) outstanding
  from period_gigs pg
  left join payments p on p.gig_id = pg.gig_id
),
trend_by_gig as (
  select case
      when p_bucket = 'year' then date_trunc('month', wd.date)::date
      else (p_start_date + ((extract(day from wd.date)::int - 1) / 7) * 7)::date
    end bucket_start,
    wd.gig_id,
    case
      when max(wd.pay_type) = 'flatRate' then
        sum((case when wd.date = pg.flat_bucket_date then wd.flat_rate else 0 end) + wd.date_gross)
      else sum(wd.date_gross)
    end gross
  from worked_dates wd
  join period_gigs pg on pg.gig_id = wd.gig_id
  group by 1, wd.gig_id
),
trend_totals as (
  select bucket_start, round(sum(gross), 2) gross
  from trend_by_gig
  group by bucket_start
),
period_payment_rows as (
  select gp.id, gp.gig_id, gp.pay_date, coalesce(gp.gross_pay, 0) gross_pay, gp.net_pay,
    coalesce(g.title, 'Unassigned payment') title
  from gig_payments gp
  left join gigs g on g.id = gp.gig_id and g.user_id = auth.uid()
  where gp.user_id = auth.uid()
    and gp.deleted_at is null
    and gp.pay_date >= p_start_date
    and gp.pay_date < p_end_date
    and coalesce(gp.gross_pay, 0) > 0
),
payment_trend as (
  select case
      when p_bucket = 'year' then date_trunc('month', pay_date)::date
      else (p_start_date + ((extract(day from pay_date)::int - 1) / 7) * 7)::date
    end bucket_start,
    round(sum(gross_pay), 2) received
  from period_payment_rows
  group by 1
),
payment_totals as (
  select round(coalesce(sum(gross_pay), 0), 2) received,
    count(*)::int payment_count,
    count(distinct gig_id) filter (where gig_id is not null)::int paid_gigs
  from period_payment_rows
),
company_totals as (
  select gr.gig_company_id, coalesce(c.name, 'No company') company_name,
    round(sum(gr.period_gross), 2) gross,
    count(*)::int gig_count,
    sum(gr.days_worked)::int days_worked
  from gig_rows gr
  left join companies c on c.id = gr.gig_company_id and c.user_id = auth.uid()
  group by gr.gig_company_id, c.name
),
project_totals as (
  select gr.project_id, coalesce(p.title, 'No project') project_name,
    round(sum(gr.period_gross), 2) gross,
    count(*)::int gig_count,
    sum(gr.days_worked)::int days_worked
  from gig_rows gr
  left join projects p on p.id = gr.project_id and p.user_id = auth.uid()
  group by gr.project_id, p.title
),
totals as (
  select round(coalesce(sum(period_gross), 0), 2) gross_earned,
    round(coalesce(sum(net_recorded), 0), 2) net_recorded,
    count(*)::int gigs_worked,
    count(*) filter (where payment_count > 0)::int paid_gigs,
    count(*) filter (where payment_count > 0 and payment_count = net_payment_count)::int net_complete_gigs,
    round(coalesce(sum(outstanding), 0), 2) outstanding,
    count(*) filter (where outstanding > 0)::int outstanding_gigs
  from gig_rows
),
days as (
  select count(distinct date)::int days_worked from worked_dates
)
select jsonb_build_object(
  'gross_earned', t.gross_earned,
  'net_recorded', t.net_recorded,
  'gigs_worked', t.gigs_worked,
  'days_worked', d.days_worked,
  'average_per_work_day', case when d.days_worked > 0 then round(t.gross_earned / d.days_worked, 2) else 0 end,
  'paid_gigs', t.paid_gigs,
  'net_complete_gigs', t.net_complete_gigs,
  'net_complete', t.paid_gigs > 0 and t.paid_gigs = t.net_complete_gigs,
  'outstanding', t.outstanding,
  'outstanding_gigs', t.outstanding_gigs,
  'received', pt.received,
  'payment_count', pt.payment_count,
  'payment_gigs', pt.paid_gigs,
  'trend', coalesce((
    select jsonb_agg(jsonb_build_object('date', bucket_start, 'gross', gross) order by bucket_start)
    from trend_totals
  ), '[]'::jsonb),
  'payment_trend', coalesce((
    select jsonb_agg(jsonb_build_object('date', bucket_start, 'received', received) order by bucket_start)
    from payment_trend
  ), '[]'::jsonb),
  'gigs', coalesce((
    select jsonb_agg(jsonb_build_object(
      'gig_id', gig_id, 'title', title,
      'first_worked_date', first_worked_date, 'last_worked_date', last_worked_date,
      'days_worked', days_worked, 'gross', round(period_gross, 2),
      'received', round(gross_paid, 2), 'outstanding', round(outstanding, 2)
    ) order by first_worked_date desc, title)
    from gig_rows
  ), '[]'::jsonb),
  'payments', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', id, 'gig_id', gig_id, 'title', title, 'pay_date', pay_date,
      'gross', round(gross_pay, 2), 'net', net_pay
    ) order by pay_date desc, id)
    from period_payment_rows
  ), '[]'::jsonb),
  'companies', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', gig_company_id, 'name', company_name, 'gross', gross,
      'gig_count', gig_count, 'days_worked', days_worked
    ) order by gross desc, company_name)
    from company_totals
  ), '[]'::jsonb),
  'projects', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', project_id, 'name', project_name, 'gross', gross,
      'gig_count', gig_count, 'days_worked', days_worked
    ) order by gross desc, project_name)
    from project_totals
  ), '[]'::jsonb),
  'outstanding_items', coalesce((
    select jsonb_agg(jsonb_build_object(
      'gig_id', gig_id, 'title', title, 'worked_date', first_worked_date,
      'earned', round(period_gross, 2), 'received', round(gross_paid, 2),
      'outstanding', round(outstanding, 2)
    ) order by outstanding desc)
    from gig_rows
    where outstanding > 0
  ), '[]'::jsonb)
)
from totals t
cross join days d
cross join payment_totals pt;
$function$;
