// Compact "After expenses" subsection that lives INSIDE the Gig Detail
// Earnings Summary block. This mirrors the approved mobile GigFinancialSummary
// design from gigvault:origin/main (1f649d3+): one tappable row appended to
// Earnings Summary, never a separate "What this gig made" card and never
// with `+ Expense / + Mileage / View all` controls.
//
// Server component — reads live expense/mileage records for the gig and lets
// the top-line Earnings Summary stay untouched. Free users see the label + a
// PRO badge and a "View" link to /pro. Pro users see `$X.XX net`, a summary
// line `$Y.YY expenses · Z mi`, and a chevron; tapping opens
// `/expenses?gig_id=<id>`.

import Link from "next/link";
import {
  getBusinessMileageRates,
  getWorkExpenses,
  getWorkMileage,
} from "@/lib/backoffice";
import {
  milesLabel,
  money,
  summarizeWorkFinancials,
} from "@/lib/workFinancials";

export default async function AfterExpensesRow({
  gigId,
  gross,
  plan,
}: {
  gigId: string;
  gross: number;
  plan: "free" | "pro";
}) {
  if (plan !== "pro") {
    return (
      <Link
        href="/pro?from=expense_tracking"
        className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
              After expenses
            </span>
            <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
              Pro
            </span>
          </div>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            Track work costs with GigDock Pro
          </p>
        </div>
        <span className="shrink-0 text-sm font-semibold text-blue-600 dark:text-blue-400">
          View →
        </span>
      </Link>
    );
  }

  const [expenses, mileage, rates] = await Promise.all([
    getWorkExpenses({ gigId }),
    getWorkMileage({ gigId }),
    getBusinessMileageRates(),
  ]);
  const summary = summarizeWorkFinancials(expenses, mileage, rates, gross);
  const net = summary.netBeforeTaxes ?? gross;

  return (
    <Link
      href={`/expenses?gig_id=${gigId}`}
      className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
    >
      <div className="min-w-0">
        <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
          After expenses
        </div>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 truncate">
          {money(summary.actualExpenses)} expenses ·{" "}
          {milesLabel(summary.businessMiles)}
        </p>
      </div>
      <div className="shrink-0 flex items-center gap-1.5">
        <span className="text-base font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
          {money(net)} net
        </span>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-zinc-400"
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
      </div>
    </Link>
  );
}
