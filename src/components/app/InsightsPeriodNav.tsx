"use client";

// Insights period control: Month | Year, and a ‹ period › stepper. Stepping to
// an earlier period is a Complete-History Pro capability — free users see a lock
// on the "older" arrow (and are clamped to the current period server-side).

import Link from "next/link";
import { usePlan } from "@/components/app/pro";
import { trackPro } from "@/lib/monetization";

function shiftMonth(period: string, delta: number): string {
  const [y, m] = period.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function labelFor(mode: "month" | "year", period: string): string {
  if (mode === "year") return period;
  const [y, m] = period.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export default function InsightsPeriodNav({
  mode,
  period,
  current,
}: {
  mode: "month" | "year";
  period: string; // YYYY-MM (month) or YYYY (year)
  current: string; // current period in the same shape
}) {
  const isPro = usePlan() === "pro";
  const older = mode === "year" ? String(Number(period) - 1) : shiftMonth(period, -1);
  const newer = mode === "year" ? String(Number(period) + 1) : shiftMonth(period, 1);
  const canNewer = period < current;
  const href = (p: string) => `/insights?mode=${mode}&p=${p}`;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Month | Year */}
      <div className="flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-zinc-800 p-0.5 bg-white dark:bg-zinc-900">
        <Link href={`/insights?mode=month&p=${current.length === 4 ? `${current}-01`.slice(0, 7) : current}`} className={tab(mode === "month")}>Month</Link>
        <Link href={`/insights?mode=year&p=${current.slice(0, 4)}`} className={tab(mode === "year")}>Year</Link>
      </div>

      {/* ‹ period › */}
      <div className="flex items-center gap-1">
        {isPro ? (
          <Link href={href(older)} aria-label="Earlier period" className={arrow(true)}>‹</Link>
        ) : (
          <Link
            href="/pro?from=insights_history"
            onClick={() => trackPro("locked_feature_attempted", "insights_history")}
            aria-label="Earlier periods (Pro)"
            title="Unlock your complete history with Pro"
            className={`${arrow(true)} text-violet-500 dark:text-violet-400`}
          >🔒</Link>
        )}
        <span className="min-w-[9rem] text-center text-sm font-semibold text-zinc-900 dark:text-zinc-100">{labelFor(mode, period)}</span>
        {canNewer ? (
          <Link href={href(newer)} aria-label="Later period" className={arrow(true)}>›</Link>
        ) : (
          <span className={arrow(false)}>›</span>
        )}
      </div>
    </div>
  );
}

function tab(active: boolean) {
  return `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${active ? "bg-blue-600 text-white" : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`;
}
function arrow(enabled: boolean) {
  return `inline-flex h-8 w-8 items-center justify-center rounded-lg text-lg ${enabled ? "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800" : "text-zinc-300 dark:text-zinc-700 cursor-default"}`;
}
