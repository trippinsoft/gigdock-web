// Server-only data-access layer for the authenticated web back-office.
//
// Every function here runs on the server under the caller's Supabase session,
// so RLS (`user_id = auth.uid()`) scopes all rows to the signed-in user. The
// back-office business logic already lives in Postgres RPCs/views; this layer is
// a thin, typed wrapper so every web surface reads through one place and the
// mobile app and web stay behavior-compatible.
//
// Do NOT change the signature/behavior of any RPC/view here — they are shared
// with the mobile app. Add new RPCs if new behavior is needed.

// (No `server-only` import — this module uses next/headers via
// createSupabaseServer, which already makes it unusable from client components.)
import { cache } from "react";
import { createSupabaseServer } from "@/lib/supabase-server";
import { PRO_PRODUCT } from "@/lib/pricing";
import type { PerformerProfile, GigFitRow } from "@/lib/gigfit";
import type {
  CalendarDate,
  DateFlag,
  DocumentRow,
  EarningsSummary,
  FilteredGig,
  GigBump,
  GigDateWithEarnings,
  GigEarningsSummary,
  GigFilter,
  GigPayment,
  GigSort,
  GigWithNames,
  InsightsOverview,
  NeedsAttention,
  PaymentWithGig,
} from "@/lib/backoffice-types";

/** Currently signed-in user, or null. */
export async function getSessionUser() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** The user's active gigs, with computed earned/paid/remaining and dates.
 * Backed by load_filtered_gigs (SECURITY DEFINER, scopes to auth.uid()). */
export async function getGigs(opts?: {
  filter?: GigFilter | null;
  search?: string | null;
  sort?: GigSort;
}): Promise<FilteredGig[]> {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.rpc("load_filtered_gigs", {
    p_filter_type: opts?.filter ?? null,
    p_search: opts?.search ?? null,
    p_sort: opts?.sort ?? "recent",
  });
  if (error) throw error;
  // RPC returns a jsonb array.
  return (data ?? []) as FilteredGig[];
}

/** One gig with resolved project/company names, from the gigs_with_names view. */
export async function getGig(id: string): Promise<GigWithNames | null> {
  const supabase = await createSupabaseServer();
  // NOTE: the gigs_with_names view does not expose deleted_at, so we can't filter
  // it here (doing so errors). Soft-deleted gigs aren't linked from the
  // active-only lists, so fetching by id without that filter is fine.
  const { data, error } = await supabase
    .from("gigs_with_names")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as GigWithNames | null) ?? null;
}

/** Per-gig earnings roll-up (gross earned, paid, remaining, % received). */
export async function getGigEarnings(
  gigId: string
): Promise<GigEarningsSummary | null> {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.rpc("load_gig_earnings_summary", {
    p_gig_id: gigId,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return (row as GigEarningsSummary) ?? null;
}

/** Worked days for a gig with server-computed per-day earnings. */
export async function getGigDates(
  gigId: string
): Promise<GigDateWithEarnings[]> {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.rpc("load_gig_dates_with_earnings", {
    p_gig_id: gigId,
  });
  if (error) throw error;
  return (data ?? []) as GigDateWithEarnings[];
}

/** Payments recorded against a gig (most recent first). */
export async function getGigPayments(gigId: string): Promise<GigPayment[]> {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("gig_payments")
    .select("*")
    .eq("gig_id", gigId)
    .is("deleted_at", null)
    .order("pay_date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as GigPayment[];
}

/** Bumps recorded against a gig. */
export async function getGigBumps(gigId: string): Promise<GigBump[]> {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("gig_bumps")
    .select("*")
    .eq("gig_id", gigId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as GigBump[];
}

/** Dashboard "needs attention" counters (payments due, missing data). */
export async function getNeedsAttention(): Promise<NeedsAttention | null> {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.rpc("load_needs_attention");
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return (row as NeedsAttention) ?? null;
}

/** Total gross earned across the given date window. Same number as Insights
 *  gross_earned for [start, end). */
export async function getEarnedInRange(
  start: string,
  end: string
): Promise<number> {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.rpc("load_month_earned_summary", {
    p_start_date: start,
    p_end_date: end,
  });
  if (error) throw error;
  return Number(data ?? 0);
}

/** Earnings roll-up across all gigs (optionally windowed). load_earnings_summary. */
export async function getEarningsSummary(
  start?: string,
  end?: string
): Promise<EarningsSummary | null> {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.rpc("load_earnings_summary", {
    p_start_date: start ?? null,
    p_end_date: end ?? null,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return (row as EarningsSummary) ?? null;
}

/** All payments across gigs, newest first, with the gig title embedded. */
export async function getAllPayments(): Promise<PaymentWithGig[]> {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("gig_payments")
    .select("*, gig:gigs(title)")
    .is("deleted_at", null)
    .order("pay_date", { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as unknown as PaymentWithGig[];
}

/** Raw gig_dates rows for editing (all input fields, active only). */
export async function getGigDatesRaw(gigId: string) {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("gig_dates")
    .select(
      "id, gig_id, date, status_for_day, hours_total, hours_lunch, overtime_hours, bumps, base_pay_applies, notes"
    )
    .eq("gig_id", gigId)
    .is("deleted_at", null)
    .order("date", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** The user's companies (for the gig/payroll company pickers). */
export async function getCompanies() {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("companies")
    .select("id, name, kind")
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as { id: string; name: string; kind: string }[];
}

/** The user's projects (for the project picker). */
export async function getProjects() {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("projects")
    .select("id, title")
    .order("title", { ascending: true });
  if (error) throw error;
  return (data ?? []) as { id: string; title: string }[];
}

/** Insights roll-up for a window (load_insights_overview). bucket: 'month'|'year'.
 *  Per-date gross honors base_pay_applies (bump-only days earn bumps only),
 *  matching calculate_gig_earned_amount. */
export async function getInsights(
  start: string,
  end: string,
  bucket: "month" | "year" = "month"
): Promise<InsightsOverview | null> {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.rpc("load_insights_overview", {
    p_start_date: start,
    p_end_date: end,
    p_bucket: bucket,
  });
  if (error) throw error;
  return (data as InsightsOverview) ?? null;
}

/** Worked/planned gig days within [start, end) for the calendar, with gig
 * title/location and the same gig-level payment summary the mobile day sheet
 * loads via load_active_gigs_with_financials_by_date_range. */
export async function getCalendarDates(
  start: string,
  end: string
): Promise<CalendarDate[]> {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("gig_dates")
    .select("id, gig_id, date, status_for_day, hours_total, bumps, gig:gigs(title, location)")
    .is("deleted_at", null)
    .gte("date", start)
    .lt("date", end)
    .order("date", { ascending: true });
  if (error) throw error;

  const rows = (data ?? []) as unknown as CalendarDate[];

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return rows;

  const { data: financials, error: finErr } = await supabase.rpc(
    "load_active_gigs_with_financials_by_date_range",
    { p_user_id: user.id, p_start_date: start, p_end_date: end }
  );
  if (finErr || !financials) return rows;

  const byGig = new Map<
    string,
    { gross_earned: number; total_paid: number; remaining: number; received_percent: number }
  >();
  for (const row of financials as {
    id: string;
    gross_earned: number | null;
    total_paid: number | null;
    remaining: number | null;
    received_percent: number | null;
  }[]) {
    byGig.set(row.id, {
      gross_earned: Number(row.gross_earned ?? 0),
      total_paid: Number(row.total_paid ?? 0),
      remaining: Number(row.remaining ?? 0),
      received_percent: Number(row.received_percent ?? 0),
    });
  }

  return rows.map((d) => {
    const fin = d.gig_id ? byGig.get(d.gig_id) : undefined;
    return fin ? { ...d, ...fin } : d;
  });
}

/** Personal date flags within [start, end). */
export async function getDateFlags(
  start: string,
  end: string
): Promise<DateFlag[]> {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("date_flags")
    .select("user_id, date, flag")
    .gte("date", start)
    .lt("date", end);
  if (error) throw error;
  return (data ?? []) as DateFlag[];
}

/** All of the user's documents, newest first. */
export async function getDocuments(): Promise<(DocumentRow & { gig: { title: string } | null })[]> {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("documents")
    .select(
      "id, user_id, gig_id, project_id, payment_id, document_type, display_name, storage_path, original_file_name, mime_type, file_size, document_date, notes, created_at, gig:gigs(title)"
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as unknown as (DocumentRow & { gig: { title: string } | null })[];
}

/** Short-lived signed URLs for document storage paths (bucket: documents).
 * Returns a map of storage_path -> signed URL (missing on failure). */
export async function getSignedDocUrls(
  paths: string[]
): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrls(paths, 60 * 10); // 10 minutes
  if (error) throw error;
  const out: Record<string, string> = {};
  for (const item of data ?? []) {
    if (item.signedUrl && item.path) out[item.path] = item.signedUrl;
  }
  return out;
}

/** Total gross payments received within [start, end) (by pay_date). Distinct
 * from "earned in range" — this is money that actually arrived. */
export async function getReceivedInRange(
  start: string,
  end: string
): Promise<number> {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("gig_payments")
    .select("gross_pay")
    .is("deleted_at", null)
    .gte("pay_date", start)
    .lt("pay_date", end);
  if (error) throw error;
  return (data ?? []).reduce((s, r) => s + Number(r.gross_pay ?? 0), 0);
}

/** Work summary for a window (load_work_summary): counts and averages. */
export async function getWorkSummary(
  start?: string,
  end?: string
): Promise<{
  gig_count: number;
  days_worked: number;
  project_count: number;
  avg_per_day: number | null;
  avg_per_gig: number | null;
} | null> {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.rpc("load_work_summary", {
    p_start_date: start ?? null,
    p_end_date: end ?? null,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return (row as {
    gig_count: number;
    days_worked: number;
    project_count: number;
    avg_per_day: number | null;
    avg_per_gig: number | null;
  }) ?? null;
}

/** Documents belonging to one gig, with short-lived signed URLs. */
export async function getGigDocuments(
  gigId: string
): Promise<(DocumentRow & { url?: string })[]> {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("documents")
    .select(
      "id, user_id, gig_id, project_id, payment_id, document_type, display_name, storage_path, original_file_name, mime_type, file_size, document_date, notes, created_at"
    )
    .eq("gig_id", gigId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const docs = (data ?? []) as DocumentRow[];
  const urls = await getSignedDocUrls(docs.map((d) => d.storage_path));
  return docs.map((d) => ({ ...d, url: urls[d.storage_path] }));
}

/** A few recent active opportunities for the Today dashboard strip. */
export async function getRecentOpportunities(limit = 3) {
  const supabase = await createSupabaseServer();
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("opportunities")
    .select("id, title, location, pay_rate, match_state, posted_at, work_date, image_url")
    .eq("status", "active")
    .is("deleted_at", null)
    .or(`expires_at.is.null,expires_at.gte.${today}`)
    .order("posted_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as {
    id: string;
    title: string;
    location: string | null;
    pay_rate: string | null;
    match_state: string | null;
    posted_at: string;
    work_date: string | null;
    image_url: string | null;
  }[];
}

/** The signed-in user's posting display name (profiles.display_name) — used for
 * the Today greeting. Intentionally no fallback to a legacy first_name. */
export async function getDisplayName(): Promise<string | null> {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("user_id", user.id)
    .maybeSingle();
  const name = (data?.display_name as string | null) ?? null;
  return name && name.trim() ? name.trim() : null;
}

/** The user's default casting profile (for GigFit). Highest is_default first. */
export async function getDefaultPerformerProfile(): Promise<PerformerProfile | null> {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("performer_profiles")
    .select("*")
    .eq("user_id", user.id)
    .order("is_default", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as PerformerProfile | null) ?? null;
}

/** GigFit match tiers for every active opportunity, for the given profile.
 * Single source of truth is the Postgres gigfit(p_profile_id) RPC. */
export async function getGigFit(profileId: string): Promise<GigFitRow[]> {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.rpc("gigfit", { p_profile_id: profileId });
  if (error) return [];
  return (data ?? []) as GigFitRow[];
}

/** Does the signed-in user currently hold an active entitlement to a product?
 * Backed by has_active_entitlement(p_product) which derives the user internally.
 * Default is "pro" (live entitlements.product). The RPC treats "premium" as the
 * same product. */
export async function hasActiveEntitlement(
  product: string = PRO_PRODUCT
): Promise<boolean> {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.rpc("has_active_entitlement", {
    p_product: product,
  });
  if (error) throw error;
  return !!data;
}

/** The signed-in user's plan. Features read this; billing changes it. Fails
 * closed to "free" so a resolver error never accidentally grants Pro.
 * `cache()` so layout, Settings, Insights, and reports share one RPC result
 * in the same request — Settings Pro / Insights locked was a split-read risk. */
export const getPlan = cache(async (): Promise<"free" | "pro"> => {
  try {
    return (await hasActiveEntitlement(PRO_PRODUCT)) ? "pro" : "free";
  } catch {
    return "free";
  }
});
