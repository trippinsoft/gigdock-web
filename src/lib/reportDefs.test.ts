// Audit buildReport against tester10's real 2026 payments
// (user a1609702-e82f-44d5-a3d5-70e7377d9d9b). Run: npx tsx src/lib/reportDefs.test.ts

import assert from "node:assert/strict";
import type { InsightsOverview } from "./backoffice-types";
import { money } from "./format";
import {
  buildReport,
  filterDocsByPeriod,
  isNetRecorded,
  paymentNetStats,
  type DocWithGig,
} from "./reportDefs";

/** tester10 gig_payments in 2026 (gross > 0, deleted_at null). */
const TESTER10_PAYMENTS = [
  { title: "July/Aug Gig", pay_date: "2026-07-02", gross: 600, net: 425.76 },
  { title: "Hardee's Commercial - Background Casting Call", pay_date: "2026-08-12", gross: 450, net: 375 },
  { title: "July/Aug Gig", pay_date: "2026-08-14", gross: 203, net: 0 },
  { title: "July/Aug Gig", pay_date: "2026-08-14", gross: 200, net: 0 },
  { title: "July/Aug Gig", pay_date: "2026-08-15", gross: 160, net: 0 },
  { title: "July/Aug Gig", pay_date: "2026-08-15", gross: 100, net: 0 },
  { title: "Rose Locke Casting - Lizard Music Stand In", pay_date: "2026-08-15", gross: 275, net: 0 },
  { title: "Rose Locke Casting - Lizard Music Stand In", pay_date: "2026-08-20", gross: 25, net: 100 },
] as const;

const YEAR_OVERVIEW: InsightsOverview = {
  gross_earned: 2013,
  net_recorded: 900.76,
  gigs_worked: 6,
  days_worked: 20,
  average_per_work_day: 100.65,
  paid_gigs: 3,
  net_complete_gigs: 1,
  net_complete: false,
  outstanding: 0,
  outstanding_gigs: 0,
  received: 2013,
  payment_count: 8,
  payment_gigs: 3,
  trend: [
    { date: "2026-02-01", gross: 0 },
    { date: "2026-06-01", gross: 0 },
    { date: "2026-07-01", gross: 600 },
    { date: "2026-08-01", gross: 1413 },
  ],
  payment_trend: [
    { date: "2026-07-01", received: 600 },
    { date: "2026-08-01", received: 1413 },
  ],
  payments: [...TESTER10_PAYMENTS],
  gigs: [
    { gig_id: "1", title: "Test Gig on Weekend 20-22", first_worked_date: "2026-02-21", last_worked_date: "2026-02-22", days_worked: 2, gross: 0, received: 0, outstanding: 0 },
    { gig_id: "2", title: "Test June Gig", first_worked_date: "2026-06-21", last_worked_date: "2026-06-25", days_worked: 5, gross: 0, received: 0, outstanding: 0 },
    { gig_id: "3", title: "July/Aug Gig", first_worked_date: "2026-07-08", last_worked_date: "2026-08-21", days_worked: 6, gross: 1263, received: 1263, outstanding: 0 },
    { gig_id: "4", title: "Hardee's Commercial - Background Casting Call", first_worked_date: "2026-08-11", last_worked_date: "2026-08-20", days_worked: 3, gross: 450, received: 450, outstanding: 0 },
    { gig_id: "5", title: "Feature Film Iron Jane - Bodybuilding Competition Attendees & Judges", first_worked_date: "2026-08-17", last_worked_date: "2026-08-25", days_worked: 2, gross: 0, received: 0, outstanding: 0 },
    { gig_id: "6", title: "Rose Locke Casting - Lizard Music Stand In", first_worked_date: "2026-08-26", last_worked_date: "2026-08-27", days_worked: 2, gross: 300, received: 300, outstanding: 0 },
  ],
  companies: [
    { id: "a", name: "Southgate Film Group", gross: 1263, gig_count: 2, days_worked: 11 },
    { id: "b", name: "Pine Ridge Casting", gross: 300, gig_count: 1, days_worked: 2 },
    { id: null, name: "No company", gross: 450, gig_count: 3, days_worked: 7 },
  ],
  projects: [],
  outstanding_items: [],
};

const YEAR_DOCS: DocWithGig[] = [
  { id: "1", user_id: "u", gig_id: null, project_id: null, payment_id: null, document_type: "pay_stub", display_name: "Paystub 1", storage_path: "", original_file_name: "", mime_type: "", file_size: 0, document_date: "2026-08-21", notes: null, created_at: "2026-08-21T00:00:00Z", gig: null },
  { id: "2", user_id: "u", gig_id: null, project_id: null, payment_id: null, document_type: "contract", display_name: "Gig contract", storage_path: "", original_file_name: "", mime_type: "", file_size: 0, document_date: "2026-08-21", notes: null, created_at: "2026-08-21T00:00:00Z", gig: null },
  { id: "3", user_id: "u", gig_id: null, project_id: null, payment_id: null, document_type: "receipt", display_name: "Travel expense", storage_path: "", original_file_name: "", mime_type: "", file_size: 0, document_date: "2026-08-21", notes: null, created_at: "2026-08-21T00:00:00Z", gig: null },
  { id: "4", user_id: "u", gig_id: "g", project_id: null, payment_id: null, document_type: "pay_stub", display_name: "Paystub 2", storage_path: "", original_file_name: "", mime_type: "", file_size: 0, document_date: "2026-08-21", notes: null, created_at: "2026-08-21T00:00:00Z", gig: { title: "Hylton Casting – Background Actors for Talbot Pines" } },
  { id: "5", user_id: "u", gig_id: "g2", project_id: null, payment_id: null, document_type: "voucher", display_name: "Voucher", storage_path: "", original_file_name: "", mime_type: "", file_size: 0, document_date: "2026-08-10", notes: null, created_at: "2026-08-10T00:00:00Z", gig: { title: "Feature Film Iron Jane" } },
] as DocWithGig[];

function fail(msg: string): never {
  throw new Error(msg);
}

{
  const stats = paymentNetStats(YEAR_OVERVIEW);
  assert.equal(stats.paymentCount, 8, "year payment count");
  assert.equal(stats.netComplete, 3, "year net recorded (425.76, 375, 100) — net 0 is missing");
  assert.equal(stats.missingNet, 5, "year missing net — not 8-1=7 from complete gigs");
  assert.equal(stats.received, 2013);
  assert.equal(Number(stats.recordedNet.toFixed(2)), 900.76);
  assert.equal(isNetRecorded(0), false);
  assert.equal(isNetRecorded(null), false);
  assert.equal(isNetRecorded(100), true);
}

{
  const r = buildReport("grossNet", YEAR_OVERVIEW, []);
  assert.equal(r.rows.length, 8, "Gross & Net year table lists every payment, not 2 monthly buckets");
  assert.equal(r.summary[0].label, "Gross paid");
  assert.equal(r.summary[2].value, "5 missing");
  assert.equal(r.summary[0].value, money(2013));
  assert.equal(r.summary[1].value, money(900.76));
  assert.deepEqual(r.columns, ["Date", "Gig", "Gross paid", "Recorded net"]);
  const notRecorded = r.rows.filter((row) => row[3] === "Not recorded");
  assert.equal(notRecorded.length, 5);
  assert.ok(r.note?.includes("8 payments"));
  // Old bug: payment_trend has 2 month rows; completeness used gigs → 7 missing
  assert.notEqual(r.rows.length, YEAR_OVERVIEW.payment_trend.length);
}

{
  const aug: InsightsOverview = {
    ...YEAR_OVERVIEW,
    payment_count: 7,
    received: 1413,
    net_recorded: 475,
    payments: TESTER10_PAYMENTS.filter((p) => p.pay_date.startsWith("2026-08")),
    payment_trend: [{ date: "2026-08-01", received: 1413 }],
  };
  const r = buildReport("grossNet", aug, []);
  assert.equal(r.rows.length, 7);
  assert.equal(r.summary[2].value, "5 missing");
  assert.equal(paymentNetStats(aug).netComplete, 2);
}

{
  const r = buildReport("payments", YEAR_OVERVIEW, []);
  assert.equal(r.summary[0].label, "Payments received");
  assert.equal(r.summary[0].value, money(2013));
  assert.equal(r.summary[1].value, "8");
  assert.equal(r.summary[2].value, money(900.76));
  assert.deepEqual(r.columns, ["Gig", "Date", "Gross", "Net"]);
  assert.equal(r.rows.length, 8, "Payments lists payment transactions only");
  assert.equal(r.rows.filter((row) => row[3] === "Not recorded").length, 5);
  assert.equal(r.summary.find((s) => s.label === "Earned"), undefined);
  assert.equal(r.summary.find((s) => s.label === "Outstanding"), undefined);
}

{
  const r = buildReport("earnings", YEAR_OVERVIEW, []);
  assert.equal(r.summary[2].value, "20");
  assert.equal(r.summary[3].value, "6");
  assert.deepEqual(r.columns, ["Gig", "Dates", "Work days", "Gross"]);
  assert.equal(r.rows.length, 6, "earnings lists every gig, not monthly buckets");
  assert.ok(r.note?.includes("gig"));
}

{
  // RPC rollups can disagree with the payment rows (worked-gig-scoped net).
  // Summaries must follow the displayed payment records.
  const mismatched: InsightsOverview = {
    ...YEAR_OVERVIEW,
    net_recorded: 475,
    received: 9999,
    net_complete_gigs: 1,
  };
  const gn = buildReport("grossNet", mismatched, []);
  const pay = buildReport("payments", mismatched, []);
  assert.equal(gn.summary[0].value, money(2013));
  assert.equal(gn.summary[1].value, money(900.76));
  assert.equal(gn.summary[2].value, "5 missing");
  assert.equal(pay.summary[0].value, gn.summary[0].value, "Gross paid equals Payments received");
  assert.equal(pay.summary[2].value, gn.summary[1].value, "Recorded net is the same payment-row sum");
  const sorted = [...TESTER10_PAYMENTS].sort((a, b) => a.pay_date.localeCompare(b.pay_date));
  assert.equal(gn.rows.length, sorted.length);
  for (let i = 0; i < sorted.length; i++) {
    assert.equal(gn.rows[i][2], money(sorted[i].gross), "gross belongs to this payment row");
    assert.equal(
      gn.rows[i][3],
      sorted[i].net > 0 ? money(sorted[i].net) : "Not recorded",
      "net belongs to the same payment row as gross"
    );
  }
}

{
  const r = buildReport("gigs", YEAR_OVERVIEW, []);
  assert.equal(r.summary[0].value, "6");
  assert.equal(r.rows.length, 6);
}

{
  const r = buildReport("companies", YEAR_OVERVIEW, []);
  assert.equal(r.summary[0].value, "3");
  assert.equal(r.rows.length, 3);
}

{
  const docs = filterDocsByPeriod(YEAR_DOCS, "year", "2026");
  assert.equal(docs.length, 5);
  const r = buildReport("documents", YEAR_OVERVIEW, docs);
  assert.equal(r.summary[0].value, "5");
  assert.equal(r.rows.length, 5);
}

{
  const r = buildReport("expenses", YEAR_OVERVIEW, []);
  assert.equal(r.rows.length, 0);
  assert.equal(r.summary[0].value, "No data recorded");
}

{
  const r = buildReport("taxReady", YEAR_OVERVIEW, filterDocsByPeriod(YEAR_DOCS, "year", "2026"));
  const netRow = r.rows.find((row) => row[0] === "Net completeness") ?? fail("missing net row");
  assert.equal(netRow[1], "Partial data");
  assert.equal(netRow[2], "Net recorded for 3 of 8 applicable payments");
  const payRow = r.rows.find((row) => row[0] === "Payment summary") ?? fail("missing payment row");
  assert.equal(payRow[1], "8 payments");
  const taxRow = r.rows.find((row) => row[0] === "Tax documents") ?? fail("missing tax documents row");
  assert.equal(taxRow[1], "No data", "pay stubs / receipts / vouchers / contracts are not tax documents");
  assert.equal(taxRow[2], "No tax documents recorded");
  assert.equal(r.rows.find((row) => row[0] === "Documents"), undefined);
}

{
  const withTax: DocWithGig[] = [
    ...YEAR_DOCS,
    { id: "6", user_id: "u", gig_id: null, project_id: null, payment_id: null, document_type: "w2", display_name: "W-2 2026", storage_path: "", original_file_name: "", mime_type: "", file_size: 0, document_date: "2026-01-31", notes: null, created_at: "2026-02-01T00:00:00Z", gig: null },
    { id: "7", user_id: "u", gig_id: null, project_id: null, payment_id: null, document_type: "other_tax_document", display_name: "1099-NEC packet", storage_path: "", original_file_name: "", mime_type: "", file_size: 0, document_date: "2026-02-01", notes: null, created_at: "2026-02-01T00:00:00Z", gig: null },
  ];
  const r = buildReport("taxReady", YEAR_OVERVIEW, filterDocsByPeriod(withTax, "year", "2026"));
  const taxRow = r.rows.find((row) => row[0] === "Tax documents") ?? fail("missing tax documents row");
  assert.equal(taxRow[1], "2 recorded");
  assert.equal(taxRow[2], "1 W-2, 1 Other Tax Document");
  const docsReport = buildReport("documents", YEAR_OVERVIEW, filterDocsByPeriod(withTax, "year", "2026"));
  assert.equal(docsReport.summary[0].value, "7", "the Documents report still lists every file");
}

console.log("reportDefs tester10 year/month audit: all reports match payment-level units");
