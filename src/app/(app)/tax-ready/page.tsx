import type { Metadata } from "next";
import Link from "next/link";
import { getInsights, getDocuments, getPlan } from "@/lib/backoffice";
import { money } from "@/lib/format";
import { ProBadge } from "@/components/app/pro";
import { paymentNetStats } from "@/lib/reportDefs";

export const metadata: Metadata = {
  title: "Tax Ready",
  robots: { index: false, follow: false },
};

const DISCLAIMER = "GigDock helps organize your records but does not prepare or file tax returns.";

function CalendarIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" /><path d="M12 14a2 2 0 1 0 0 4" />
    </svg>
  );
}

/* ── free (locked) splash ─────────────────────────────────────────────────── */
function LockedSplash() {
  return (
    <div className="max-w-2xl">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">Tax Ready <ProBadge /></h1>
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
          <CalendarIcon />
        </div>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Get your gig records ready for tax time.</h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300 max-w-md mx-auto">
          Review your earnings, expenses, mileage and tax documents, then create reports to use yourself or share with your tax professional.
        </p>
        <p className="mt-4 text-xs text-zinc-400 dark:text-zinc-500">{DISCLAIMER}</p>
        <Link href="/pro?from=tax_prep" className="mt-5 inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold">
          Unlock Tax Ready →
        </Link>
      </div>
    </div>
  );
}

/* ── checklist row ────────────────────────────────────────────────────────── */
type Status = "Looks Good" | "Needs Attention" | "No Data";
function ChecklistRow({ label, status, desc, action }: { label: string; status: Status; desc: string; action?: { label: string; href: string } }) {
  const tone =
    status === "Looks Good" ? "text-green-600 dark:text-green-400"
      : status === "Needs Attention" ? "text-amber-600 dark:text-amber-400"
        : "text-zinc-400 dark:text-zinc-500";
  const icon =
    status === "Looks Good" ? <path d="M20 6 9 17l-5-5" />
      : status === "Needs Attention" ? <><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" /></>
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
        {action && <Link href={action.href} className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">{action.label}</Link>}
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
async function TaxReadyExperience({ year }: { year: number }) {
  const start = `${year}-01-01`;
  const end = `${year + 1}-01-01`;
  const data = await getInsights(start, end, "year");
  const allDocs = await getDocuments();
  const yearDocs = allDocs.filter((d) => (d.document_date || d.created_at || "").slice(0, 4) === String(year));

  const { paymentCount, netComplete, missingNet } = paymentNetStats(data);
  const gigsWorked = data?.gigs_worked ?? 0;
  const yr = String(year);

  const thisYear = new Date().getFullYear();
  const prev = `/tax-ready?year=${year - 1}`;
  const next = `/tax-ready?year=${year + 1}`;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">Tax Ready <ProBadge /></h1>
        <div className="flex items-center gap-1">
          <Link href={prev} className="h-7 w-7 grid place-items-center rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="Previous year"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg></Link>
          <span className="min-w-[3.5rem] text-center text-sm font-semibold text-zinc-900 dark:text-zinc-100">{year}</span>
          {year >= thisYear ? (
            <span className="h-7 w-7 grid place-items-center rounded-md text-zinc-300 dark:text-zinc-700"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg></span>
          ) : (
            <Link href={next} className="h-7 w-7 grid place-items-center rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="Next year"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg></Link>
          )}
        </div>
      </div>

      {/* Year record summary */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 mb-4">
        <div className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">{yr} record summary</div>
        <div className="mt-1 text-4xl font-extrabold text-blue-600 dark:text-blue-400">{money(data?.gross_earned)}</div>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">Gross earnings recorded</div>
        <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{money(data?.net_recorded)}</div>
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
        <Link href="/documents" className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/60">
          <div><div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Tax documents</div><div className="text-xs text-zinc-500 dark:text-zinc-400">{yearDocs.length} {yearDocs.length === 1 ? "document" : "documents"} dated {yr}</div></div>
          <svg className="text-zinc-400" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
        </Link>
        <Link href={`/insights?mode=year&p=${yr}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/60">
          <div><div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Income reports</div><div className="text-xs text-zinc-500 dark:text-zinc-400">Earnings, payments, and company records</div></div>
          <svg className="text-zinc-400" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
        </Link>
      </Card>

      {/* Checklist */}
      <Card title="Tax Ready checklist" subtitle="Review the areas supported by records in GigDock. No readiness score is calculated.">
        <ChecklistRow label="Earnings" status={gigsWorked > 0 ? "Looks Good" : "No Data"} desc={`${gigsWorked} ${gigsWorked === 1 ? "gig" : "gigs"} recorded`} />
        <ChecklistRow
          label="Payments"
          status={missingNet > 0 ? "Needs Attention" : paymentCount > 0 ? "Looks Good" : "No Data"}
          desc={missingNet > 0 ? `Net amounts missing from ${missingNet} applicable ${missingNet === 1 ? "payment" : "payments"}` : `${paymentCount} payments recorded`}
          action={missingNet > 0 ? { label: "Review Payments", href: "/payments" } : undefined}
        />
        <ChecklistRow label="Expenses" status="No Data" desc="No expenses recorded yet" />
        <ChecklistRow label="Mileage" status="No Data" desc="No mileage recorded" />
        <ChecklistRow
          label="Tax Documents"
          status={yearDocs.length ? "Needs Attention" : "No Data"}
          desc={yearDocs.length ? `Review ${yearDocs.length} stored ${yearDocs.length === 1 ? "document" : "documents"}` : "No tax documents recorded"}
          action={yearDocs.length ? { label: "Review Documents", href: "/documents" } : undefined}
        />
      </Card>

      {/* Generate report */}
      <Link href={`/reports/taxReady?mode=year&p=${yr}`} className="block w-full text-center px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold mb-4">
        Generate Tax Ready Report
      </Link>

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
  const plan = await getPlan();
  if (plan !== "pro") return <LockedSplash />;
  const sp = await searchParams;
  const thisYear = new Date().getFullYear();
  const requested = sp.year && /^\d{4}$/.test(sp.year) ? Number(sp.year) : thisYear;
  const year = Math.min(requested, thisYear);
  return <TaxReadyExperience year={year} />;
}
