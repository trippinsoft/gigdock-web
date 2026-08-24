import Link from "next/link";
import type { Metadata } from "next";
import { getEarnedInRange, getGigs, getNeedsAttention } from "@/lib/backoffice";
import type { FilteredGig } from "@/lib/backoffice-types";
import { money, dateRange } from "@/lib/format";

export const metadata: Metadata = {
  title: "Today",
  robots: { index: false, follow: false },
};

// [start, end) bounds for the current calendar month, as YYYY-MM-DD.
function monthBounds() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { start: fmt(new Date(y, m, 1)), end: fmt(new Date(y, m + 1, 1)) };
}

export default async function TodayPage() {
  const { start, end } = monthBounds();
  const [attention, monthEarned, recent] = await Promise.all([
    getNeedsAttention(),
    getEarnedInRange(start, end),
    getGigs({ sort: "recent" }),
  ]);

  const monthLabel = new Date().toLocaleDateString("en-US", { month: "long" });
  const paymentsDue = attention?.payments_due_count ?? 0;
  const paymentsDueAmt = attention?.payments_due_amount ?? 0;
  const missingPay = attention?.missing_payment_count ?? 0;
  const missingDates = attention?.missing_dates_count ?? 0;
  const nothingToDo = paymentsDue === 0 && missingPay === 0 && missingDates === 0;

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-1">Today</h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
        Your workspace at a glance.
      </p>

      {/* This month */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 mb-6">
        <div className="text-xs uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
          Earned in {monthLabel}
        </div>
        <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
          {money(monthEarned)}
        </div>
      </div>

      {/* Needs attention */}
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-2">
        Needs attention
      </h2>
      {nothingToDo ? (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 mb-8 text-sm text-zinc-500 dark:text-zinc-400">
          You&apos;re all caught up — nothing needs attention right now.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
          <AttentionCard
            href="/gigs?filter=payments_due"
            n={paymentsDue}
            label="Payments due"
            sub={paymentsDueAmt > 0 ? `${money(paymentsDueAmt)} outstanding` : undefined}
            tone="amber"
          />
          <AttentionCard
            href="/gigs?filter=missing_payment"
            n={missingPay}
            label="Missing pay info"
            tone="blue"
          />
          <AttentionCard
            href="/gigs?filter=missing_dates"
            n={missingDates}
            label="Missing dates"
            tone="blue"
          />
        </div>
      )}

      {/* Recent gigs */}
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Recent gigs
        </h2>
        <Link href="/gigs" className="text-sm text-blue-600 dark:text-blue-400 font-medium">
          View all
        </Link>
      </div>
      {recent.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 p-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
          No gigs yet. Add opportunities from the{" "}
          <Link href="/opportunities" className="text-blue-600 dark:text-blue-400 font-medium">
            Opportunities
          </Link>{" "}
          feed.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {recent.slice(0, 5).map((g) => (
            <li key={g.id}>
              <RecentGigRow gig={g} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AttentionCard({
  href,
  n,
  label,
  sub,
  tone,
}: {
  href: string;
  n: number;
  label: string;
  sub?: string;
  tone: "amber" | "blue";
}) {
  const active = n > 0;
  const numCls = !active
    ? "text-zinc-300 dark:text-zinc-700"
    : tone === "amber"
      ? "text-amber-600 dark:text-amber-400"
      : "text-blue-600 dark:text-blue-400";
  return (
    <Link
      href={href}
      className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
    >
      <div className={`text-2xl font-bold ${numCls}`}>{n}</div>
      <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">{sub}</div>}
    </Link>
  );
}

function RecentGigRow({ gig }: { gig: FilteredGig }) {
  const earned = gig.earned_total ?? 0;
  return (
    <Link
      href={`/gigs/${gig.id}`}
      className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
    >
      <div className="min-w-0">
        <div className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{gig.title}</div>
        <div className="text-xs text-zinc-400 dark:text-zinc-500">
          {dateRange(gig.start_date, gig.end_date)}
        </div>
      </div>
      <div className="shrink-0 text-sm font-semibold text-zinc-800 dark:text-zinc-200">{money(earned)}</div>
    </Link>
  );
}
