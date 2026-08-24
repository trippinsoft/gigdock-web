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
  FilteredGig,
  GigBump,
  GigDateWithEarnings,
  GigEarningsSummary,
  GigFilter,
  GigPayment,
  GigSort,
  GigWithNames,
  NeedsAttention,
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
