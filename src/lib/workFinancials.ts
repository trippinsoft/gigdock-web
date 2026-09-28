// Pure, client-safe expense/mileage helpers. TypeScript port of the mobile
// utils/workFinancials.js on gigvault (origin/main). Keep the two in lockstep
// — categories, rate lookup rules, currency formatting, and the summary shape
// all need to match so mobile and web read the same numbers from the shared
// `work_expenses`, `work_mileage`, and `business_mileage_rates` tables.
//
// Nothing in here touches Supabase or React. It is imported both from
// server-only backoffice helpers and from client components.

/** Stable category keys for `work_expenses.category_key` with their
 *  customer-facing labels. Order matches mobile. Adding a category is a UI
 *  change in the two client apps plus a category-label mapping bump; the
 *  backend accepts any non-empty token. */
export const EXPENSE_CATEGORIES = [
  ["parking_tolls", "Parking & Tolls"],
  ["travel", "Travel"],
  ["meals", "Meals"],
  ["equipment", "Equipment"],
  ["wardrobe_appearance", "Wardrobe & Appearance"],
  ["supplies", "Supplies"],
  ["software_subscriptions", "Software & Subscriptions"],
  ["professional_services", "Professional Services"],
  ["fees", "Fees"],
  ["other", "Other"],
] as const;

export type ExpenseCategoryKey = (typeof EXPENSE_CATEGORIES)[number][0];

export function categoryLabel(key: string | null | undefined): string {
  return EXPENSE_CATEGORIES.find(([value]) => value === key)?.[1] ?? "Other";
}

/** Locale-aware currency formatter. Kept in-app so no NumberFormat drift
 *  between server and client renders. */
export function money(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
}

export interface BusinessMileageRate {
  effective_from: string; // YYYY-MM-DD inclusive
  effective_to: string; // YYYY-MM-DD exclusive
  rate_per_mile: number;
  source_url: string | null;
}

/** Pick the rate row whose [effective_from, effective_to) window contains
 *  `date`. Returns null when no row matches (future date past our latest
 *  known IRS row, historical gap, etc.) — never fall back to a stale
 *  hardcoded rate. */
export function rateForDate(
  rates: BusinessMileageRate[] | null | undefined,
  date: string | null | undefined,
): BusinessMileageRate | null {
  if (!date) return null;
  return (
    (rates ?? []).find(
      (r) => date >= r.effective_from && date < r.effective_to,
    ) ?? null
  );
}

/** Miles × applicable rate, rounded to two decimals. Null when there is
 *  no rate row for the trip date. */
export function potentialMileageDeduction(
  miles: number | string | null | undefined,
  date: string | null | undefined,
  rates: BusinessMileageRate[] | null | undefined,
): number | null {
  const r = rateForDate(rates, date);
  if (!r) return null;
  const n = Number(miles ?? 0);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * Number(r.rate_per_mile) * 100) / 100;
}

export interface WorkExpenseLike {
  amount: number | string | null;
  category_key?: string | null;
}
export interface WorkMileageLike {
  miles: number | string | null;
  trip_date: string | null;
}

export interface WorkFinancialsSummary {
  /** Sum of active expense amounts in the requested window. */
  actualExpenses: number;
  /** Sum of active business miles in the requested window. */
  businessMiles: number;
  /** Category totals keyed by `category_key`. */
  categoryTotals: Record<string, number>;
  /** Miles × rate per trip. Null when ANY trip in the window has no
   *  applicable rate row — we never partially compute a deduction. */
  potentialDeduction: number | null;
  /** gross - actualExpenses. Null when no gross was passed. Business
   *  mileage NEVER reduces this. */
  netBeforeTaxes: number | null;
}

/** Roll up expenses + mileage + rates into the shape the panels render.
 *  Mirrors mobile summarizeWorkFinancials exactly. */
export function summarizeWorkFinancials(
  expenses: WorkExpenseLike[] | null | undefined,
  mileage: WorkMileageLike[] | null | undefined,
  rates: BusinessMileageRate[] | null | undefined,
  gross: number | null = null,
): WorkFinancialsSummary {
  const actualExpenses = (expenses ?? []).reduce(
    (sum, item) => sum + Number(item?.amount ?? 0),
    0,
  );
  const businessMiles = (mileage ?? []).reduce(
    (sum, item) => sum + Number(item?.miles ?? 0),
    0,
  );
  const categoryTotals: Record<string, number> = {};
  for (const item of expenses ?? []) {
    const key = item?.category_key || "other";
    categoryTotals[key] =
      (categoryTotals[key] ?? 0) + Number(item?.amount ?? 0);
  }
  const ratedTrips = (mileage ?? []).map((item) =>
    potentialMileageDeduction(item?.miles, item?.trip_date, rates),
  );
  const hasUnratedMiles = ratedTrips.some((v) => v === null);
  const potentialDeduction = hasUnratedMiles
    ? null
    : Math.round(
        (ratedTrips as number[]).reduce((sum, v) => sum + v, 0) * 100,
      ) / 100;
  return {
    actualExpenses: Math.round(actualExpenses * 100) / 100,
    businessMiles: Math.round(businessMiles * 100) / 100,
    categoryTotals,
    potentialDeduction,
    netBeforeTaxes:
      gross === null
        ? null
        : Math.round((Number(gross) - actualExpenses) * 100) / 100,
  };
}

/** Short label for a record's Gig association. Falls back to "General
 *  business" for `gig_id=null` entries so both audiences read the same. */
export function gigAssociationLabel(
  gig: { title?: string | null; project_title?: string | null } | null,
  fallback = "General business",
): string {
  if (!gig) return fallback;
  const project = gig.project_title ? `${gig.project_title} — ` : "";
  return `${project}${gig.title || "Gig"}`;
}

/** Format an integer or fractional mile count. Mirrors mobile
 *  `${miles.toLocaleString()} mi` treatment. */
export function milesLabel(miles: number | string | null | undefined): string {
  const n = Number(miles ?? 0);
  const rounded = Math.round(n * 100) / 100;
  return `${rounded.toLocaleString()} mi`;
}
