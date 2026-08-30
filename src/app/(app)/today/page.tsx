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
  getDisplayName,
  getDefaultPerformerProfile,
  getGigFit,
} from "@/lib/backoffice";
import type { FilteredGig } from "@/lib/backoffice-types";
import { fieldsSet, fitTierColor, type GigFitResult, type GigFitTier } from "@/lib/gigfit";
import { Panel } from "@/components/app/ui";
import MasterRow from "@/components/app/MasterRow";
import TodayGreeting from "@/components/app/TodayGreeting";
import { PartialReveal } from "@/components/app/pro";
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
  const todayStr = fmt(now);
  const tomorrowStr = fmt(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));

  const [earnedM, earnedP, receivedM, allSummary, workM, workP, attention, gigs, companies, payments, oppsRaw, displayName, profile] = await Promise.all([
    getEarnedInRange(fmt(mStart), fmt(mEnd)),
    getEarnedInRange(fmt(pStart), fmt(mStart)),
    getReceivedInRange(fmt(mStart), fmt(mEnd)),
    getEarningsSummary(),
    getWorkSummary(fmt(mStart), fmt(mEnd)),
    getWorkSummary(fmt(pStart), fmt(mStart)),
    getNeedsAttention(),
    getGigs({ sort: "recent" }),
    getCompanies(),
    getAllPayments(),
    getRecentOpportunities(30),
    getDisplayName(),
    getDefaultPerformerProfile(),
  ]);

  // "Opportunities for you" — when the user has GigFit criteria, show only the
  // ones they qualify for (eligible), ranked strong/good first; otherwise fall
  // back to the latest few. Fit labels appear on the cards when GigFit is on.
  const gigfitOn = !!profile && fieldsSet(profile).length > 0;
  const fitById = new Map<string, GigFitResult>();
  if (gigfitOn && profile) {
    for (const r of await getGigFit(profile.id)) fitById.set(r.opportunity_id, r);
  }
  const TIER_RANK: Record<GigFitTier, number> = { strong: 4, good: 3, open: 2, poor: 1, ineligible: 0 };
  const opps = gigfitOn
    ? oppsRaw
        .filter((o) => fitById.get(o.id)?.eligible)
        // stable sort keeps recency order within a tier
        .sort((a, b) => TIER_RANK[fitById.get(b.id)!.tier] - TIER_RANK[fitById.get(a.id)!.tier])
        .slice(0, 3)
    : oppsRaw.slice(0, 3);

  const companyById = new Map(companies.map((c) => [c.id, c.name]));
  const companyOf = (g: FilteredGig) => (g.gig_company_id ? companyById.get(g.gig_company_id) ?? null : null);
  const monthLabel = now.toLocaleDateString("en-US", { month: "long" });
  const dateLabel = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const outstanding = allSummary?.remaining ?? 0;

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

  const workDays = workM?.days_worked ?? 0;
  const avgPerDay = workDays > 0 ? earnedM / workDays : 0;
  const hasMoney = earnedM > 0 || receivedM > 0 || outstanding > 0;
  const hasAttention = paymentsDue > 0 || missingPay > 0 || missingDates > 0 || startsTomorrow > 0;

  // One dynamic Today's Insight (actionable > significant), mixing Free & Pro.
  const insight = pickInsight({ outstanding, paymentsDue, earnedM, workDays, monthLabel, earnedP, workPrevDays: workP?.days_worked ?? 0 });

  return (
    <div className="max-w-6xl">
      <div className="flex items-baseline justify-between gap-4 mb-5">
        <TodayGreeting name={displayName} />
        <span className="text-sm text-zinc-400 dark:text-zinc-500">{dateLabel}</span>
      </div>

      {/* 1 — Next up (full width, image-forward) */}
      {nextUp && (
        <div className="mb-4">
          <Panel title={nextUp.next === todayStr ? "Today" : "Next up"}>
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
          </Panel>
        </div>
      )}

      {/* Middle modules — masonry so there are never empty slots */}
      <div className="lg:columns-2 lg:gap-4 [&>*]:mb-4 [&>*]:break-inside-avoid">
        {hasAttention && (
          <Panel title="Needs attention">
            <div className="px-3 pb-3">
              {paymentsDue > 0 && <AttnRow n={paymentsDue} label="Payments due" sub={paymentsDueAmt > 0 ? money(paymentsDueAmt) : undefined} href="/gigs?filter=payments_due" tone="amber" />}
              {missingPay > 0 && <AttnRow n={missingPay} label="Missing pay info" href="/gigs?filter=missing_payment" tone="blue" />}
              {missingDates > 0 && <AttnRow n={missingDates} label="Missing dates" href="/gigs?filter=missing_dates" tone="blue" />}
              {startsTomorrow > 0 && <AttnRow n={startsTomorrow} label="Gig starts tomorrow" href="/calendar" tone="blue" />}
            </div>
          </Panel>
        )}

        {hasMoney && (
          <Panel title="Your money" action={<Link href="/insights" className="text-xs font-medium text-blue-600 dark:text-blue-400">View insights →</Link>}>
            <div className="px-5 pb-5">
              <div className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-100">{money(earnedM)}<span className="ml-1.5 text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">earned {monthLabel}</span></div>
              <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                <span><span className="font-semibold text-green-600 dark:text-green-400">{money(receivedM)}</span> <span className="text-zinc-500 dark:text-zinc-400">received</span></span>
                <span><span className={`font-semibold ${outstanding > 0 ? "text-amber-600 dark:text-amber-400" : "text-zinc-700 dark:text-zinc-200"}`}>{money(outstanding)}</span> <span className="text-zinc-500 dark:text-zinc-400">outstanding</span></span>
              </div>
              {workDays > 0 && <div className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">{workDays} work {workDays === 1 ? "day" : "days"} · {money(avgPerDay)}/day</div>}
            </div>
          </Panel>
        )}

        {insight && (
          <Panel title="Today's insight">
            <div className="px-5 pb-5">
              {insight.kind === "free" ? (
                <>
                  <p className="text-sm text-zinc-700 dark:text-zinc-200">{insight.text}</p>
                  <Link href={insight.href} className="mt-2 inline-flex text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline">{insight.cta}</Link>
                </>
              ) : (
                <PartialReveal context="today_pro_insight" lockedCta={insight.lockedCta} free={<p className="text-sm text-zinc-700 dark:text-zinc-200">{insight.text}</p>} />
              )}
            </div>
          </Panel>
        )}

        {upcoming.length > 0 && (
          <Panel title="Upcoming work" action={<Link href="/calendar" className="text-xs font-medium text-blue-600 dark:text-blue-400">View calendar →</Link>}>
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
          </Panel>
        )}

        {recentPayments.length > 0 && (
          <Panel title="Recent activity">
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
          </Panel>
        )}
      </div>

      {/* Opportunities — GigFit-personalized when the user has a profile */}
      {(opps.length > 0 || gigfitOn) && (
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Opportunities for you</h2>
            <Link href="/opportunities" className="text-xs font-medium text-blue-600 dark:text-blue-400">View all →</Link>
          </div>
          {!gigfitOn && (
            <p className="mb-2 text-xs text-zinc-400 dark:text-zinc-500">
              <Link href="/profile" className="text-blue-600 dark:text-blue-400 hover:underline">Set up GigFit</Link> to see the ones that match you.
            </p>
          )}
          {opps.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {opps.map((o) => {
                const fit = gigfitOn ? fitById.get(o.id) ?? null : null;
                return (
                  <MasterRow
                    key={o.id}
                    href={`/opportunities/${o.id}`}
                    showThumb={!!o.image_url}
                    image={o.image_url}
                    title={o.title}
                    meta={[o.location, o.work_date ? shortDateNoYear(o.work_date) : null].filter(Boolean).join(" · ") || undefined}
                    value={o.pay_rate || undefined}
                    badge={fit ? <FitBadge fit={fit} /> : undefined}
                  />
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 p-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
              No matches for your profile right now — <Link href="/opportunities" className="text-blue-600 dark:text-blue-400 hover:underline">browse all opportunities</Link>.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

type Insight =
  | { kind: "free"; text: string; cta: string; href: string }
  | { kind: "pro"; text: string; lockedCta: string }
  | null;

function pickInsight(a: {
  outstanding: number;
  paymentsDue: number;
  earnedM: number;
  workDays: number;
  monthLabel: string;
  earnedP: number;
  workPrevDays: number;
}): Insight {
  // 1. Actionable free — outstanding money.
  if (a.outstanding > 0 && a.paymentsDue > 0) {
    return { kind: "free", text: `${money(a.outstanding)} is still outstanding from ${a.paymentsDue} ${a.paymentsDue === 1 ? "gig" : "gigs"}.`, cta: "View Payments →", href: "/payments" };
  }
  // 2. Significant Pro — earnings-per-day trend vs last month.
  const avgNow = a.workDays > 0 ? a.earnedM / a.workDays : 0;
  const avgPrev = a.workPrevDays > 0 ? a.earnedP / a.workPrevDays : 0;
  if (avgNow > 0 && avgPrev > 0) {
    const chg = Math.round(((avgNow - avgPrev) / avgPrev) * 100);
    if (Math.abs(chg) >= 10) {
      return { kind: "pro", text: `Your average earnings per work day are ${chg > 0 ? "up" : "down"} ${Math.abs(chg)}% vs last month.`, lockedCta: "See what's driving the change" };
    }
  }
  // 3. Free summary.
  if (a.earnedM > 0) {
    return { kind: "free", text: `You've earned ${money(a.earnedM)} across ${a.workDays} work ${a.workDays === 1 ? "day" : "days"} this ${a.monthLabel}.`, cta: "View Insights →", href: "/insights" };
  }
  return null;
}

function AttnRow({ n, label, sub, href, tone }: { n: number; label: string; sub?: string; href: string; tone: "amber" | "blue" }) {
  const numCls = tone === "amber" ? "text-amber-600 dark:text-amber-400" : "text-blue-600 dark:text-blue-400";
  return (
    <Link href={href} className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
      <div className="flex items-center gap-3">
        <span className={`w-7 text-xl font-bold tabular-nums ${numCls}`}>{n}</span>
        <span className="text-sm text-zinc-700 dark:text-zinc-200">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {sub && <span className="text-xs font-medium text-amber-600 dark:text-amber-400">{sub}</span>}
        <span className="text-zinc-300 dark:text-zinc-600">→</span>
      </div>
    </Link>
  );
}

const FIT_BADGE_CLS: Record<"green" | "blue" | "zinc" | "amber" | "red", string> = {
  green: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  zinc: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  red: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

// GigFit tier badge — matches the mobile app (strong=green with ★, good=blue,
// open=neutral, poor=amber, ineligible=red).
function FitBadge({ fit }: { fit: GigFitResult }) {
  const label = fit.tier === "strong" ? `★ ${fit.label}` : fit.label;
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold ${FIT_BADGE_CLS[fitTierColor(fit.tier)]}`}>
      {label}
    </span>
  );
}
