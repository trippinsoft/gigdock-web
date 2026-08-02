// GigFit types. The MATCHING LOGIC lives server-side in the Postgres
// `gigfit(profile_id)` function (single source of truth for web, mobile, and
// the notification job). Call it via: supabase.rpc('gigfit', { p_profile_id }).
// These types describe the row shape it returns and the profile it reads.

export type GigFitTier = "ineligible" | "open" | "good" | "strong";

export type GigFitResult = {
  eligible: boolean;
  tier: GigFitTier;
  label: string;                        // "Strong match" | "Good match" | "Open call" | "Not eligible"
  color: "green" | "blue" | "zinc" | "amber";
  matched: string[];
  blockers: string[];
};

// One row returned by the gigfit() RPC.
export type GigFitRow = GigFitResult & { opportunity_id: string };

export type PerformerProfile = {
  id: string;
  label: string;
  markets: string[];
  gender: string | null;
  date_of_birth: string | null;
  union_status: string | null;
  work_types_wanted?: string[];
  pay_minimum?: number | null;
  skills?: string[];
  vehicles?: string[];
  notify_matches?: boolean;
};
