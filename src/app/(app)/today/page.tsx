import Link from "next/link";
import type { Metadata } from "next";
import {
  getEarnedInRange,
  getReceivedInRange,
  getEarningsSummary,
  getWorkSummary,
  getNeedsAttention,
  getGigs,
  getAllPayments,
  getRecentOpportunities,
} from "@/lib/backoffice";
import type { FilteredGig } from "@/lib/backoffice-types";
import { MetricCard, Panel } from "@/components/app/ui";
import { money, shortDate, shortDateNoYear, dateRange } from "@/lib/format";

export const metadata: Metadata = {
  title: "Today",
  robots: { index: false, follow: false },
};

function monthBounds() {
  const now = new Date();
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { start: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), end: fmt(new Date(now.getFullYear(), now.getMonth() + 1, 1)) };
}

export default async function TodayPage() {
  const { start, end } = monthBounds();
  const todayStr = new Date().toISOString().slice(0, 10);

  const [earnedMonth, receivedMonth, allSummary, work, attention, gigs, payments, opps] = await Promise.all([
    getEarnedInRange(start, end),
    getReceivedInRange(start, end),
    getEarningsSummary(),
    getWorkSummary(start, end),
    getNeedsAttention(),
    getGigs({ sort: "recent" }),
    getAllPayments(),
    getRecentOpportunities(3),
  ]);

  const monthLabel = new Date().toLocaleDateString("en-US", { month: "long" });
  const dateLabel = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const outstanding = allSummary?.remaining ?? 0;

  // Next up + upcoming, from each gig's soonest future work day.
  const withNext = gigs
    .map((g) => {
      const future = (g.gig_dates ?? []).map((d) => d.date.slice(0, 10)).filter((d) => d >= todayStr).sort();
      return future.length ? { g, next: future[0] } : null;
    })
    .filter((x): x is { g: FilteredGig; next: string } => x !== null)
    .sort((a, b) => a.next.localeCompare(b.next));
  const nextUp = withNext[0] ?? null;
  const upcoming = withNext.slice(1, 5);

  const paymentsDue = attention?.payments_due_count ?? 0;
  const missingPay = attention?.missing_payment_count ?? 0;
  const missingDates = attention?.missing_dates_count ?? 0;
  const recentPayments = payments.slice(0, 5);

  return (
    <div className="max-w-6xl">
      <div className="flex items-baseline justify-between gap-4 mb-5">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Today</h1>
        <span className="text-sm text-zinc-400 dark:text-zinc-500">{dateLabel}</span>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <MetricCard label={`Earned ${monthLabel}`} value={money(earnedMonth)} href="/insights" />
        <MetricCard label={`Received ${monthLabel}`} value={money(receivedMonth)} tone="green" href="/insights" />
        <MetricCard label="Outstanding" value={money(outstanding)} tone={outstanding > 0 ? "amber" : "default"} href="/payments" />
        <MetricCard label={`Work days ${monthLabel}`} value={String(work?.days_worked ?? 0)} href="/calendar" />
      </div>

      {/* Next up + needs attention */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Panel title="Next up">
          {nextUp ? (
            <div className="px-5 pb-5">
              <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{nextUp.g.title || "Untitled gig"}</div>
              <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {nextUp.next === todayStr ? "Today" : shortDate(nextUp.next)}
                {nextUp.g.location && <> · {nextUp.g.location}</>}
              </div>
              <Link href={`/gigs/${nextUp.g.id}`} className="mt-4 inline-flex items-center rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Open gig →</Link>
            </div>
          ) : (
            <p className="px-5 pb-5 text-sm text-zinc-400 dark:text-zinc-500">No upcoming work days scheduled.</p>
          )}
        </Panel>

        <Panel title="Needs attention">
          <div className="px-3 pb-3">
            <AttnRow n={paymentsDue} label="Payments due" href="/gigs?filter=payments_due" tone="amber" />
            <AttnRow n={missingPay} label="Missing pay info" href="/gigs?filter=missing_payment" tone="blue" />
            <AttnRow n={missingDates} label="Missing dates" href="/gigs?filter=missing_dates" tone="blue" />
          </div>
        </Panel>
      </div>

      {/* Upcoming + recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
        <Panel title="Upcoming" action={<Link href="/calendar" className="text-xs font-medium text-blue-600 dark:text-blue-400">View calendar →</Link>}>
          {upcoming.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-zinc-400 dark:text-zinc-500">Nothing else scheduled.</p>
          ) : (
            <div className="pb-2">
              {upcoming.map(({ g, next }) => (
                <Link key={g.id} href={`/gigs/${g.id}`} className="flex items-center justify-between gap-3 px-5 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{g.title || "Untitled gig"}</span>
                  </div>
                  <span className="shrink-0 text-xs text-zinc-400 dark:text-zinc-500">{shortDateNoYear(next)}{g.location ? ` · ${g.location}` : ""}</span>
                </Link>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Recent activity">
          {recentPayments.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-zinc-400 dark:text-zinc-500">No recent payments.</p>
          ) : (
            <div className="pb-2">
              {recentPayments.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 px-5 py-2">
                  <div className="min-w-0 text-sm text-zinc-700 dark:text-zinc-200 truncate">
                    <span className="font-medium text-green-600 dark:text-green-400">{money(p.gross_pay)}</span> received
                    {p.gig?.title && <span className="text-zinc-500 dark:text-zinc-400"> · {p.gig.title}</span>}
                  </div>
                  <span className="shrink-0 text-xs text-zinc-400 dark:text-zinc-500">{shortDateNoYear(p.pay_date)}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* Opportunities */}
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Opportunities for you</h2>
        <Link href="/opportunities" className="text-xs font-medium text-blue-600 dark:text-blue-400">View all →</Link>
      </div>
      {opps.length === 0 ? (
        <p className="text-sm text-zinc-400 dark:text-zinc-500">No open opportunities right now.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {opps.map((o) => (
            <Link key={o.id} href={`/opportunities/${o.id}`} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 hover:border-zinc-300 dark:hover:border-zinc-700">
              <div className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 line-clamp-2">{o.title}</div>
              <div className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                {[o.location, o.work_date ? shortDateNoYear(o.work_date) : null].filter(Boolean).join(" · ")}
              </div>
              {o.pay_rate && <div className="mt-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">{o.pay_rate}</div>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function AttnRow({ n, label, href, tone }: { n: number; label: string; href: string; tone: "amber" | "blue" }) {
  const numCls = n === 0 ? "text-zinc-300 dark:text-zinc-700" : tone === "amber" ? "text-amber-600 dark:text-amber-400" : "text-blue-600 dark:text-blue-400";
  return (
    <Link href={href} className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
      <div className="flex items-center gap-3">
        <span className={`w-7 text-xl font-bold tabular-nums ${numCls}`}>{n}</span>
        <span className="text-sm text-zinc-700 dark:text-zinc-200">{label}</span>
      </div>
      {n > 0 && <span className="text-zinc-300 dark:text-zinc-600">→</span>}
    </Link>
  );
}
