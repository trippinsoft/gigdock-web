// GigFit types + profile display helpers.
//
// The MATCHING LOGIC lives server-side in the Postgres `gigfit(profile_id)`
// function (single source of truth for web, mobile, and the notification job).
// Call it via: supabase.rpc('gigfit', { p_profile_id }).
// Everything here is types and presentation helpers only.

export type GigFitTier = "ineligible" | "open" | "good" | "strong";

export type GigFitResult = {
  eligible: boolean;
  tier: GigFitTier;
  label: string;
  color: "green" | "blue" | "zinc" | "amber";
  matched: string[];
  blockers: string[];
};

/** One row returned by the gigfit() RPC. */
export type GigFitRow = GigFitResult & { opportunity_id: string };

export type PerformerProfile = {
  id: string;
  label: string;
  markets: string[];
  gender: string | null;
  date_of_birth: string | null;
  union_status: string | null;
  ethnicity?: string[];
  /** Total height in inches (e.g. 5'10" = 70). Collected now; matched later. */
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
/** Short form for compact summaries: "Black / African American" -> "Black". */
function ethnicityShort(slug: string): string {
  return ethnicityLabel(slug).split(" / ")[0];
}

/** Total inches -> feet'inches" (e.g. 70 -> 5'10"). */
export function heightLabel(inches: number | null | undefined): string | null {
  if (inches == null || inches <= 0) return null;
  return `${Math.floor(inches / 12)}'${inches % 12}"`;
}

/* ---------- profile completeness ---------- */

export type ProfileFieldKey =
  | "markets"
  | "gender"
  | "ethnicity"
  | "date_of_birth"
  | "union_status";

/** Ordered by matching leverage — markets filters hardest, so nudge it first.
    Only fields GigFit actually matches on count here (height/weight don't yet). */
export const PROFILE_FIELD_ORDER: ProfileFieldKey[] = [
  "markets",
  "gender",
  "ethnicity",
  "date_of_birth",
  "union_status",
];

export const PROFILE_FIELD_LABELS: Record<ProfileFieldKey, string> = {
  markets: "markets",
  gender: "gender",
  ethnicity: "ethnicity",
  date_of_birth: "age",
  union_status: "union status",
};

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

/** Human summary of what a profile actually matches on: ["Female","34","GA, NY"] */
export function describeProfile(p: PerformerProfile): string[] {
  const parts: string[] = [];
  const g = genderLabel(p.gender);
  if (g) parts.push(g);
  const age = ageFromDob(p.date_of_birth);
  if (age != null) parts.push(`${age} yrs`);
  if (p.ethnicity?.length) parts.push(p.ethnicity.map(ethnicityShort).join(", "));
  if (p.markets?.length) parts.push(p.markets.join(", "));
  const u = unionLabel(p.union_status);
  if (u) parts.push(u);
  return parts;
}
