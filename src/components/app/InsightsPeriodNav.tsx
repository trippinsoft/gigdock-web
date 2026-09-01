"use client";

// Insights period control: year dropdown, optional month dropdown, Month | Year.
// Stepping to an earlier year is Complete-History Pro — free users are clamped
// to the current period server-side and the older years go to the paywall.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePlan } from "@/components/app/pro";
import { trackPro } from "@/lib/monetization";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function yearOf(mode: "month" | "year", period: string): number {
  return Number(mode === "year" ? period : period.slice(0, 4));
}
function monthOf(period: string): number {
  return Number(period.slice(5, 7));
}

export default function InsightsPeriodNav({
  mode,
  period,
  current,
  plan,
}: {
  mode: "month" | "year";
  period: string;
  current: string;
  plan?: "free" | "pro";
}) {
  const router = useRouter();
  const ctxPlan = usePlan();
  const isPro = (plan ?? ctxPlan) === "pro";
  const year = yearOf(mode, period);
  const currentYear = Number(current.slice(0, 4));
  const years = Array.from({ length: 8 }, (_, i) => currentYear - i);
  const month = mode === "month" ? monthOf(period) : 1;

  function go(nextMode: "month" | "year", y: number, m?: number) {
    if (!isPro && y < currentYear) {
      trackPro("locked_feature_attempted", "insights_history");
      router.push("/pro?from=insights_history");
      return;
    }
    if (nextMode === "year") {
      router.push(`/insights?mode=year&p=${y}`);
      return;
    }
    const curMonth = new Date().getMonth() + 1;
    let mm = m ?? (y === currentYear ? (mode === "month" ? month : curMonth) : 12);
    if (y === currentYear && mm > curMonth) mm = curMonth;
    router.push(`/insights?mode=month&p=${y}-${String(mm).padStart(2, "0")}`);
  }

  const selectCls =
    "h-10 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 text-sm font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <label className="sr-only" htmlFor="insights-year">Year</label>
      <select
        id="insights-year"
        value={year}
        onChange={(e) => go(mode, Number(e.target.value), mode === "month" ? month : undefined)}
        className={`${selectCls} min-w-[7.5rem]`}
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y}{!isPro && y < currentYear ? " (Pro)" : ""}
          </option>
        ))}
      </select>

      {mode === "month" && (
        <>
          <label className="sr-only" htmlFor="insights-month">Month</label>
          <select
            id="insights-month"
            value={month}
            onChange={(e) => go("month", year, Number(e.target.value))}
            className={`${selectCls} min-w-[9rem]`}
          >
            {MONTHS.map((name, i) => {
              const n = i + 1;
              const future = year === currentYear && n > new Date().getMonth() + 1;
              return (
                <option key={name} value={n} disabled={future}>
                  {name}
                </option>
              );
            })}
          </select>
        </>
      )}

      <div className="flex items-center gap-1 rounded-xl border border-zinc-200 dark:border-zinc-800 p-0.5 bg-white dark:bg-zinc-900">
        <Link
          href={`/insights?mode=month&p=${year}-${String(
            year === currentYear ? (mode === "month" ? month : new Date().getMonth() + 1) : 12
          ).padStart(2, "0")}`}
          className={tab(mode === "month")}
        >
          Month
        </Link>
        <Link href={`/insights?mode=year&p=${year}`} className={tab(mode === "year")}>
          Year
        </Link>
      </div>
    </div>
  );
}

function tab(active: boolean) {
  return `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
    active ? "bg-blue-600 text-white" : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
  }`;
}
