import Link from "next/link";
import type { Metadata } from "next";
import {
  getEarnedInRange,
  getReceivedInRange,
  getEarningsSummary,
  getWorkSummary,
  getNeedsAttention,
  getGigs,
  getCompanies,
  getAllPayments,
  getRecentOpportunities,
} from "@/lib/backoffice";
import type { FilteredGig } from "@/lib/backoffice-types";
import { Panel } from "@/components/app/ui";
import MasterRow from "@/components/app/MasterRow";
import { money, shortDate, shortDateNoYear } from "@/lib/format";

export const metadata: Metadata = {
  title: "Today",
  robots: { index: false, follow: false },
};

const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export default async function TodayPage() {
  const now = new Date();
  const mStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const mEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const pStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const pEnd = mStart;
  const todayStr = fmt(now);
  const tomorrowStr = fmt(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));

  const [
    earnedM, earnedP, receivedM, receivedP, allSummary,
    workM, workP, attention, gigs, companies, payments, opps,
  ] = await Promise.all([
    getEarnedInRange(fmt(mStart), fmt(mEnd)),
    getEarnedInRange(fmt(pStart), fmt(pEnd)),
    getReceivedInRange(fmt(mStart), fmt(mEnd)),
    getReceivedInRange(fmt(pStart), fmt(pEnd)),
    getEarningsSummary(),
    getWorkSummary(fmt(mStart), fmt(mEnd)),
    getWorkSummary(fmt(pStart), fmt(pEnd)),
    getNeedsAttention(),
    getGigs({ sort: "recent" }),
    getCompanies(),
    getAllPayments(),
    getRecentOpportunities(3),
  ]);

  const companyById = new Map(companies.map((c) => [c.id, c.name]));
  const companyOf = (g: FilteredGig) => (g.gig_company_id ? companyById.get(g.gig_company_id) ?? null : null);

  const monthLabel = now.toLocaleDateString("en-US", { month: "long" });
  const prevLabel = pStart.toLocaleDateString("en-US", { month: "short" });
  const dateLabel = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const outstanding = allSummary?.remaining ?? 0;

  // Upcoming = each gig's soonest future work day.
  const withNext = gigs
    .map((g) => {
      const future = (g.gig_dates ?? []).map((d) => d.date.slice(0, 10)).filter((d) => d >= todayStr).sort();
      return future.length ? { g, next: future[0] } : null;
    })
    .filter((x): x is { g: FilteredGig; next: string } => x !== null)
    .sort((a, b) => a.next.localeCompare(b.next));
  const nextUp = withNext[0] ?? null;
  const upcoming = withNext.slice(1, 5);
  const startsTomorrow = withNext.filter((x) => x.next === tomorrowStr).length;

  const paymentsDue = attention?.payments_due_count ?? 0;
  const paymentsDueAmt = attention?.payments_due_amount ?? 0;
  const missingPay = attention?.missing_payment_count ?? 0;
  const missingDates = attention?.missing_dates_count ?? 0;
  const recentPayments = payments.slice(0, 5);

  return (
    <div className="max-w-6xl">
      <div className="flex items-baseline justify-between gap-4 mb-5">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Today</h1>
        <span className="text-sm text-zinc-400 dark:text-zinc-500">{dateLabel}</span>
      </div>

      {/* Monthly pulse */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <Kpi label={`Earned ${monthLabel}`} value={money(earnedM)} delta={pctDelta(earnedM, earnedP)} deltaSuffix={`vs ${prevLabel}`} href="/insights" />
        <Kpi label={`Received ${monthLabel}`} value={money(receivedM)} tone="green" delta={pctDelta(receivedM, receivedP)} deltaSuffix={`vs ${prevLabel}`} href="/insights" />
        <Kpi label="Outstanding" value={money(outstanding)} tone={outstanding > 0 ? "amber" : "default"} note={paymentsDue > 0 ? `${paymentsDue} payment${paymentsDue === 1 ? "" : "s"} due` : "all settled"} href="/payments" />
        <Kpi label={`Work days ${monthLabel}`} value={String(workM?.days_worked ?? 0)} note={withNext.length > 0 ? `${withNext.length} upcoming` : undefined} deltaRaw={deltaCount(workM?.days_worked ?? 0, workP?.days_worked ?? 0, prevLabel)} href="/calendar" />
      </div>

      {/* Next up + needs attention */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Panel title="Next up">
          {nextUp ? (
            <div className="px-5 pb-5 flex gap-4">
              <span className="shrink-0 h-20 w-20 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                {nextUp.g.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={nextUp.g.image_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-300 dark:text-zinc-600"><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" /></svg>
                )}
              </span>
              <div className="min-w-0">
                {companyOf(nextUp.g) && <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">{companyOf(nextUp.g)}</div>}
                <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100 leading-tight">{nextUp.g.title || "Untitled gig"}</div>
                <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  {nextUp.next === todayStr ? "Today" : nextUp.next === tomorrowStr ? "Tomorrow" : shortDate(nextUp.next)}
                  {nextUp.g.location && <> · {nextUp.g.location}</>}
                </div>
                <Link href={`/gigs/${nextUp.g.id}`} className="mt-3 inline-flex items-center rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Open gig →</Link>
              </div>
            </div>
          ) : (
            <p className="px-5 pb-5 text-sm text-zinc-400 dark:text-zinc-500">No upcoming work days scheduled.</p>
          )}
        </Panel>

        <Panel title="Needs attention">
          <div className="px-3 pb-3">
            <AttnRow n={paymentsDue} label="Payments due" sub={paymentsDueAmt > 0 ? money(paymentsDueAmt) : undefined} href="/gigs?filter=payments_due" tone="amber" />
            <AttnRow n={missingPay} label="Missing pay info" href="/gigs?filter=missing_payment" tone="blue" />
            <AttnRow n={missingDates} label="Missing dates" href="/gigs?filter=missing_dates" tone="blue" />
            <AttnRow n={startsTomorrow} label="Gig starts tomorrow" href="/calendar" tone="blue" />
          </div>
        </Panel>
      </div>

      {/* Upcoming + recent */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Panel title="Upcoming work" action={<Link href="/calendar" className="text-xs font-medium text-blue-600 dark:text-blue-400">View calendar →</Link>}>
          {upcoming.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-zinc-400 dark:text-zinc-500">Nothing else scheduled.</p>
          ) : (
            <div className="pb-2">
              {upcoming.map(({ g, next }) => (
                <Link key={g.id} href={`/gigs/${g.id}`} className="flex items-center gap-3 px-5 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                  <span className="shrink-0 h-9 w-9 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                    {g.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={g.image_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="text-zinc-300 dark:text-zinc-600"><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" /></svg>
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">{g.title || "Untitled gig"}</div>
                    <div className="text-xs text-zinc-400 dark:text-zinc-500 truncate">{shortDateNoYear(next)}{g.location ? ` · ${g.location}` : ""}</div>
                  </div>
                  <span className="shrink-0 text-sm font-medium text-zinc-700 dark:text-zinc-300">{money(g.earned_total ?? 0)}</span>
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

      {/* Opportunities — image-forward */}
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Opportunities for you</h2>
        <Link href="/opportunities" className="text-xs font-medium text-blue-600 dark:text-blue-400">View all →</Link>
      </div>
      {opps.length === 0 ? (
        <p className="text-sm text-zinc-400 dark:text-zinc-500">No open opportunities right now.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {opps.map((o) => (
            <MasterRow
              key={o.id}
              href={`/opportunities/${o.id}`}
              showThumb={!!o.image_url}
              image={o.image_url}
              title={o.title}
              meta={[o.location, o.work_date ? shortDateNoYear(o.work_date) : null].filter(Boolean).join(" · ") || undefined}
              value={o.pay_rate || undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function pctDelta(cur: number, prev: number): { pct: number; up: boolean } | null {
  if (!prev) return null;
  const pct = Math.round(((cur - prev) / prev) * 100);
  if (pct === 0) return null;
  return { pct: Math.abs(pct), up: pct > 0 };
}
function deltaCount(cur: number, prev: number, prevLabel: string): string | null {
  const d = cur - prev;
  if (d === 0) return null;
  return `${d > 0 ? "+" : ""}${d} vs ${prevLabel}`;
}

function Kpi({
  label,
  value,
  tone = "default",
  delta,
  deltaSuffix,
  deltaRaw,
  note,
  href,
}: {
  label: string;
  value: string;
  tone?: "default" | "green" | "amber";
  delta?: { pct: number; up: boolean } | null;
  deltaSuffix?: string;
  deltaRaw?: string | null;
  note?: string;
  href?: string;
}) {
  const valueCls = tone === "green" ? "text-green-600 dark:text-green-400" : tone === "amber" ? "text-amber-600 dark:text-amber-400" : "text-zinc-900 dark:text-zinc-100";
  const body = (
    <>
      <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${valueCls}`}>{value}</div>
      {delta ? (
        <div className={`mt-0.5 text-xs font-medium ${delta.up ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
          {delta.up ? "↑" : "↓"} {delta.pct}% {deltaSuffix}
        </div>
      ) : deltaRaw ? (
        <div className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">{deltaRaw}</div>
      ) : note ? (
        <div className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">{note}</div>
      ) : null}
    </>
  );
  const cls = "rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4";
  return href ? <Link href={href} className={`${cls} block hover:border-zinc-300 dark:hover:border-zinc-700`}>{body}</Link> : <div className={cls}>{body}</div>;
}

function AttnRow({ n, label, sub, href, tone }: { n: number; label: string; sub?: string; href: string; tone: "amber" | "blue" }) {
  const numCls = n === 0 ? "text-zinc-300 dark:text-zinc-700" : tone === "amber" ? "text-amber-600 dark:text-amber-400" : "text-blue-600 dark:text-blue-400";
  return (
    <Link href={href} className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
      <div className="flex items-center gap-3">
        <span className={`w-7 text-xl font-bold tabular-nums ${numCls}`}>{n}</span>
        <span className="text-sm text-zinc-700 dark:text-zinc-200">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {sub && <span className="text-xs font-medium text-amber-600 dark:text-amber-400">{sub}</span>}
        {n > 0 && <span className="text-zinc-300 dark:text-zinc-600">→</span>}
      </div>
    </Link>
  );
}
