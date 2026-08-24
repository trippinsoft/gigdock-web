// Client-safe predicates mirroring the load_filtered_gigs bucket logic, so the
// master list can filter and count instantly in-memory. Keep in sync with the
// SQL (load_filtered_gigs / load_needs_attention).

import type { FilteredGig, GigFilter } from "./backoffice-types";

export type PayStatus = "paid" | "partial" | "unpaid";

export function paymentStatusOf(g: {
  user_marked_paid: boolean;
  earned_total?: number | null;
  total_paid?: number | null;
}): PayStatus {
  if (g.user_marked_paid) return "paid";
  const earned = g.earned_total ?? 0;
  const paid = g.total_paid ?? 0;
  if (paid <= 0) return "unpaid";
  if (earned > 0 && paid >= earned) return "paid";
  return "partial";
}

export function inBucket(g: FilteredGig, bucket: GigFilter): boolean {
  const earned = g.earned_total ?? 0;
  const paid = g.total_paid ?? 0;
  if (bucket === "payments_due") return !g.is_unpaid && earned > paid;
  if (bucket === "missing_dates") return (g.gig_date_count ?? 0) === 0;
  // missing_payment: gig isn't unpaid, but its pay model is incomplete.
  if (g.is_unpaid) return false;
  const pt = g.pay_type;
  if (!pt) return true;
  if ((pt === "flatRate" || pt === "dayRate") && !(g.pay_flat_rate ?? 0)) return true;
  if (pt === "hourly" && !(g.pay_hourly_rate ?? 0)) return true;
  if (pt === "guaranteedMin" && (!(g.pay_minimum_amount ?? 0) || !(g.pay_minimum_hours ?? 0))) return true;
  return false;
}

export function bucketCounts(gigs: FilteredGig[]): Record<GigFilter, number> {
  return {
    payments_due: gigs.filter((g) => inBucket(g, "payments_due")).length,
    missing_payment: gigs.filter((g) => inBucket(g, "missing_payment")).length,
    missing_dates: gigs.filter((g) => inBucket(g, "missing_dates")).length,
  };
}
