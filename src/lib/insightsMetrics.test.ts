// Gig payment status must cap paid per gig and keep cash received separate.
// Run: npx tsx src/lib/insightsMetrics.test.ts

import assert from "node:assert/strict";
import type { InsightsOverview } from "./backoffice-types";
import {
  cappedGigPaid,
  careerPatterns,
  fillYearTrend,
  gigPaymentStatus,
  roundMoney,
} from "./insightsMetrics";

function fail(msg: string): never {
  throw new Error(msg);
}

{
  // Overpayment on one gig must not reduce outstanding on another.
  const overview = {
    gross_earned: 3294.37,
    outstanding: 2906.37,
    received: 1728, // cash in 2026 — must not be used as "paid"
    gigs: [
      { gig_id: "overpaid", title: "Overpaid gig", first_worked_date: "2026-02-01", last_worked_date: "2026-02-02", days_worked: 2, gross: 363, received: 1103, outstanding: 0 },
      { gig_id: "unpaid", title: "Mostly unpaid", first_worked_date: "2026-08-01", last_worked_date: "2026-08-20", days_worked: 18, gross: 2931.37, received: 25, outstanding: 2906.37 },
    ],
  } as InsightsOverview;

  assert.equal(cappedGigPaid(overview.gigs[0]), 363);
  assert.equal(cappedGigPaid(overview.gigs[1]), 25);

  const status = gigPaymentStatus(overview);
  assert.equal(status.paid, 388);
  assert.equal(status.outstanding, 2906.37);
  assert.equal(roundMoney(status.paid + status.outstanding), 3294.37);
  assert.equal(status.percent, 12);
  assert.notEqual(status.paid, overview.received, "paid is not cash received");
  assert.notEqual(roundMoney(overview.gross_earned - overview.received), status.outstanding, "earnings − payments received is not outstanding");
}

{
  // RPC `paid` is trusted when there are no gig rows (empty / fallback).
  const status = gigPaymentStatus({
    gross_earned: 300,
    paid: 300,
    outstanding: 0,
    paid_percent: 100,
    gigs: [],
  });
  assert.equal(status.paid, 300);
  assert.equal(status.outstanding, 0);
  assert.equal(status.percent, 100);
}

{
  // Rose Locke style: fully paid bump-only gig must not invent extra earned.
  const status = gigPaymentStatus({
    gross_earned: 300,
    outstanding: 0,
    received: 300,
    gigs: [
      { gig_id: "rose", title: "Rose Locke", first_worked_date: "2026-08-26", last_worked_date: "2026-08-27", days_worked: 2, gross: 300, received: 300, outstanding: 0 },
    ],
  } as InsightsOverview);
  assert.equal(status.paid, 300);
  assert.equal(status.outstanding, 0);
  assert.equal(status.grossEarned, 300);
}

{
  const bars = fillYearTrend(
    [
      { date: "2026-02-01", gross: 441.82 },
      { date: "2026-06-01", gross: 1054.55 },
      { date: "2026-07-01", gross: 38 },
      { date: "2026-08-01", gross: 1760 },
    ],
    2026
  );
  assert.equal(bars.length, 12);
  assert.deepEqual(bars.map((b) => b.label).join(""), "JFMAMJJASOND");
  assert.equal(bars[0].value, 0);
  assert.equal(bars[1].value, 441.82);
  assert.equal(bars[5].value, 1054.55);
  assert.equal(bars[6].value, 38);
  assert.equal(bars[7].value, 1760);
  assert.equal(bars[11].value, 0);
}

{
  const career = careerPatterns({
    average_per_work_day: 164.72,
    companies: [
      { id: null, name: "No company", gross: 1577, gig_count: 3, days_worked: 10 },
      { id: "a", name: "A Studio", gross: 400, gig_count: 1, days_worked: 2 },
    ],
    projects: [
      { id: null, name: "No project", gross: 1135, gig_count: 2, days_worked: 6 },
    ],
  });
  assert.equal(career.averagePerWorkday, 164.72);
  if (!career.topCompany) fail("expected top company");
  assert.equal(career.topCompany.name, "No company");
  assert.equal(career.topCompany.gross, 1577);
  if (!career.topProject) fail("expected top project");
  assert.equal(career.topProject.name, "No project");
  assert.equal(career.topProject.gross, 1135);
}

console.log("insightsMetrics: capped paid, year trend, career patterns ok");
