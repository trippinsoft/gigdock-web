// Report catalog + buildReport — the web port of the mobile reportDefinitions.js
// and ReportDetailScreen.buildReport(). Pure/server-safe: maps an
// InsightsOverview (+ documents for the documents/taxReady reports) into summary
// cards and a table, matching the mobile columns/rows exactly.

import { money } from "@/lib/format";
import type { InsightsOverview, DocumentRow } from "@/lib/backoffice-types";

export type ReportId =
  | "earnings" | "payments" | "grossNet" | "gigs" | "companies" | "expenses" | "documents" | "taxReady";

export type DocWithGig = DocumentRow & { gig: { title: string } | null };

export const REPORT_GROUPS: { group: string; reports: { id: ReportId; title: string; description: string }[] }[] = [
  {
    group: "Financial",
    reports: [
      { id: "earnings", title: "Earnings Summary", description: "Earnings, work activity, bumps and monthly totals" },
      { id: "payments", title: "Payments", description: "Received payments and outstanding gigs" },
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

export function buildReport(
  id: ReportId,
  data: InsightsOverview | null,
  docs: DocWithGig[],
  now: number = Date.now()
): BuiltReport {
  const grossEarned = data?.gross_earned ?? 0;
  const outstanding = data?.outstanding ?? 0;
  const received = Math.max(grossEarned - outstanding, 0);
  const paymentCount = data?.payment_count ?? 0;
  const netComplete = data?.net_complete_payments ?? data?.net_complete_gigs ?? 0;
  const missingNet = Math.max(0, paymentCount - netComplete);
  const num = (n: number | undefined | null) => String(n ?? 0);

  switch (id) {
    case "earnings":
      return {
        summary: [
          { label: "Gross earned", value: money(grossEarned) },
          { label: "Recorded net", value: money(data?.net_recorded) },
          { label: "Work days", value: num(data?.days_worked) },
          { label: "Gigs worked", value: num(data?.gigs_worked) },
        ],
        columns: ["Period", "Gross earnings"],
        rows: (data?.trend ?? []).map((t) => [dateText(t.date), money(t.gross)]),
        emptyText: "No records found for this period",
      };

    case "payments": {
      const receivedRows = (data?.payments ?? []).map((p) => [
        p.title || "Payment", "Received", dateText(p.pay_date), money(p.gross),
        p.net == null ? "Net not recorded" : `Net ${money(p.net)}`,
      ]);
      const outstandingRows = (data?.outstanding_items ?? []).map((o) => {
        const days = o.days_outstanding ?? (o.worked_date ? Math.max(0, Math.floor((now - new Date(o.worked_date + "T00:00:00").getTime()) / 864e5)) : null);
        return [
          o.title || "Untitled gig", "Outstanding",
          days != null ? `${days} days` : "Payment date unavailable",
          money(o.outstanding), o.company_name || "",
        ];
      });
      return {
        summary: [
          { label: "Earned", value: money(grossEarned) },
          { label: "Received", value: money(received) },
          { label: "Outstanding", value: money(outstanding) },
          { label: "Payments received", value: num(paymentCount) },
        ],
        columns: ["Gig", "Status", "Date / age", "Amount", "Details"],
        rows: [...receivedRows, ...outstandingRows],
        emptyText: "No records found for this period",
      };
    }

    case "grossNet":
      return {
        summary: [
          { label: "Gross", value: money(data?.received) },
          { label: "Recorded net", value: money(data?.net_recorded) },
          { label: "Net completeness", value: missingNet ? `${missingNet} missing` : "Complete" },
        ],
        columns: ["Period", "Gross", "Recorded net"],
        rows: (data?.payment_trend ?? []).map((p) => [
          dateText(p.date), money(p.received), p.net == null ? "Not recorded" : money(p.net),
        ]),
        emptyText: "No records found for this period",
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
        rows: docs.map((d) => [d.display_name, d.document_type, dateText(d.document_date), d.gig?.title || "Personal"]),
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
      return {
        summary: [
          { label: "Gross earnings", value: money(grossEarned) },
          { label: "Recorded net", value: money(data?.net_recorded) },
          { label: "Gigs", value: num(data?.gigs_worked) },
          { label: "Work days", value: num(data?.days_worked) },
        ],
        columns: ["Area", "Recorded status", "Details"],
        rows: [
          ["Work summary", `${data?.gigs_worked || 0} gigs`, `${data?.days_worked || 0} work days · ${money(grossEarned)} gross`],
          ["Payment summary", `${paymentCount} payments`, `${money(received)} received · ${money(outstanding)} outstanding`],
          ["Net completeness", netStatus, `Net recorded for ${Math.max(0, paymentCount - missingNet)} of ${paymentCount} applicable payments`],
          ["Expenses", "No data", "No expenses recorded yet"],
          ["Mileage", "No data", "No mileage recorded"],
          ["Documents", `${docs.length} stored`, "Uploaded documents are not automatically included in exports"],
        ],
        emptyText: "No records found for this period",
        note: "GigDock organizes your records but does not prepare or file tax returns. Missing values are never estimated.",
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
