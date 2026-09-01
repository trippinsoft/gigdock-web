// Insights money helpers. The RPC already separates cash-in-the-window
// (`received`) from work-date cohort outstanding. Gig payment status still
// has to cap paid at each gig's period earned so an overpayment cannot
// offset another gig. paid + outstanding = gross earned — never
// earnings − payments received.

import type { InsightsOverview } from "@/lib/backoffice-types";

export type CohortGig = {
  gross: number;
  received: number;
  outstanding?: number;
  paid?: number;
};

export function roundMoney(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Paid against this gig's period earnings. Never more than the gig earned. */
export function cappedGigPaid(gig: CohortGig): number {
  if (gig.paid != null && Number.isFinite(gig.paid)) return roundMoney(Math.max(0, gig.paid));
  return roundMoney(Math.max(0, Math.min(gig.gross ?? 0, gig.received ?? 0)));
}

export function gigOutstanding(gig: CohortGig): number {
  if (gig.outstanding != null && Number.isFinite(gig.outstanding)) {
    return roundMoney(Math.max(0, gig.outstanding));
  }
  return roundMoney(Math.max(0, (gig.gross ?? 0) - (gig.received ?? 0)));
}

export type GigPaymentStatus = {
  paid: number;
  outstanding: number;
  percent: number;
  grossEarned: number;
};

/** Work-date cohort payment status. Ignores `overview.received` (cash). */
export function gigPaymentStatus(overview: Pick<InsightsOverview, "gigs" | "gross_earned" | "outstanding" | "paid" | "paid_percent"> | null): GigPaymentStatus {
  const gigs = overview?.gigs ?? [];
  const grossEarned = roundMoney(overview?.gross_earned ?? 0);

  let paid: number;
  let outstanding: number;

  if (gigs.length > 0) {
    paid = roundMoney(gigs.reduce((s, g) => s + cappedGigPaid(g), 0));
    outstanding = roundMoney(gigs.reduce((s, g) => s + gigOutstanding(g), 0));
  } else if (overview?.paid != null && Number.isFinite(overview.paid)) {
    paid = roundMoney(Math.max(0, overview.paid));
    outstanding = roundMoney(overview.outstanding ?? Math.max(0, grossEarned - paid));
  } else {
    outstanding = roundMoney(overview?.outstanding ?? 0);
    paid = roundMoney(Math.max(0, grossEarned - outstanding));
  }

  const percent =
    overview?.paid_percent != null && gigs.length === 0
      ? overview.paid_percent
      : grossEarned > 0
        ? Math.round((paid / grossEarned) * 100)
        : 0;

  return { paid, outstanding, percent, grossEarned };
}

const MONTH_LETTERS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"] as const;

/** Year-view earnings trend: twelve month buckets, zeros included. */
export function fillYearTrend(
  trend: { date: string; gross: number }[] | null | undefined,
  year: number
): { label: string; value: number }[] {
  const byMonth = new Map<number, number>();
  for (const t of trend ?? []) {
    const y = Number(t.date.slice(0, 4));
    const m = Number(t.date.slice(5, 7));
    if (y === year && m >= 1 && m <= 12) byMonth.set(m, t.gross);
  }
  return MONTH_LETTERS.map((label, i) => ({ label, value: byMonth.get(i + 1) ?? 0 }));
}

export type CareerPatterns = {
  averagePerWorkday: number;
  topCompany: { name: string; gross: number } | null;
  topProject: { name: string; gross: number } | null;
};

export function careerPatterns(overview: Pick<InsightsOverview, "average_per_work_day" | "companies" | "projects"> | null): CareerPatterns {
  const companies = overview?.companies ?? [];
  const projects = overview?.projects ?? [];
  return {
    averagePerWorkday: overview?.average_per_work_day ?? 0,
    topCompany: companies[0] ? { name: companies[0].name || "No company", gross: companies[0].gross } : null,
    topProject: projects[0] ? { name: projects[0].name || "No project", gross: projects[0].gross } : null,
  };
}

export function periodCashLabel(mode: "month" | "year", label: string): string {
  return `Cash received during ${label}`;
}

export function periodStatusLabel(mode: "month" | "year", label: string): string {
  return mode === "year"
    ? `Current status of earnings from ${label} gigs`
    : `Current status of earnings from ${label} gigs`;
}
