// Report catalog + buildReport — the web port of the mobile reportDefinitions.js
// and ReportDetailScreen.buildReport(). Pure/server-safe: maps an
// InsightsOverview (+ documents for the documents/taxReady reports) into summary
// cards and a table, matching the mobile columns/rows exactly.

import { money } from "@/lib/format";
import type { InsightsOverview, DocumentRow } from "@/lib/backoffice-types";
import { documentTypeLabel, filterTaxDocuments, documentTypeBreakdown } from "@/lib/documentTypes";

export type ReportId =
  | "earnings" | "payments" | "grossNet" | "gigs" | "companies" | "expenses" | "documents" | "taxReady";

export type DocWithGig = DocumentRow & { gig: { title: string } | null };

export const REPORT_GROUPS: { group: string; reports: { id: ReportId; title: string; description: string }[] }[] = [
  {
    group: "Financial",
    reports: [
      { id: "earnings", title: "Earnings Summary", description: "Earnings, work activity, bumps and monthly totals" },
      { id: "payments", title: "Payments", description: "Payments received in the selected period" },
      { id: "grossNet", title: "Gross & Net", description: "Recorded gross and net completeness" },
    ],
  },
  {
    group: "Work",
    reports: [
      { id: "gigs", title: "Gig History", description: "Worked gigs, dates and earnings" },
      { id: "companies", title: "By Company", description: "Gig and earnings activity by company" },
    ],
  },
  {
    group: "Records",
    reports: [
      { id: "expenses", title: "Expenses & Mileage", description: "Recorded costs and mileage when available" },
      { id: "documents", title: "Documents", description: "Stored documents and connected gig records" },
    ],
  },
];

type PreviewKind = "trend" | "list" | "text";
type ReportMeta = {
  title: string;
  defaultMode: "month" | "year";
  previewKind: PreviewKind;
  previewRows?: number;
  preview: { heading: string; title: string; copy: string };
};

export const REPORT_META: Record<ReportId, ReportMeta> = {
  earnings: {
    title: "Earnings Summary", defaultMode: "month", previewKind: "trend",
    preview: { heading: "Earnings Trend", title: "Unlock your complete Earnings Report", copy: "See earnings over time, monthly breakdowns, historical trends and exportable reports with GigDock Pro." },
  },
  payments: {
    title: "Payments", defaultMode: "month", previewKind: "text",
    preview: { heading: "Payment Analysis", title: "Unlock your complete Payment Report", copy: "Analyze payment history, outstanding earnings and payment patterns with GigDock Pro." },
  },
  grossNet: {
    title: "Gross & Net", defaultMode: "month", previewKind: "trend",
    preview: { heading: "Gross vs Net Trend", title: "Unlock your complete Gross & Net Report", copy: "Compare recorded Gross and Net over time, review completeness and export detailed reports with GigDock Pro." },
  },
  gigs: {
    title: "Gig History", defaultMode: "year", previewKind: "list", previewRows: 3,
    preview: { heading: "Complete Gig History", title: "Unlock your complete Gig History", copy: "Turn your GigDock records into a detailed, exportable history of your work." },
  },
  companies: {
    title: "By Company", defaultMode: "year", previewKind: "list", previewRows: 1,
    preview: { heading: "Complete Company Analysis", title: "Unlock Company Analysis", copy: "Understand where you work, what you earn and how companies pay you." },
  },
  expenses: {
    title: "Expenses & Mileage", defaultMode: "year", previewKind: "text",
    preview: { heading: "Complete Expense & Mileage Report", title: "Unlock your complete Expense & Mileage Report", copy: "See categories, trends, related gigs and exportable records with GigDock Pro." },
  },
  documents: {
    title: "Documents", defaultMode: "year", previewKind: "list", previewRows: 3,
    preview: { heading: "Complete Documents Report", title: "Unlock your complete Documents Report", copy: "Review and export an organized record of your GigDock documents." },
  },
  taxReady: {
    title: "Tax Ready Report", defaultMode: "year", previewKind: "list",
    preview: { heading: "Tax Ready Report", title: "Unlock Tax Ready", copy: "Organize your year's records for tax time with GigDock Pro." },
  },
};

export function isReportId(v: string): v is ReportId {
  return v in REPORT_META;
}

export type BuiltReport = {
  summary: { label: string; value: string }[]; // [0] is the hero card
  columns: string[];
  rows: (string | number)[][];
  emptyText: string;
  note?: string;
};

function dateText(v: string | null | undefined): string {
  if (!v) return "—";
  const [y, m, d] = v.slice(0, 10).split("-");
  return `${Number(m)}/${Number(d)}/${y}`;
}

/** Product rule: we never estimate missing net. `0` and `null` both mean
 * "not recorded" — a real take-home of $0 is not something GigDock infers. */
export function isNetRecorded(net: number | null | undefined): boolean {
  return net != null && Number(net) > 0;
}

export type PeriodPayment = NonNullable<InsightsOverview["payments"]>[number];

/** Payments in the selected period with gross > 0 (same filter as the RPC). */
export function periodPayments(data: InsightsOverview | null): PeriodPayment[] {
  return (data?.payments ?? []).filter((p) => (p.gross ?? 0) > 0);
}

/** Completeness for the same unit the Gross & Net / Payments tables show:
 * payments in the selected period, not complete gigs. */
export function paymentNetStats(data: InsightsOverview | null): {
  payments: PeriodPayment[];
  paymentCount: number;
  netComplete: number;
  missingNet: number;
  received: number;
  recordedNet: number;
} {
  const payments = periodPayments(data);
  const netComplete = payments.filter((p) => isNetRecorded(p.net)).length;
  return {
    payments,
    paymentCount: payments.length,
    netComplete,
    missingNet: Math.max(0, payments.length - netComplete),
    received: payments.reduce((s, p) => s + Number(p.gross ?? 0), 0),
    recordedNet: payments.reduce((s, p) => s + (isNetRecorded(p.net) ? Number(p.net) : 0), 0),
  };
}

function netCell(net: number | null | undefined): string {
  return isNetRecorded(net) ? money(Number(net)) : "Not recorded";
}

export function buildReport(
  id: ReportId,
  data: InsightsOverview | null,
  docs: DocWithGig[],
  _now: number = Date.now()
): BuiltReport {
  const grossEarned = data?.gross_earned ?? 0;
  const outstanding = data?.outstanding ?? 0;
  const { payments, paymentCount, netComplete, missingNet, received, recordedNet } = paymentNetStats(data);
  const num = (n: number | undefined | null) => String(n ?? 0);

  switch (id) {
    case "earnings":
      return {
        summary: [
          { label: "Gross earned", value: money(grossEarned) },
          { label: "Recorded net", value: money(recordedNet) },
          { label: "Work days", value: num(data?.days_worked) },
          { label: "Gigs worked", value: num(data?.gigs_worked) },
        ],
        columns: ["Gig", "Dates", "Work days", "Gross"],
        rows: (data?.gigs ?? []).map((g) => [
          g.title || "Untitled gig",
          `${dateText(g.first_worked_date)} – ${dateText(g.last_worked_date)}`,
          g.days_worked || 0, money(g.gross),
        ]),
        emptyText: "No records found for this period",
        note: "Each row is a gig with worked days in this period. Gross is earned on those days.",
      };

    case "payments": {
      return {
        summary: [
          { label: "Payments received", value: money(received) },
          { label: "Payments", value: num(paymentCount) },
          { label: "Recorded net", value: money(recordedNet) },
        ],
        columns: ["Gig", "Date", "Gross", "Net"],
        rows: [...payments]
          .sort((a, b) => (a.pay_date ?? "").localeCompare(b.pay_date ?? ""))
          .map((p) => [p.title || "Payment", dateText(p.pay_date), money(p.gross), netCell(p.net)]),
        emptyText: "No records found for this period",
        note: `${paymentCount} payment${paymentCount === 1 ? "" : "s"} in this period. Gross sums to Payments received. Net of $0 is treated as not recorded.`,
      };
    }

    case "grossNet":
      return {
        summary: [
          { label: "Gross paid", value: money(received) },
          { label: "Recorded net", value: money(recordedNet) },
          { label: "Net completeness", value: missingNet ? `${missingNet} missing` : "Complete" },
        ],
        columns: ["Date", "Gig", "Gross paid", "Recorded net"],
        rows: [...payments]
          .sort((a, b) => (a.pay_date ?? "").localeCompare(b.pay_date ?? ""))
          .map((p) => [dateText(p.pay_date), p.title || "Payment", money(p.gross), netCell(p.net)]),
        emptyText: "No records found for this period",
        note: `${paymentCount} payment${paymentCount === 1 ? "" : "s"} in this period · net recorded on ${netComplete}. Gross paid equals Payments received for the same period. Net of $0 is treated as not recorded.`,
      };

    case "gigs":
      return {
        summary: [
          { label: "Gigs worked", value: num(data?.gigs_worked) },
          { label: "Work days", value: num(data?.days_worked) },
          { label: "Gross earned", value: money(grossEarned) },
        ],
        columns: ["Gig", "Dates", "Work days", "Gross"],
        rows: (data?.gigs ?? []).map((g) => [
          g.title || "Untitled gig",
          `${dateText(g.first_worked_date)} – ${dateText(g.last_worked_date)}`,
          g.days_worked || 0, money(g.gross),
        ]),
        emptyText: "No records found for this period",
      };

    case "companies":
      return {
        summary: [
          { label: "Companies", value: num(data?.companies?.length) },
          { label: "Gigs worked", value: num(data?.gigs_worked) },
          { label: "Gross earned", value: money(grossEarned) },
        ],
        columns: ["Company", "Gigs", "Work days", "Gross"],
        rows: (data?.companies ?? []).map((c) => [c.name || "No company", c.gig_count || 0, c.days_worked || 0, money(c.gross)]),
        emptyText: "No records found for this period",
      };

    case "documents":
      return {
        summary: [{ label: "Documents stored", value: num(docs.length) }],
        columns: ["Document", "Type", "Date", "Connected gig"],
        rows: docs.map((d) => [d.display_name, documentTypeLabel(d.document_type), dateText(d.document_date), d.gig?.title || "Personal"]),
        emptyText: "No records found for this period",
      };

    case "expenses":
      return {
        summary: [
          { label: "Expenses", value: "No data recorded" },
          { label: "Mileage", value: "No data recorded" },
        ],
        columns: ["Record", "Status"],
        rows: [],
        emptyText: "No expenses or mileage recorded yet",
      };

    case "taxReady": {
      const netStatus = missingNet ? "Partial data" : paymentCount ? "Looks good" : "No data";
      const taxDocs = filterTaxDocuments(docs);
      const taxDetails = taxDocs.length
        ? documentTypeBreakdown(taxDocs)
        : "No tax documents recorded";
      return {
        summary: [
          { label: "Gross earnings", value: money(grossEarned) },
          { label: "Recorded net", value: money(recordedNet) },
          { label: "Gigs", value: num(data?.gigs_worked) },
          { label: "Work days", value: num(data?.days_worked) },
        ],
        columns: ["Area", "Recorded status", "Details"],
        rows: [
          ["Work summary", `${data?.gigs_worked || 0} gigs`, `${data?.days_worked || 0} work days · ${money(grossEarned)} gross`],
          ["Payment summary", `${paymentCount} payments`, `${money(received)} received · ${money(outstanding)} outstanding`],
          ["Net completeness", netStatus, `Net recorded for ${netComplete} of ${paymentCount} applicable payments`],
          ["Expenses", "No data", "No expenses recorded yet"],
          ["Mileage", "No data", "No mileage recorded"],
          ["Tax documents", taxDocs.length ? `${taxDocs.length} recorded` : "No data", taxDetails],
        ],
        emptyText: "No records found for this period",
        note: "GigDock organizes your records but does not prepare or file tax returns. Missing values are never estimated. Net of $0 is treated as not recorded.",
      };
    }
  }
}

/** Documents whose document_date (or created_at) fall in the selected period. */
export function filterDocsByPeriod(docs: DocWithGig[], mode: "month" | "year", period: string): DocWithGig[] {
  return docs.filter((d) => {
    const key = (d.document_date || d.created_at || "").slice(0, mode === "year" ? 4 : 7);
    return key === period;
  });
}
