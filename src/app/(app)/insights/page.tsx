import Link from "next/link";
import type { Metadata } from "next";
import { getInsights, getPlan } from "@/lib/backoffice";
import { money } from "@/lib/format";
import { EarningsBars, AgingBars, type DonutSeg } from "@/components/app/charts";
import { PartialReveal } from "@/components/app/pro";
import InsightsPeriodNav from "@/components/app/InsightsPeriodNav";

export const metadata: Metadata = {
  title: "Insights",
  robots: { index: false, follow: false },
};

type Mode = "month" | "year";

function currentPeriod(mode: Mode): string {
  const n = new Date();
  return mode === "year" ? `${n.getFullYear()}` : `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
}

function bounds(mode: Mode, period: string) {
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  if (mode === "year") {
    const y = Number(period);
    return { start: fmt(new Date(y, 0, 1)), end: fmt(new Date(y + 1, 0, 1)), bucket: "year" as const, label: period };
  }
  const [y, m] = period.split("-").map(Number);
  return { start: fmt(new Date(y, m - 1, 1)), end: fmt(new Date(y, m, 1)), bucket: "month" as const, label: new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" }) };
}

function bucketLabel(dateStr: string, mode: Mode): string {
  const [y, m, d] = dateStr.slice(0, 10).split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  return mode === "month" ? dt.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : dt.toLocaleDateString("en-US", { month: "short" });
}

const AGING = [
  { key: "current", label: "Current", color: "#16a34a", lo: 0, hi: 15 },
  { key: "15-30", label: "15–30 days", color: "#2563eb", lo: 15, hi: 31 },
  { key: "31-60", label: "31–60 days", color: "#f59e0b", lo: 31, hi: 61 },
  { key: "60+", label: "60+ days", color: "#dc2626", lo: 61, hi: Infinity },
];

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; p?: string }>;
}) {
  const sp = await searchParams;
  const mode: Mode = sp.mode === "year" ? "year" : "month";
  const current = currentPeriod(mode);
  const plan = await getPlan();

  // Free plan is clamped to the current period (Complete History is Pro).
  const requested = sp.p && (mode === "year" ? /^\d{4}$/.test(sp.p) : /^\d{4}-\d{2}$/.test(sp.p)) ? sp.p : current;
  const period = plan === "pro" ? requested : current;

  const { start, end, bucket, label } = bounds(mode, period);
  const data = await getInsights(start, end, bucket);

  const chartData = (data?.trend ?? []).map((t) => ({ label: bucketLabel(t.date, mode), value: t.gross }));

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

  const gross = data?.gross_earned ?? 0;
  const net = data?.net_recorded ?? 0;
  const paidGigs = data?.paid_gigs ?? 0;
  const netGigs = data?.net_complete_gigs ?? 0;

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-5 gap-4 flex-wrap">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Insights</h1>
        <InsightsPeriodNav mode={mode} period={period} current={current} plan={plan} />
      </div>

      {!data || data.gigs_worked === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 p-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
          No worked days recorded for {label}.
        </div>
      ) : (
        <>
          {/* Financial hero */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 mb-4">
            <div className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Earned · {label}</div>
            <div className="mt-1 text-4xl font-extrabold text-zinc-900 dark:text-zinc-100">{money(data.gross_earned)}</div>
            <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <span><span className="font-semibold text-green-600 dark:text-green-400">{money(data.received)}</span> <span className="text-zinc-500 dark:text-zinc-400">Received</span></span>
              <span><span className={`font-semibold ${data.outstanding > 0 ? "text-amber-600 dark:text-amber-400" : "text-zinc-700 dark:text-zinc-200"}`}>{money(data.outstanding)}</span> <span className="text-zinc-500 dark:text-zinc-400">Outstanding</span></span>
              <span className="text-zinc-500 dark:text-zinc-400">{data.days_worked} work {data.days_worked === 1 ? "day" : "days"} · {money(data.average_per_work_day)}/day</span>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-4">
            <Panel title="How are my earnings changing?" className="lg:col-span-3">
              <div className="px-5 pb-5">
                {chartData.length > 0 ? <EarningsBars data={chartData} /> : <p className="text-sm text-zinc-400 dark:text-zinc-500 py-8 text-center">Not enough data to chart yet.</p>}
              </div>
            </Panel>
            <Panel title="Where is my unpaid money?" className="lg:col-span-2">
              <div className="px-5 pb-5">
                {agingSegs.length > 0 ? (
                  <>
                    <div className="mb-3">
                      <div className="text-xl font-bold text-amber-600 dark:text-amber-400">{money(agingTotal)}</div>
                      <div className="text-xs text-zinc-400 dark:text-zinc-500">outstanding{over60Pct > 0 && <> · <span className="font-medium text-zinc-600 dark:text-zinc-300">{over60Pct}% for 60+ days</span></>}</div>
                    </div>
                    <AgingBars segments={agingSegs} />
                  </>
                ) : (
                  <p className="text-sm text-zinc-400 dark:text-zinc-500 py-8 text-center">Nothing outstanding — you&rsquo;re all paid up.</p>
                )}
              </div>
            </Panel>
          </div>

          {/* Gross vs Net (honest) */}
          <Panel title="Gross vs net" className="mb-4">
            <div className="px-5 pb-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">Gross earned</div>
                  <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{money(gross)}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">Net recorded</div>
                  <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{money(net)}</div>
                </div>
              </div>
              {paidGigs > 0 && netGigs < paidGigs && (
                <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">Net recorded for {netGigs} of {paidGigs} paid {paidGigs === 1 ? "gig" : "gigs"} — we never estimate missing net.</p>
              )}
            </div>
          </Panel>

          {/* Company / project — framed as questions */}
          {(data.companies.length > 0 || data.projects.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6">
              {data.companies.length > 0 && <Section title="Who am I earning the most from?"><Ranked rows={data.companies} /></Section>}
              {data.projects.length > 0 && <Section title="Which projects earned the most?"><Ranked rows={data.projects} /></Section>}
            </div>
          )}

          {/* Reports — entry to the Advanced Reports catalog */}
          <Link href="/reports" className="mb-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 flex items-center justify-between gap-3 hover:border-blue-300 dark:hover:border-blue-800 transition-colors">
            <div>
              <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Advanced Reports</div>
              <div className="text-xs text-zinc-400 dark:text-zinc-500">Earnings, payments, gross vs net, company &amp; project — export to PDF or CSV.</div>
            </div>
            <span className="shrink-0 text-sm font-medium text-blue-600 dark:text-blue-400">Open reports →</span>
          </Link>

          {/* Complete history — one tasteful reveal */}
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

function Panel({ title, className = "", children }: { title: string; className?: string; children: React.ReactNode }) {
  return (
    <section className={`rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 ${className}`}>
      <div className="px-5 pt-4 pb-3"><h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{title}</h2></div>
      {children}
    </section>
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
          <div className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">{r.gig_count} {r.gig_count === 1 ? "gig" : "gigs"} · {r.days_worked} {r.days_worked === 1 ? "day" : "days"}</div>
        </div>
      ))}
    </div>
  );
}
