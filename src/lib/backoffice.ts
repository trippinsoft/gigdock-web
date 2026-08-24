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
import { createSupabaseServer } from "@/lib/supabase-server";
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
  const { data, error } = await supabase
    .from("gigs_with_names")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
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

/** Total gross earned across the given date window (load_month_earned_summary). */
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

/** Insights roll-up for a window (load_insights_overview). bucket: 'month'|'year'. */
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

/** Worked/planned gig days within [start, end) for the calendar, gig title embedded. */
export async function getCalendarDates(
  start: string,
  end: string
): Promise<CalendarDate[]> {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("gig_dates")
    .select("id, gig_id, date, status_for_day, hours_total, gig:gigs(title)")
    .is("deleted_at", null)
    .gte("date", start)
    .lt("date", end)
    .order("date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as CalendarDate[];
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
export async function getDocuments(): Promise<DocumentRow[]> {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("documents")
    .select(
      "id, user_id, gig_id, project_id, payment_id, document_type, display_name, storage_path, original_file_name, mime_type, file_size, document_date, notes, created_at"
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as DocumentRow[];
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

/** Does the signed-in user currently hold an active entitlement to a product?
 * Backed by has_active_entitlement(p_product) which derives the user internally. */
export async function hasActiveEntitlement(
  product = "premium"
): Promise<boolean> {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.rpc("has_active_entitlement", {
    p_product: product,
  });
  if (error) throw error;
  return !!data;
}
