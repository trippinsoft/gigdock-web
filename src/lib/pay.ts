// Faithful TypeScript port of the Postgres pay calculators
// (calc_base_rate_from_guarantee + calc_gig_date_gross_earned). Used ONLY for
// live UI previews while editing a day — the database remains the source of
// truth for stored earnings (all read surfaces compute earnings server-side via
// the same formulas). Keep this in exact sync with the SQL if the SQL changes.

export type PayType = "flatRate" | "dayRate" | "hourly" | "guaranteedMin";

/** Mirrors calc_base_rate_from_guarantee. */
export function baseRateFromGuarantee(
  guaranteePay: number,
  guaranteeHours: number,
  otStartsAfterHours: number,
  otMultiplier: number
): number {
  const G = guaranteePay || 0;
  const Hmin = guaranteeHours || 0;
  let Hot = otStartsAfterHours || 0;
  const m = otMultiplier || 1;

  if (Hot === 0) Hot = 8;
  if (Hmin <= 0) return 0;

  const regInBlock = Math.min(Hot, Hmin);
  const otInBlock = Math.max(0, Hmin - Hot);
  const weighted = regInBlock + otInBlock * m;
  if (weighted <= 0) return 0;

  return round(G / weighted, 4);
}

/** Mirrors calc_gig_date_gross_earned. Returns gross earned for one day
 * (base + bumps). Note: 'dayRate' falls through to the flat/other branch in SQL
 * (only 'guaranteedMin', 'hourly', 'flatRate' are special-cased). */
export function dayGrossEarned(input: {
  payType: PayType | null;
  hoursTotal: number;
  payMinimumAmount: number;
  payMinimumHours: number;
  payHourlyRate: number;
  otStartsAfterHours: number;
  otMultiplier: number;
  bumps: number;
}): number {
  const v = input.payType ?? "";
  const h = input.hoursTotal || 0;
  const minAmt = input.payMinimumAmount || 0;
  const minHrs = input.payMinimumHours || 0;
  const hourly = input.payHourlyRate || 0;
  let otStart = input.otStartsAfterHours || 0;
  const otMult = input.otMultiplier || 1;
  const bumps = input.bumps || 0;

  if (otStart === 0) otStart = 8;

  if (v === "guaranteedMin") {
    if (minHrs <= 0) return round(bumps, 2);
    const baseRate = baseRateFromGuarantee(minAmt, minHrs, otStart, otMult);
    let earned: number;
    if (h <= minHrs) earned = minAmt;
    else earned = minAmt + (h - minHrs) * baseRate * otMult;
    return round(earned + bumps, 2);
  }
  if (v === "hourly") {
    return round(h * hourly + bumps, 2);
  }
  if (v === "flatRate") {
    return round(minAmt + bumps, 2);
  }
  // dayRate and anything else: only bumps count per day (flat rate is applied
  // once at the gig level in the earned-amount roll-up).
  return round(bumps, 2);
}

function round(n: number, dp: number): number {
  const f = 10 ** dp;
  return Math.round((n + Number.EPSILON) * f) / f;
}
