// Default performer_profiles write for /signup/complete.
//
// Kept outside the "use server" actions file so the exact logic can be
// exercised by tests/onboarding-performer-profile.test.mjs with the real
// supabase-js client and Next's request-scoped fetch dedupe.
//
// Invariant: public.one_default_performer_profile (unique user_id WHERE
// is_default) allows one default row per user. This helper never weakens
// it — it only makes onboarding's write converge on that single row:
//
//   * Every read of the default row is fresh. /signup/complete runs this
//     during a Server Component render, where Next memoizes identical GET
//     fetches for the whole request. Without an AbortSignal, the conflict
//     re-read after a 23505 returned the memoized "no row" from the first
//     lookup, so the recovery could never find the winning row.
//   * Onboarding fills in; it never erases. When a default row already
//     exists (a concurrent completion won, or a retry after partial
//     success), only fields that are still empty on that row are written.
//     Existing values, the label, and markets are left untouched.

import type { SupabaseClient } from "@supabase/supabase-js";

/** Optional performer-profile fields captured during the pre-account
 * wizard. All are individually optional. */
export interface OnboardingPerformerPayload {
  gender?: string | null;
  ethnicity?: string[] | null;
  date_of_birth?: string | null;
  union_status?: string | null;
  height_inches?: number | null;
}

export const DEFAULT_PERFORMER_PROFILE_INDEX = "one_default_performer_profile";

const PERFORMER_FIELDS = [
  "gender",
  "ethnicity",
  "date_of_birth",
  "union_status",
  "height_inches",
] as const;

type PerformerField = (typeof PERFORMER_FIELDS)[number];
type ExistingDefault = { id: string } & Partial<Record<PerformerField, unknown>>;
type DbError = { code?: string; message?: string; details?: string };

function normalize(perf: OnboardingPerformerPayload): Record<PerformerField, unknown> {
  return {
    gender: perf.gender ?? null,
    ethnicity: Array.isArray(perf.ethnicity) ? perf.ethnicity : [],
    date_of_birth: perf.date_of_birth ?? null,
    union_status: perf.union_status ?? null,
    height_inches:
      typeof perf.height_inches === "number" && perf.height_inches > 0
        ? perf.height_inches
        : null,
  };
}

function isEmpty(v: unknown): boolean {
  return v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);
}

export function isDefaultProfileConflict(err: DbError | null | undefined): boolean {
  if (!err || err.code !== "23505") return false;
  return `${err.message ?? ""} ${err.details ?? ""}`.includes(DEFAULT_PERFORMER_PROFILE_INDEX);
}

/** Fields to write onto an existing default row: draft values only where
 * the row is still empty. Returns null when there is nothing to fill. */
export function fillEmptyFields(
  existing: Partial<Record<PerformerField, unknown>>,
  perf: OnboardingPerformerPayload
): Partial<Record<PerformerField, unknown>> | null {
  const draft = normalize(perf);
  const patch: Partial<Record<PerformerField, unknown>> = {};
  for (const f of PERFORMER_FIELDS) {
    if (!isEmpty(draft[f]) && isEmpty(existing[f])) patch[f] = draft[f];
  }
  return Object.keys(patch).length > 0 ? patch : null;
}

/** Create or complete the user's single default performer profile from the
 * onboarding draft. Idempotent and safe under concurrent completions.
 * Throws the underlying database error on any real failure. */
export async function saveOnboardingDefaultPerformerProfile(
  supabase: SupabaseClient,
  userId: string,
  marketCodes: string[],
  performer: OnboardingPerformerPayload
): Promise<void> {
  const readDefault = async (): Promise<ExistingDefault | null> => {
    const { data, error } = await supabase
      .from("performer_profiles")
      .select(`id, ${PERFORMER_FIELDS.join(", ")}`)
      .eq("user_id", userId)
      .eq("is_default", true)
      // A fresh signal per read opts out of Next's request-scoped GET
      // memoization, so a re-read reflects rows committed since the last one.
      .abortSignal(new AbortController().signal)
      .maybeSingle();
    if (error) throw error;
    return (data as ExistingDefault | null) ?? null;
  };

  const completeExisting = async (row: ExistingDefault) => {
    const patch = fillEmptyFields(row, performer);
    if (!patch) return;
    const { error } = await supabase.from("performer_profiles").update(patch).eq("id", row.id);
    if (error) throw error;
  };

  const existing = await readDefault();
  if (existing) {
    await completeExisting(existing);
    return;
  }

  // markets is included on insert even though profiles.work_markets is the
  // universal source: sync_legacy_performer_markets_to_universal mirrors a
  // default row's markets back into profiles, so the insert must carry the
  // codes set_work_markets just persisted to keep that trigger a no-op.
  const { error: insErr } = await supabase.from("performer_profiles").insert({
    user_id: userId,
    is_default: true,
    label: "My Profile",
    markets: marketCodes,
    ...normalize(performer),
  });
  if (!insErr) return;
  if (!isDefaultProfileConflict(insErr)) throw insErr;

  // Another completion created the default row after our read. The unique
  // index kept the invariant; converge on the winning row.
  const winner = await readDefault();
  if (!winner) throw insErr;
  await completeExisting(winner);
}
