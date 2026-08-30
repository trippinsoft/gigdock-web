// Back-office data model (gigs, dates, payments, bumps, companies, projects).
// Hand-written to match the Supabase schema (see the schema audit). These mirror
// the same tables/views/RPCs the mobile app uses — the web reads them under the
// same RLS. Keep field names in sync with Postgres; add columns here when the
// DB gains them.

/** pay_type enum (gig_pay_type). Drives which pay_* fields apply. */
export type GigPayType = "flatRate" | "dayRate" | "hourly" | "guaranteedMin";

/** A row of the `gigs` table. */
export interface Gig {
  id: string;
  user_id: string;
  title: string;
  short_code: string | null;
  rate: string | null;
  location: string | null;
  notes: string | null;
  created_at: string | null;
  active: boolean;
  image_url: string | null;
  project_id: string | null;
  start_date: string | null;
  end_date: string | null;
  status_overall: string | null; // e.g. 'booked'
  rate_text: string | null;
  expected_total_gross: number | null;
  expected_total_net: number | null;
  total_hours_worked: number | null;
  settled_totals: Record<string, unknown> | null;
  user_marked_paid: boolean;
  paid_marked_at: string | null;
  updated_at: string | null;
  gig_company_id: string | null;
  payroll_company_id: string | null;
  pay_type: GigPayType | null;
  pay_minimum_amount: number | null;
  pay_minimum_hours: number | null;
  pay_hourly_rate: number | null;
  pay_currency: string | null;
  ot_multiplier: number | null;
  bump_rate: number | null;
  ot_starts_after_hours: number | null;
  pay_flat_rate: number | null;
  is_unpaid: boolean | null;
  origin: string | null; // where the worker got the gig; null when opportunity-sourced
  deleted_at: string | null;
}

/** `gigs_with_names` view — Gig plus resolved project/company display names. */
export interface GigWithNames extends Gig {
  project_title: string | null;
  gig_company_name: string | null;
  payroll_company_name: string | null;
}

/** Shape returned by the `load_filtered_gigs` RPC (Gig row + computed money). */
export interface FilteredGig extends Gig {
  total_paid: number;
  earned_total: number;
  remaining: number;
  gig_date_count: number;
  gig_dates: { date: string }[];
}

/** A row of `gig_dates`. */
export interface GigDate {
  id: string;
  user_id: string;
  gig_id: string | null;
  date: string;
  status_for_day: string | null;
  hours_total: number;
  hours_lunch: number;
  hours_paid: number;
  overtime_hours: number;
  base_pay: number | null;
  bumps: number | null;
  gross_pay: number | null;
  net_pay: number | null;
  date_paid: string | null;
  notes: string | null;
  voucher_image_url: string | null;
  updated_at: string | null;
  location: string | null;
  base_pay_applies: boolean;
  deleted_at: string | null;
}

/** Row from `load_gig_dates_with_earnings` (date + server-computed earnings). */
export interface GigDateWithEarnings {
  gig_date_id: string;
  gig_id: string;
  date: string;
  status_for_day: string | null;
  hours_total: number | null;
  base_rate_calc: number | null;
  ot_rate_calc: number | null;
  gross_earned_calc: number | null;
}

/** A row of `gig_payments`. */
export interface GigPayment {
  id: string;
  user_id: string;
  gig_id: string | null;
  pay_date: string;
  gross_pay: number | null;
  net_pay: number | null;
  hours_paid: number | null;
  notes: string | null;
  payment_method: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/** A row of `gig_bumps`. */
export interface GigBump {
  id: string;
  user_id: string;
  gig_id: string;
  gig_date_id: string;
  bump_type: string;
  amount: number;
  note: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
}

/** A row of `companies` (kind = 'gig' | 'payroll' | ...). */
export interface Company {
  id: string;
  user_id: string;
  kind: string;
  name: string;
  phone: string | null;
  email: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** Minimal `projects` shape (only fields the web currently reads). */
export interface Project {
  id: string;
  user_id: string;
  title: string;
}

/** Row from `load_gig_earnings_summary`. */
export interface GigEarningsSummary {
  gig_id: string;
  gross_earned: number | null;
  total_paid: number | null;
  remaining: number | null;
  received_percent: number | null;
}

/** Row from `load_earnings_summary` (all gigs, optionally windowed). */
export interface EarningsSummary {
  gross_earned: number | null;
  total_paid: number | null;
  remaining: number | null;
  received_percent: number | null;
  gig_count: number;
}

/** A gig_payments row with the parent gig's title embedded. */
export interface PaymentWithGig extends GigPayment {
  gig: { title: string } | null;
}

/** Return shape of `load_needs_attention` (single row). */
export interface NeedsAttention {
  payments_due_count: number;
  payments_due_amount: number | null;
  payments_due_gig_ids: string[] | null;
  missing_payment_count: number;
  missing_payment_gig_ids: string[] | null;
  missing_dates_count: number;
  missing_dates_gig_ids: string[] | null;
}

/** Output of `load_insights_overview` (jsonb). */
export interface InsightsOverview {
  gross_earned: number;
  net_recorded: number;
  gigs_worked: number;
  days_worked: number;
  average_per_work_day: number;
  paid_gigs: number;
  net_complete_gigs: number;
  // Returned by the shared load_insights_overview RPC and consumed by the
  // reports; declared optional because the web type predates the reports.
  net_complete_payments?: number;
  net_complete: boolean;
  outstanding: number;
  outstanding_gigs: number;
  received: number;
  payment_count: number;
  payment_gigs: number;
  trend: { date: string; gross: number }[];
  payment_trend: { date: string; received: number; net?: number | null }[];
  payments?: { title: string | null; pay_date: string | null; gross: number; net: number | null }[];
  gigs: {
    gig_id: string;
    title: string;
    first_worked_date: string;
    last_worked_date: string;
    days_worked: number;
    gross: number;
    received: number;
    outstanding: number;
  }[];
  companies: { id: string | null; name: string; gross: number; gig_count: number; days_worked: number }[];
  projects: { id: string | null; name: string; gross: number; gig_count: number; days_worked: number }[];
  outstanding_items: {
    gig_id: string;
    title: string;
    worked_date: string;
    earned: number;
    received: number;
    outstanding: number;
    days_outstanding?: number | null;
    company_name?: string | null;
  }[];
}

/** A gig_dates row trimmed for the calendar, with the gig title/location and
 * gig-level payment summary (from load_active_gigs_with_financials_by_date_range). */
export interface CalendarDate {
  id: string;
  gig_id: string | null;
  date: string;
  status_for_day: string | null;
  hours_total: number | null;
  bumps: number | null;
  gig: { title: string; location: string | null } | null;
  gross_earned?: number | null;
  total_paid?: number | null;
  remaining?: number | null;
  received_percent?: number | null;
}

/** A row of `date_flags` (personal per-day flag: hold, unavailable, ...). */
export interface DateFlag {
  user_id: string;
  date: string;
  flag: string;
}

/** A row of the `documents` table. */
export interface DocumentRow {
  id: string;
  user_id: string;
  gig_id: string | null;
  project_id: string | null;
  payment_id: string | null;
  document_type: string;
  display_name: string;
  storage_path: string;
  original_file_name: string;
  mime_type: string;
  file_size: number;
  document_date: string | null;
  notes: string | null;
  created_at: string;
}

/** Gig list filter buckets (map to load_filtered_gigs p_filter_type). */
export type GigFilter = "payments_due" | "missing_payment" | "missing_dates";
export type GigSort = "recent" | "oldest";
