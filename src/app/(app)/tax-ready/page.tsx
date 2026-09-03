import type { Metadata } from "next";
import Link from "next/link";
import { getInsights, getDocuments, getPlan } from "@/lib/backoffice";
import { money } from "@/lib/format";
import { ProBadge } from "@/components/app/pro";
import { paymentNetStats } from "@/lib/reportDefs";
import {
  documentTypeBreakdown,
  taxDocumentsForYear,
  taxDocumentsLibraryHref,
} from "@/lib/documentTypes";
import type { DocumentRow, InsightsOverview } from "@/lib/backoffice-types";
import TrackEvent from "@/components/TrackEvent";
import TrackedLink from "@/components/app/TrackedLink";
import ExplorePro from "@/components/app/ExplorePro";

export const metadata: Metadata = {
  title: "Tax Ready",
  robots: { index: false, follow: false },
};

const DISCLAIMER = "GigDock helps organize your records but does not prepare or file tax returns.";
const TAGLINE = "Get your gig records ready for tax time.";

type Doc = DocumentRow & { gig: { title: string } | null };

function CalendarIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" /><path d="M12 14a2 2 0 1 0 0 4" />
    </svg>
  );
}

function taxDocCopy(taxDocs: Doc[]): { count: number; breakdown: string; recordedLine: string } {
  const count = taxDocs.length;
  const breakdown = documentTypeBreakdown(taxDocs);
  const recordedLine = count
    ? `${count} ${count === 1 ? "document" : "documents"} recorded${breakdown ? ` · ${breakdown}` : ""}`
    : "No tax documents recorded";
  return { count, breakdown, recordedLine };
}

/* ── free (locked) splash ─────────────────────────────────────────────────── */
function LockedSplash({
  year,
  gross,
  taxDocs,
}: {
  year: number;
  gross: number | null | undefined;
  taxDocs: Doc[];
}) {
  const yr = String(year);
  const { count, breakdown, recordedLine } = taxDocCopy(taxDocs);
  return (
    <div className="max-w-2xl">
      {/* Free users still hit /tax-ready — fire tax_ready_open plus the Pro
          impression that matches mobile's locked-splash behavior. */}
      <TrackEvent event="tax_ready_open" props={{ year, plan: "free" }} />
      <TrackEvent event="pro_feature_impression" props={{ context: "tax_prep" }} />
      <h1 className="flex items-center gap-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">Tax Ready <ProBadge /></h1>
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
          <CalendarIcon />
        </div>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{TAGLINE}</h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300 max-w-md mx-auto">
          Review your earnings, expenses, mileage and tax documents, then create reports to use yourself or share with your tax professional.
        </p>

        <div className="mt-6 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 px-4 py-4 text-left">
          <div className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">{yr} records</div>
          <div className="mt-1 text-3xl font-extrabold text-blue-600 dark:text-blue-400">{money(gross)}</div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Gross earnings recorded</div>
          <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700">
            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{recordedLine}</div>
            {count > 0 && breakdown ? (
              <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">W-2, 1099, and Other Tax Document only</div>
            ) : (
              <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">W-2, 1099, and Other Tax Document files you keep with your {yr} records</div>
            )}
          </div>
        </div>

        <p className="mt-4 text-xs text-zinc-400 dark:text-zinc-500">{DISCLAIMER}</p>
        <ExplorePro
          href="/pro?from=tax_prep"
          event="pro_feature_tapped"
          props={{ context: "tax_prep" }}
          className="mt-5 inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
        >
          Explore Pro →
        </ExplorePro>
      </div>
    </div>
  );
}

/* ── checklist row ────────────────────────────────────────────────────────── */
type Status = "Looks Good" | "Needs Attention" | "Recorded" | "No Data";
function ChecklistRow({ label, status, desc, action }: { label: string; status: Status; desc: string; action?: { label: string; href: string; event?: string; props?: Record<string, unknown> } }) {
  const tone =
    status === "Looks Good" ? "text-green-600 dark:text-green-400"
      : status === "Needs Attention" ? "text-amber-600 dark:text-amber-400"
        : status === "Recorded" ? "text-blue-600 dark:text-blue-400"
          : "text-zinc-400 dark:text-zinc-500";
  const icon =
    status === "Looks Good" ? <path d="M20 6 9 17l-5-5" />
      : status === "Needs Attention" ? <><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" /></>
        : status === "Recorded" ? <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" fill="currentColor" /></>
          : <><circle cx="12" cy="12" r="9" /><path d="M8 12h8" /></>;
  return (
    <div className="flex items-start justify-between gap-3 px-4 py-3">
      <div className="flex items-start gap-3 min-w-0">
        <span className={`shrink-0 mt-0.5 ${tone}`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
        </span>
        <div className="min-w-0">
          <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{label}</div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">{desc}</div>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className={`text-xs font-semibold ${tone}`}>{status}</div>
        {action && (
          action.event
            ? <TrackedLink href={action.href} event={action.event} props={action.props} className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">{action.label}</TrackedLink>
            : <Link href={action.href} className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">{action.label}</Link>
        )}
      </div>
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 mb-4 overflow-hidden">
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</p>}
      </div>
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">{children}</div>
    </section>
  );
}

/* ── Pro experience ───────────────────────────────────────────────────────── */
function TaxReadyExperience({
  year,
  data,
  allDocs,
}: {
  year: number;
  data: InsightsOverview | null;
  allDocs: Doc[];
}) {
  const { paymentCount, netComplete, missingNet, recordedNet } = paymentNetStats(data);
  const gigsWorked = data?.gigs_worked ?? 0;
  const yr = String(year);
  const taxDocs = taxDocumentsForYear(allDocs, year);
  const { count: taxCount, recordedLine } = taxDocCopy(taxDocs);

  const thisYear = new Date().getFullYear();
  const prev = `/tax-ready?year=${year - 1}`;
  const next = `/tax-ready?year=${year + 1}`;
  const reviewDocsHref = taxDocumentsLibraryHref(yr);

  return (
    <div className="max-w-2xl">
      {/* mobile parity: tax_ready_open fires once per year view. */}
      <TrackEvent event="tax_ready_open" props={{ year }} />
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">Tax Ready <ProBadge /></h1>
        <div className="flex items-center gap-1">
          <TrackedLink href={prev} event="tax_year_selected" props={{ year: year - 1 }} className="h-7 w-7 grid place-items-center rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800" ariaLabel="Previous year"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg></TrackedLink>
          <span className="min-w-[3.5rem] text-center text-sm font-semibold text-zinc-900 dark:text-zinc-100">{year}</span>
          {year >= thisYear ? (
            <span className="h-7 w-7 grid place-items-center rounded-md text-zinc-300 dark:text-zinc-700"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg></span>
          ) : (
            <TrackedLink href={next} event="tax_year_selected" props={{ year: year + 1 }} className="h-7 w-7 grid place-items-center rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800" ariaLabel="Next year"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg></TrackedLink>
          )}
        </div>
      </div>

      {/* Year record summary */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 mb-4">
        <div className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">{yr} record summary</div>
        <div className="mt-1 text-4xl font-extrabold text-blue-600 dark:text-blue-400">{money(data?.gross_earned)}</div>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">Gross earnings recorded</div>
        <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{money(recordedNet)}</div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            {missingNet === 0 && paymentCount > 0
              ? "Net recorded for every applicable payment"
              : `Net recorded for ${netComplete} of ${paymentCount} applicable payments`}
          </div>
        </div>
        {missingNet > 0 && (
          <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
            {missingNet} applicable {missingNet === 1 ? "payment is" : "payments are"} missing a net amount. Missing values are never estimated.
          </p>
        )}
      </div>

      {/* Tax-time records */}
      <Card title="Tax-time records" subtitle={DISCLAIMER}>
        <TrackedLink href={taxCount ? reviewDocsHref : "/documents"} event="tax_ready_item_reviewed" props={{ item: "documents" }} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/60">
          <div>
            <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Tax documents</div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">{recordedLine}</div>
          </div>
          <svg className="text-zinc-400" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
        </TrackedLink>
        <TrackedLink href={`/insights?mode=year&p=${yr}`} event="tax_ready_item_reviewed" props={{ item: "income_reports" }} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/60">
          <div><div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Income reports</div><div className="text-xs text-zinc-500 dark:text-zinc-400">Earnings, payments, and company records</div></div>
          <svg className="text-zinc-400" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
        </TrackedLink>
      </Card>

      {/* Checklist */}
      <Card title="Tax Ready checklist" subtitle="Review the areas supported by records in GigDock. No readiness score is calculated.">
        <ChecklistRow
          label="Earnings"
          status={gigsWorked > 0 ? "Recorded" : "No Data"}
          desc={`${gigsWorked} ${gigsWorked === 1 ? "gig" : "gigs"} recorded`}
        />
        <ChecklistRow
          label="Payments"
          status={missingNet > 0 ? "Needs Attention" : paymentCount > 0 ? "Looks Good" : "No Data"}
          desc={missingNet > 0 ? `Net amounts missing from ${missingNet} applicable ${missingNet === 1 ? "payment" : "payments"}` : `${paymentCount} payments recorded`}
          action={missingNet > 0 ? { label: "Review Payments", href: "/payments", event: "tax_ready_item_reviewed", props: { item: "payments" } } : undefined}
        />
        <ChecklistRow label="Expenses" status="No Data" desc="No expenses recorded yet" />
        <ChecklistRow label="Mileage" status="No Data" desc="No mileage recorded" />
        <ChecklistRow
          label="Tax Documents"
          status={taxCount ? "Recorded" : "No Data"}
          desc={taxCount
            ? recordedLine
            : `No tax documents recorded. Add tax-related documents you want to keep with your ${yr} records.`}
          action={taxCount
            ? { label: "Review Documents", href: reviewDocsHref, event: "tax_ready_item_reviewed", props: { item: "documents" } }
            : { label: "Add Document", href: "/documents", event: "tax_ready_item_reviewed", props: { item: "add_document" } }}
        />
      </Card>

      {/* Generate report */}
      <TrackedLink href={`/reports/taxReady?mode=year&p=${yr}`} event="tax_ready_report_generated" props={{ year }} className="block w-full text-center px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold mb-4">
        Generate Tax Ready Report
      </TrackedLink>

      {/* Report exports */}
      <Card title="Report exports" subtitle="PDF and CSV files from your Tax Ready Report">
        <div className="px-4 py-4">
          <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/60 p-4">
            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Your report is ready to generate</div>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Use the button above to review and export your {yr} work, earnings, payment, company, and document summary. Missing values are never estimated.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default async function TaxReadyPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const sp = await searchParams;
  const thisYear = new Date().getFullYear();
  const requested = sp.year && /^\d{4}$/.test(sp.year) ? Number(sp.year) : thisYear;
  const year = Math.min(requested, thisYear);
  const start = `${year}-01-01`;
  const end = `${year + 1}-01-01`;

  const [plan, data, allDocs] = await Promise.all([
    getPlan(),
    getInsights(start, end, "year"),
    getDocuments(),
  ]);

  const taxDocs = taxDocumentsForYear(allDocs, year);
  if (plan !== "pro") {
    return <LockedSplash year={year} gross={data?.gross_earned} taxDocs={taxDocs} />;
  }
  return <TaxReadyExperience year={year} data={data} allDocs={allDocs} />;
}
