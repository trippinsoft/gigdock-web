// GigFit — evaluate how well an opportunity matches a performer profile.
// Gate criteria (location, gender, age, union, optional pay floor) determine
// ELIGIBILITY. If any gate conflicts, the gig is "not eligible" and hidden from
// the matched view. Among eligible gigs, the tier reflects how many of the
// call's STATED requirements the performer specifically matches.
//
// Guiding rule: an UNSPECIFIED field (on either the gig or the profile) never
// disqualifies — it just doesn't earn match credit.

export type CastingCriteria = {
  gender?: string[];          // ["female"] etc; [] / undefined = any
  age_min?: number;
  age_max?: number;
  ethnicity?: string[];
  union_status?: string;      // "sag-aftra" | "non-union" | "either"
  work_type?: string;
  skills?: string[];
  vehicle?: string[];
};

export type MatchableOpportunity = {
  match_state: string | null;
  pay_min: number | null;
  casting_specs: CastingCriteria | null;
};

export type PerformerProfile = {
  markets: string[];
  gender: string | null;
  date_of_birth: string | null;
  union_status: string | null;
  work_types_wanted?: string[];
  pay_minimum?: number | null;
  skills?: string[];
  vehicles?: string[];
};

export type GigFitTier = "ineligible" | "open" | "good" | "strong";

export type GigFitResult = {
  eligible: boolean;
  tier: GigFitTier;
  label: string;                       // "Strong match" | "Good match" | "Open call" | "Not eligible"
  color: "green" | "blue" | "zinc" | "amber";
  matched: string[];                   // criteria the performer positively matched
  blockers: string[];                  // reasons for ineligibility
};

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

export function evaluateGigFit(
  opp: MatchableOpportunity,
  profile: PerformerProfile
): GigFitResult {
  const c: CastingCriteria = opp.casting_specs ?? {};
  const matched: string[] = [];
  const blockers: string[] = [];

  // ── Gate: location / market ──────────────────────────────────────
  // Only gates when BOTH the gig states a state AND the user restricted markets.
  if (opp.match_state && profile.markets.length > 0) {
    if (profile.markets.includes(opp.match_state)) matched.push("location");
    else blockers.push(`Location (${opp.match_state}) not in your markets`);
  }

  // ── Gate: gender ─────────────────────────────────────────────────
  if (c.gender && c.gender.length > 0 && profile.gender) {
    if (c.gender.includes(profile.gender)) matched.push("gender");
    else blockers.push("Gender doesn't match");
  }

  // ── Gate: age ────────────────────────────────────────────────────
  const age = ageFromDob(profile.date_of_birth);
  if ((c.age_min != null || c.age_max != null) && age != null) {
    const okMin = c.age_min == null || age >= c.age_min;
    const okMax = c.age_max == null || age <= c.age_max;
    if (okMin && okMax) matched.push("age");
    else blockers.push("Age outside range");
  }

  // ── Gate: union ──────────────────────────────────────────────────
  if (
    c.union_status && c.union_status !== "either" &&
    profile.union_status && profile.union_status !== "either"
  ) {
    if (profile.union_status === c.union_status) matched.push("union");
    else blockers.push("Union status doesn't match");
  }

  // ── Optional gate: pay floor (only if the user set one) ───────────
  if (
    profile.pay_minimum != null &&
    opp.pay_min != null &&
    opp.pay_min < profile.pay_minimum
  ) {
    blockers.push(`Pay ($${opp.pay_min}) below your $${profile.pay_minimum} minimum`);
  }

  // ── Eligibility ──────────────────────────────────────────────────
  if (blockers.length > 0) {
    return {
      eligible: false,
      tier: "ineligible",
      label: "Not eligible",
      color: "amber",
      matched,
      blockers,
    };
  }

  // ── Bonus matches (add fit, never block) ─────────────────────────
  if (c.work_type && profile.work_types_wanted?.includes(c.work_type)) {
    matched.push("type");
  }
  if (c.skills?.length && profile.skills?.length &&
      c.skills.some((s) => profile.skills!.includes(s))) {
    matched.push("skill");
  }
  if (c.vehicle?.length && profile.vehicles?.length &&
      c.vehicle.some((v) => profile.vehicles!.includes(v))) {
    matched.push("vehicle");
  }

  // ── Tier by specificity of the match ─────────────────────────────
  const hasSpecial = matched.includes("skill") || matched.includes("vehicle");
  let tier: GigFitTier;
  if (hasSpecial || matched.length >= 3) tier = "strong";
  else if (matched.length >= 1) tier = "good";
  else tier = "open";

  const label =
    tier === "strong" ? "Strong match" :
    tier === "good" ? "Good match" :
    "Open call";
  const color: GigFitResult["color"] =
    tier === "strong" ? "green" :
    tier === "good" ? "blue" :
    "zinc";

  return { eligible: true, tier, label, color, matched, blockers };
}
