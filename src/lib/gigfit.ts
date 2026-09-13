// GigFit types + profile display helpers.
//
// The MATCHING LOGIC lives server-side in Postgres. Three entry points
// share ONE `gigfit_match(...)` core:
//   * `gigfit_preview(...)` — anonymous, used by the pre-account
//                             Opportunity Preview during the signup wizard.
//   * `gigfit_for_user()`   — authenticated generic entry. Sources
//                             work_roles + work_markets from
//                             public.profiles; loads performer criteria
//                             from performer_profiles ONLY when at least
//                             one selected role is is_performer.
//   * `gigfit(p_profile_id)` — legacy wrapper preserved for mobile.
// Everything here is types and presentation helpers only.

export type GigFitTier = "ineligible" | "poor" | "open" | "good" | "strong";

export type GigFitResult = {
  eligible: boolean;
  tier: GigFitTier;
  label: string;
  color: "green" | "blue" | "zinc" | "amber";
  matched: string[];
  blockers: string[];
};

/** One row returned by any gigfit RPC. */
export type GigFitRow = GigFitResult & { opportunity_id: string };

/** Badge color for a match tier — kept in sync with the mobile app so the
 *  same tier looks the same on web and in-app. Derived from the TIER so
 *  the two surfaces can't drift. */
export function fitTierColor(tier: GigFitTier): "green" | "blue" | "zinc" | "amber" | "red" {
  switch (tier) {
    case "strong": return "green";
    case "good": return "blue";
    case "poor": return "amber";
    case "ineligible": return "red";
    case "open":
    default: return "zinc";
  }
}

/** A performer profile row. Note that `markets` is deprecated on this
 *  type — the universal source of truth is now `profiles.work_markets`.
 *  The field remains typed as optional for the transitional period
 *  (mobile still writes it; the legacy `gigfit(p_profile_id)` wrapper
 *  falls back to it if universal work_markets is empty). */
export type PerformerProfile = {
  id: string;
  label: string;
  /** @deprecated Use profiles.work_markets. Kept only during the
   *  Draftbit transition; readers should not rely on it. */
  markets?: string[];
  gender: string | null;
  date_of_birth: string | null;
  union_status: string | null;
  ethnicity?: string[];
  height_inches?: number | null;
  weight_lbs?: number | null;
  work_types_wanted?: string[];
  pay_minimum?: number | null;
  skills?: string[];
  vehicles?: string[];
  notify_matches?: boolean;
};

/* Controlled ethnicity vocabulary — shared by the profile form and display.
   Kept broad to mirror how casting calls actually specify ethnicity. */
export const ETHNICITY_OPTIONS: { value: string; label: string }[] = [
  { value: "black", label: "Black / African American" },
  { value: "white", label: "White / Caucasian" },
  { value: "hispanic", label: "Hispanic / Latino" },
  { value: "asian", label: "Asian" },
  { value: "south-asian", label: "South Asian" },
  { value: "middle-eastern", label: "Middle Eastern" },
  { value: "native-american", label: "Native American" },
  { value: "pacific-islander", label: "Pacific Islander" },
  { value: "multiracial", label: "Multiracial" },
];
const ETHNICITY_LABEL: Record<string, string> = Object.fromEntries(
  ETHNICITY_OPTIONS.map((o) => [o.value, o.label])
);
export function ethnicityLabel(slug: string): string {
  return ETHNICITY_LABEL[slug] ?? slug;
}
/** Short form for compact summaries. */
function ethnicityShort(slug: string): string {
  return ethnicityLabel(slug).split(" / ")[0];
}

/** Total inches -> feet'inches" (e.g. 70 -> 5'10"). */
export function heightLabel(inches: number | null | undefined): string | null {
  if (inches == null || inches <= 0) return null;
  return `${Math.floor(inches / 12)}'${inches % 12}"`;
}

/* ---------- GigFit completeness ---------- */
//
// Completeness is now split across two scopes so crew users can be
// "GigFit-ready" without a performer_profiles row:
//
//   UNIVERSAL  — profiles.work_roles + profiles.work_markets
//   PERFORMER  — gender + ethnicity + date_of_birth + union_status +
//                height_inches (only relevant when the user has a
//                performer role)
//
// GigFit can run any time at least one signal — universal or
// role-relevant performer — is present. The RPC gracefully treats a
// missing signal as "reduce confidence, prevent Strong" rather than as
// a mismatch. `canRunGigFit(ctx)` codifies that.

export type UniversalGigFitKey = "work_roles" | "work_markets";
export type PerformerGigFitKey =
  | "gender"
  | "ethnicity"
  | "date_of_birth"
  | "union_status"
  | "height_inches";
export type GigFitKey = UniversalGigFitKey | PerformerGigFitKey;

/** Which universal signals are populated on the profile row. */
export function universalFieldsSet(p: {
  work_roles: string[] | null | undefined;
  work_markets: string[] | null | undefined;
}): UniversalGigFitKey[] {
  const out: UniversalGigFitKey[] = [];
  if ((p.work_roles?.length ?? 0) > 0) out.push("work_roles");
  if ((p.work_markets?.length ?? 0) > 0) out.push("work_markets");
  return out;
}

/** Which performer-specific signals are populated. */
export function performerFieldsSet(
  perf: PerformerProfile | null | undefined
): PerformerGigFitKey[] {
  if (!perf) return [];
  const out: PerformerGigFitKey[] = [];
  if (perf.gender) out.push("gender");
  if ((perf.ethnicity?.length ?? 0) > 0) out.push("ethnicity");
  if (perf.date_of_birth) out.push("date_of_birth");
  if (perf.union_status) out.push("union_status");
  if (typeof perf.height_inches === "number" && perf.height_inches > 0)
    out.push("height_inches");
  return out;
}

/** Aggregate: universal signals + (when applicable) performer signals. */
export function gigFitFieldsSet(ctx: {
  workRoles?: string[] | null;
  workMarkets?: string[] | null;
  performer?: PerformerProfile | null;
  isPerformer?: boolean;
}): GigFitKey[] {
  const u = universalFieldsSet({
    work_roles: ctx.workRoles ?? null,
    work_markets: ctx.workMarkets ?? null,
  });
  if (!ctx.isPerformer) return u;
  return [...u, ...performerFieldsSet(ctx.performer ?? null)];
}

/** Can GigFit run for this viewer? Any universal signal alone qualifies —
 *  crew users don't need a performer_profiles row. */
export function canRunGigFit(ctx: {
  workRoles?: string[] | null;
  workMarkets?: string[] | null;
  performer?: PerformerProfile | null;
  isPerformer?: boolean;
}): boolean {
  const u = universalFieldsSet({
    work_roles: ctx.workRoles ?? null,
    work_markets: ctx.workMarkets ?? null,
  });
  if (u.length > 0) return true;
  // Transitional: an existing performer with legacy data but no universal
  // signals yet should still see GigFit until they answer Work Roles.
  if (ctx.isPerformer && performerFieldsSet(ctx.performer ?? null).length > 0) {
    return true;
  }
  return false;
}

/* ---------- legacy performer completeness (retained for existing callers)
   Kept in shape for the transitional period so ProfileSummary / admin
   ProfileSummary can continue to say "⚠ regions not set". Prefer
   `universalFieldsSet` + `performerFieldsSet` + `canRunGigFit` going
   forward. */

export type ProfileFieldKey =
  | "markets"
  | "gender"
  | "ethnicity"
  | "date_of_birth"
  | "union_status";

export const PROFILE_FIELD_ORDER: ProfileFieldKey[] = [
  "markets",
  "gender",
  "ethnicity",
  "date_of_birth",
  "union_status",
];

export const PROFILE_FIELD_LABELS: Record<ProfileFieldKey, string> = {
  markets: "regions",
  gender: "gender",
  ethnicity: "ethnicity",
  date_of_birth: "age",
  union_status: "union status",
};

/** Legacy field-completeness check on a performer profile row.
 *  `markets` uses the row's legacy `performer_profiles.markets` field so
 *  a mobile-created profile without universal markets yet is still
 *  scored. Prefer the universal/performer split going forward. */
export function isFieldSet(p: PerformerProfile, k: ProfileFieldKey): boolean {
  switch (k) {
    case "markets":
      return (p.markets?.length ?? 0) > 0;
    case "gender":
      return !!p.gender;
    case "ethnicity":
      return (p.ethnicity?.length ?? 0) > 0;
    case "date_of_birth":
      return !!p.date_of_birth;
    case "union_status":
      return !!p.union_status;
  }
}

export function fieldsSet(p: PerformerProfile): ProfileFieldKey[] {
  return PROFILE_FIELD_ORDER.filter((k) => isFieldSet(p, k));
}

export function fieldsMissing(p: PerformerProfile): ProfileFieldKey[] {
  return PROFILE_FIELD_ORDER.filter((k) => !isFieldSet(p, k));
}

/* ---------- display ---------- */

export function ageFromDob(dob: string | null | undefined): number | null {
  if (!dob) return null;
  const b = new Date(dob);
  if (isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

export function genderLabel(g: string | null | undefined): string | null {
  if (!g) return null;
  const s = g.toLowerCase();
  if (s === "male") return "Male";
  if (s === "female") return "Female";
  if (s === "non-binary") return "Non-binary";
  return g;
}

export function unionLabel(u: string | null | undefined): string | null {
  if (!u) return null;
  const s = u.toLowerCase();
  if (s === "sag-aftra") return "SAG-AFTRA";
  if (s === "non-union") return "Non-union";
  if (s === "either") return "Union: either";
  return u;
}

/** Human summary of what a profile matches on. Markets come from the
 *  UNIVERSAL profiles.work_markets — pass them explicitly. */
export function describeProfile(
  p: PerformerProfile,
  universalMarkets?: string[] | null
): string[] {
  const parts: string[] = [];
  const g = genderLabel(p.gender);
  if (g) parts.push(g);
  const age = ageFromDob(p.date_of_birth);
  if (age != null) parts.push(`${age} yrs`);
  if (p.ethnicity?.length) parts.push(p.ethnicity.map(ethnicityShort).join(", "));
  const marketsForDisplay =
    (universalMarkets && universalMarkets.length > 0
      ? universalMarkets
      : p.markets) ?? [];
  if (marketsForDisplay.length) parts.push(marketsForDisplay.join(", "));
  const u = unionLabel(p.union_status);
  if (u) parts.push(u);
  return parts;
}
