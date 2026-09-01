import Link from "next/link";
import type { Metadata } from "next";
import { getInsights, getPlan } from "@/lib/backoffice";
import { money, shortDate } from "@/lib/format";
import { EarningsBars, AgingBars, PaidRing, type DonutSeg } from "@/components/app/charts";
import { PartialReveal, ProBadge } from "@/components/app/pro";
import InsightsPeriodNav from "@/components/app/InsightsPeriodNav";
import {
  careerPatterns,
  fillYearTrend,
  gigPaymentStatus,
  cappedGigPaid,
  periodCashLabel,
  periodStatusLabel,
} from "@/lib/insightsMetrics";
import type { InsightsOverview } from "@/lib/backoffice-types";

export const metadata: Metadata = {
  title: "Insights",
  robots: { index: false, follow: false },
};

type Mode = "month" | "year";
type Detail = "gigs" | "payments" | "status" | null;

function currentPeriod(mode: Mode): string {
  const n = new Date();
  return mode === "year" ? `${n.getFullYear()}` : `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
}

function bounds(mode: Mode, period: string) {
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  if (mode === "year") {
    const y = Number(period);
    return { start: fmt(new Date(y, 0, 1)), end: fmt(new Date(y + 1, 0, 1)), bucket: "year" as const, label: period, year: y };
  }
  const [y, m] = period.split("-").map(Number);
  return {
    start: fmt(new Date(y, m - 1, 1)),
    end: fmt(new Date(y, m, 1)),
    bucket: "month" as const,
    label: new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    year: y,
  };
}

function bucketLabel(dateStr: string): string {
  const [y, m, d] = dateStr.slice(0, 10).split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const AGING = [
  { key: "current", label: "Current", color: "#16a34a", lo: 0, hi: 15 },
  { key: "15-30", label: "15–30 days", color: "#2563eb", lo: 15, hi: 31 },
  { key: "31-60", label: "31–60 days", color: "#f59e0b", lo: 31, hi: 61 },
  { key: "60+", label: "60+ days", color: "#dc2626", lo: 61, hi: Infinity },
];

function hrefFor(mode: Mode, period: string, detail?: Detail) {
  const q = new URLSearchParams({ mode, p: period });
  if (detail) q.set("detail", detail);
  return `/insights?${q.toString()}`;
}

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; p?: string; detail?: string }>;
}) {
  const sp = await searchParams;
  const mode: Mode = sp.mode === "month" ? "month" : "year";
  const current = currentPeriod(mode);
  const plan = await getPlan();

  const requested = sp.p && (mode === "year" ? /^\d{4}$/.test(sp.p) : /^\d{4}-\d{2}$/.test(sp.p)) ? sp.p : current;
  const period = plan === "pro" ? requested : current;
  const detail: Detail = sp.detail === "gigs" || sp.detail === "payments" || sp.detail === "status" ? sp.detail : null;

  const { start, end, bucket, label, year } = bounds(mode, period);
  const data = await getInsights(start, end, bucket);

  const status = gigPaymentStatus(data);
  const career = careerPatterns(data);
  const chartData =
    mode === "year"
      ? fillYearTrend(data?.trend, year)
      : (data?.trend ?? []).map((t) => ({ label: bucketLabel(t.date), value: t.gross }));

  const now = Date.now();
  const agingTotals = new Map<string, number>();
  for (const o of data?.outstanding_items ?? []) {
    const days = Math.max(0, Math.floor((now - new Date(o.worked_date + "T00:00:00").getTime()) / 864e5));
    const bkt = AGING.find((a) => days >= a.lo && days < a.hi) ?? AGING[AGING.length - 1];
    agingTotals.set(bkt.key, (agingTotals.get(bkt.key) ?? 0) + o.outstanding);
  }
  const agingSegs: DonutSeg[] = AGING.map((a) => ({ label: a.label, color: a.color, value: agingTotals.get(a.key) ?? 0 })).filter((s) => s.value > 0);
  const agingTotal = agingSegs.reduce((s, x) => s + x.value, 0);
  const over60Pct = agingTotal > 0 ? Math.round(((agingTotals.get("60+") ?? 0) / agingTotal) * 100) : 0;

  const daysWorked = data?.days_worked ?? 0;
  const gigsWorked = data?.gigs_worked ?? 0;
  const paymentCount = data?.payment_count ?? 0;
  const netComplete = data?.net_complete_payments ?? 0;
  const empty = gigsWorked === 0 && paymentCount === 0;

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-5 gap-4 flex-wrap">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Insights</h1>
        <InsightsPeriodNav mode={mode} period={period} current={current} plan={plan} />
      </div>

      {empty ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 p-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
          No worked days or payments recorded for {label}.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Card>
              <div className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Earnings</div>
              <div className="mt-1 text-4xl font-extrabold tracking-tight text-blue-600 dark:text-blue-400">
                {money(status.grossEarned, true)}
              </div>
              <div className="mt-1 text-sm text-zinc-400 dark:text-zinc-500">Gross earned</div>
            </Card>

            <Card>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Work activity</div>
              <div className="mt-3 grid grid-cols-2 gap-4">
                <div>
                  <div className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-100">{daysWorked}</div>
                  <div className="mt-0.5 text-sm text-zinc-400 dark:text-zinc-500">Days worked</div>
                </div>
                <Link href={hrefFor(mode, period, "gigs")} className="group min-w-0">
                  <div className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">{gigsWorked}</div>
                  <div className="mt-0.5 text-sm text-blue-600 dark:text-blue-400 group-hover:underline">
                    Gigs worked <Chevron />
                  </div>
                </Link>
              </div>
            </Card>

            <Card className="md:col-span-2">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div>
                  <div className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Earnings trend</div>
                  <div className="text-sm text-zinc-400 dark:text-zinc-500">Monthly gross earnings</div>
                </div>
                <ProBadge />
              </div>
              {chartData.some((d) => d.value > 0) ? (
                <EarningsBars data={chartData} height={mode === "year" ? 140 : 160} />
              ) : (
                <p className="text-sm text-zinc-400 dark:text-zinc-500 py-8 text-center">No earnings to chart for {label}.</p>
              )}
            </Card>

            <Link href={hrefFor(mode, period, "payments")} className="block group">
              <Card className="h-full transition-colors group-hover:border-zinc-300 dark:group-hover:border-zinc-700">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Payments received</div>
                  <span className="text-zinc-300 dark:text-zinc-600 group-hover:text-zinc-500"><Chevron /></span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">{money(data?.received ?? 0, true)}</div>
                    <div className="mt-0.5 text-sm text-zinc-400 dark:text-zinc-500">Gross received</div>
                  </div>
                  <div>
                    <div className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-100">{money(data?.net_recorded ?? 0, true)}</div>
                    <div className="mt-0.5 text-sm text-zinc-400 dark:text-zinc-500">Net received</div>
                  </div>
                </div>
                <p className="mt-3 text-sm text-zinc-400 dark:text-zinc-500">
                  {paymentCount} {paymentCount === 1 ? "payment" : "payments"} received in {label}
                  {paymentCount > 0 && netComplete < paymentCount && (
                    <> · Net recorded for {netComplete} of {paymentCount}</>
                  )}
                </p>
                <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">{periodCashLabel(mode, label)}</p>
              </Card>
            </Link>

            <Link href={hrefFor(mode, period, "status")} className="block group">
              <Card className="h-full transition-colors group-hover:border-zinc-300 dark:group-hover:border-zinc-700">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Gig payment status</div>
                  <span className="text-zinc-300 dark:text-zinc-600 group-hover:text-zinc-500"><Chevron /></span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-3xl font-extrabold text-green-600 dark:text-green-400">{money(status.paid, true)}</div>
                    <div className="mt-0.5 text-sm text-zinc-400 dark:text-zinc-500">Paid</div>
                  </div>
                  <PaidRing percent={status.percent} />
                  <div className="min-w-0 text-right">
                    <div className="text-3xl font-extrabold text-orange-500">{money(status.outstanding, true)}</div>
                    <div className="mt-0.5 text-sm text-zinc-400 dark:text-zinc-500">Outstanding</div>
                  </div>
                </div>
                <p className="mt-3 text-sm text-zinc-400 dark:text-zinc-500">{periodStatusLabel(mode, label)}</p>
              </Card>
            </Link>

            <Card className="md:col-span-2">
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Career patterns</div>
                <ProBadge />
              </div>
              {gigsWorked === 0 ? (
                <p className="text-sm text-zinc-400 dark:text-zinc-500">No work-date earnings in {label} to summarize.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Average per workday</div>
                    <div className="mt-1 text-3xl font-extrabold text-zinc-900 dark:text-zinc-100">{money(career.averagePerWorkday, true)}</div>
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Top company</div>
                    <div className="mt-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                      {career.topCompany ? `${career.topCompany.name} · ${money(career.topCompany.gross, true)}` : "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Top project</div>
                    <div className="mt-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                      {career.topProject ? `${career.topProject.name} · ${money(career.topProject.gross, true)}` : "—"}
                    </div>
                  </div>
                </div>
              )}
              <p className="mt-4 text-xs text-zinc-400 dark:text-zinc-500">Advanced analysis included with Pro</p>
            </Card>
          </div>

          {detail && (
            <DetailPanel mode={mode} period={period} label={label} detail={detail} data={data} />
          )}

          <Card className="mb-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Where is my unpaid money?</div>
            <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500 mb-4">
              Aging of currently outstanding earnings from {label} gigs — not cash received during {label}.
            </p>
            {agingSegs.length > 0 ? (
              <>
                <div className="mb-3">
                  <div className="text-xl font-bold text-amber-600 dark:text-amber-400">{money(agingTotal)}</div>
                  <div className="text-xs text-zinc-400 dark:text-zinc-500">
                    outstanding{over60Pct > 0 && <> · <span className="font-medium text-zinc-600 dark:text-zinc-300">{over60Pct}% for 60+ days</span></>}
                  </div>
                </div>
                <AgingBars segments={agingSegs} />
              </>
            ) : (
              <p className="text-sm text-zinc-400 dark:text-zinc-500 py-4">Nothing outstanding on this gig cohort — you&rsquo;re all paid up.</p>
            )}
          </Card>

          {(data?.companies.length || data?.projects.length) ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6">
              {(data?.companies.length ?? 0) > 0 && (
                <Section title="Who am I earning the most from?">
                  <Ranked rows={data!.companies} />
                </Section>
              )}
              {(data?.projects.length ?? 0) > 0 && (
                <Section title="Which projects earned the most?">
                  <Ranked rows={data!.projects} />
                </Section>
              )}
            </div>
          ) : null}

          <Link
            href="/reports"
            className="mb-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 flex items-center justify-between gap-3 hover:border-blue-300 dark:hover:border-blue-800 transition-colors"
          >
            <div>
              <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Advanced Reports</div>
              <div className="text-xs text-zinc-400 dark:text-zinc-500">Earnings, payments, gross vs net, company &amp; project — export to PDF or CSV.</div>
            </div>
            <span className="shrink-0 text-sm font-medium text-blue-600 dark:text-blue-400">Open reports →</span>
          </Link>

          <PartialReveal
            context="insights_history"
            plan={plan}
            lockedCta="Unlock your complete history — year-over-year trends, payment speed & reports"
            free={<p className="text-sm text-zinc-500 dark:text-zinc-400">Showing {label}. GigDock keeps <strong className="font-medium text-zinc-700 dark:text-zinc-300">all</strong> of your history.</p>}
          />
        </>
      )}
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 ${className}`}>
      {children}
    </section>
  );
}

function Chevron() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="inline-block align-[-1px]" aria-hidden>
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 mb-2">{title}</h2>
      {children}
    </section>
  );
}

function Ranked({ rows }: { rows: { id: string | null; name: string; gross: number; gig_count: number; days_worked: number }[] }) {
  const max = Math.max(...rows.map((r) => r.gross), 1);
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800">
      {rows.map((r, i) => (
        <div key={r.id ?? `none-${i}`} className="px-4 py-3">
          <div className="flex items-center justify-between gap-4 mb-1.5">
            <div className="font-medium text-zinc-800 dark:text-zinc-200 truncate">{r.name}</div>
            <div className="shrink-0 text-sm font-medium text-zinc-800 dark:text-zinc-200">{money(r.gross)}</div>
          </div>
          <div className="h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
            <div className="h-full rounded-full bg-blue-500/70" style={{ width: `${Math.round((r.gross / max) * 100)}%` }} />
          </div>
          <div className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
            {r.gig_count} {r.gig_count === 1 ? "gig" : "gigs"} · {r.days_worked} {r.days_worked === 1 ? "day" : "days"}
          </div>
        </div>
      ))}
    </div>
  );
}

function DetailPanel({
  mode,
  period,
  label,
  detail,
  data,
}: {
  mode: Mode;
  period: string;
  label: string;
  detail: Exclude<Detail, null>;
  data: InsightsOverview | null;
}) {
  const close = hrefFor(mode, period);
  const title =
    detail === "gigs" ? `Gigs worked in ${label}` :
    detail === "payments" ? `Payments received in ${label}` :
    `Payment status of ${label} gigs`;
  const reportHref =
    detail === "payments"
      ? `/reports/payments?mode=${mode}&p=${period}`
      : `/reports/gigs?mode=${mode}&p=${period}`;

  return (
    <section id="detail" className="mb-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
      <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{title}</h2>
        <div className="flex items-center gap-3 text-sm">
          <Link href={reportHref} className="text-blue-600 dark:text-blue-400 hover:underline">Open report</Link>
          <Link href={close} className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200">Close</Link>
        </div>
      </div>
      {detail === "payments" ? (
        <PaymentRows payments={data?.payments ?? []} />
      ) : (
        <GigRows gigs={data?.gigs ?? []} showStatus={detail === "status"} />
      )}
    </section>
  );
}

function GigRows({
  gigs,
  showStatus,
}: {
  gigs: InsightsOverview["gigs"];
  showStatus: boolean;
}) {
  if (gigs.length === 0) {
    return <p className="px-5 py-8 text-sm text-zinc-400 dark:text-zinc-500 text-center">No gigs in this period.</p>;
  }
  return (
    <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
      {gigs.map((g) => {
        const paid = cappedGigPaid(g);
        return (
          <li key={g.gig_id}>
            <Link href={`/gigs/${g.gig_id}`} className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
              <div className="min-w-0">
                <div className="font-medium text-zinc-800 dark:text-zinc-200 truncate">{g.title || "Untitled gig"}</div>
                <div className="text-xs text-zinc-400 dark:text-zinc-500">
                  {shortDate(g.first_worked_date)} – {shortDate(g.last_worked_date)} · {g.days_worked} {g.days_worked === 1 ? "day" : "days"}
                </div>
              </div>
              {showStatus ? (
                <div className="shrink-0 text-right text-sm">
                  <div className="font-medium text-zinc-800 dark:text-zinc-200">{money(g.gross)}</div>
                  <div className="text-xs">
                    <span className="text-green-600 dark:text-green-400">{money(paid)} paid</span>
                    {g.outstanding > 0 && <span className="text-orange-500"> · {money(g.outstanding)} due</span>}
                  </div>
                </div>
              ) : (
                <div className="shrink-0 text-sm font-medium text-zinc-800 dark:text-zinc-200">{money(g.gross)}</div>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function PaymentRows({ payments }: { payments: NonNullable<InsightsOverview["payments"]> }) {
  if (payments.length === 0) {
    return <p className="px-5 py-8 text-sm text-zinc-400 dark:text-zinc-500 text-center">No payments received in this period.</p>;
  }
  return (
    <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
      {payments.map((p, i) => (
        <li key={`${p.pay_date}-${p.title}-${i}`} className="flex items-center justify-between gap-4 px-5 py-3">
          <div className="min-w-0">
            <div className="font-medium text-zinc-800 dark:text-zinc-200 truncate">{p.title || "Payment"}</div>
            <div className="text-xs text-zinc-400 dark:text-zinc-500">{shortDate(p.pay_date)}</div>
          </div>
          <div className="shrink-0 text-right text-sm">
            <div className="font-medium text-zinc-800 dark:text-zinc-200">{money(p.gross)}</div>
            <div className="text-xs text-zinc-400 dark:text-zinc-500">
              {p.net != null && p.net > 0 ? `Net ${money(p.net)}` : "Net not recorded"}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
