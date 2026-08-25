import Link from "next/link";
import type { Metadata } from "next";
import { getInsights } from "@/lib/backoffice";
import { money } from "@/lib/format";
import { EarnedReceivedChart, Donut, type DonutSeg } from "@/components/app/charts";

export const metadata: Metadata = {
  title: "Insights",
  robots: { index: false, follow: false },
};

type Range = "month" | "ytd" | "12mo";

function bounds(range: Range) {
  const now = new Date();
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  if (range === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return { start: fmt(start), end: fmt(end), label: now.toLocaleDateString("en-US", { month: "long" }), bucket: "month" as const };
  }
  if (range === "12mo") {
    const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return { start: fmt(start), end: fmt(end), label: "Last 12 months", bucket: "year" as const };
  }
  const start = new Date(now.getFullYear(), 0, 1);
  const end = new Date(now.getFullYear() + 1, 0, 1);
  return { start: fmt(start), end: fmt(end), label: `${now.getFullYear()}`, bucket: "year" as const };
}

function bucketLabel(dateStr: string, range: Range): string {
  const [y, m, d] = dateStr.slice(0, 10).split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  return range === "month"
    ? dt.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : dt.toLocaleDateString("en-US", { month: "short" });
}

const AGING: { key: string; label: string; color: string; lo: number; hi: number }[] = [
  { key: "current", label: "Current", color: "#16a34a", lo: 0, hi: 15 },
  { key: "15-30", label: "15–30 days", color: "#2563eb", lo: 15, hi: 31 },
  { key: "31-60", label: "31–60 days", color: "#f59e0b", lo: 31, hi: 61 },
  { key: "60+", label: "60+ days", color: "#dc2626", lo: 61, hi: Infinity },
];

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const sp = await searchParams;
  const range: Range = sp.range === "12mo" ? "12mo" : sp.range === "month" ? "month" : "ytd";
  const { start, end, label, bucket } = bounds(range);
  const data = await getInsights(start, end, bucket);

  // Merge earnings + payment trends into one Earned-vs-Received series.
  const byDate = new Map<string, { earned: number; received: number }>();
  for (const t of data?.trend ?? []) byDate.set(t.date, { earned: t.gross, received: byDate.get(t.date)?.received ?? 0 });
  for (const p of data?.payment_trend ?? []) byDate.set(p.date, { earned: byDate.get(p.date)?.earned ?? 0, received: p.received });
  const chartData = [...byDate.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, v]) => ({ label: bucketLabel(date, range), earned: v.earned, received: v.received }));

  // Outstanding by age (days since the work day).
  const now = Date.now();
  const agingTotals = new Map<string, number>();
  for (const o of data?.outstanding_items ?? []) {
    const days = Math.max(0, Math.floor((now - new Date(o.worked_date + "T00:00:00").getTime()) / 864e5));
    const bkt = AGING.find((a) => days >= a.lo && days < a.hi) ?? AGING[AGING.length - 1];
    agingTotals.set(bkt.key, (agingTotals.get(bkt.key) ?? 0) + o.outstanding);
  }
  const agingSegs: DonutSeg[] = AGING.map((a) => ({ label: a.label, color: a.color, value: agingTotals.get(a.key) ?? 0 })).filter((s) => s.value > 0);

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-5 gap-4 flex-wrap">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Insights</h1>
        <div className="flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-zinc-800 p-0.5 bg-white dark:bg-zinc-900">
          <RangeTab active={range === "month"} href="/insights?range=month">This month</RangeTab>
          <RangeTab active={range === "ytd"} href="/insights">This year</RangeTab>
          <RangeTab active={range === "12mo"} href="/insights?range=12mo">Last 12 months</RangeTab>
        </div>
      </div>

      {!data || data.gigs_worked === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 p-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
          No worked days recorded for {label}.
        </div>
      ) : (
        <>
          {/* Headline stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <Stat label="Earned" value={money(data.gross_earned)} />
            <Stat label="Received" value={money(data.received)} accent="green" />
            <Stat label="Outstanding" value={money(data.outstanding)} accent={data.outstanding > 0 ? "amber" : "green"} />
            <Stat label="Avg / work day" value={money(data.average_per_work_day)} />
          </div>

          {/* Charts: Earned vs Received + Outstanding aging */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
            <Panel title="Earned vs received" className="lg:col-span-3">
              <div className="px-5 pb-5">
                {chartData.length > 0 ? (
                  <EarnedReceivedChart data={chartData} />
                ) : (
                  <p className="text-sm text-zinc-400 dark:text-zinc-500 py-8 text-center">Not enough data to chart yet.</p>
                )}
              </div>
            </Panel>
            <Panel title="Outstanding by age" className="lg:col-span-2">
              <div className="px-5 pb-5">
                {agingSegs.length > 0 ? (
                  <Donut segments={agingSegs} centerLabel="outstanding" />
                ) : (
                  <p className="text-sm text-zinc-400 dark:text-zinc-500 py-8 text-center">Nothing outstanding — you&rsquo;re all paid up.</p>
                )}
              </div>
            </Panel>
          </div>

          {/* Company / project */}
          {(data.companies.length > 0 || data.projects.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6">
              {data.companies.length > 0 && <Section title="By company"><Ranked rows={data.companies} /></Section>}
              {data.projects.length > 0 && <Section title="By project"><Ranked rows={data.projects} /></Section>}
            </div>
          )}

          {/* Outstanding items */}
          {data.outstanding_items.length > 0 && (
            <Section title="Outstanding gigs">
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800">
                {data.outstanding_items.map((o) => (
                  <Link key={o.gig_id} href={`/payments/${o.gig_id}`} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <div className="min-w-0">
                      <div className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{o.title}</div>
                      <div className="text-xs text-zinc-400 dark:text-zinc-500">{money(o.received)} of {money(o.earned)} received</div>
                    </div>
                    <div className="shrink-0 font-medium text-amber-600 dark:text-amber-400">{money(o.outstanding)}</div>
                  </Link>
                ))}
              </div>
            </Section>
          )}
        </>
      )}
    </div>
  );
}

function RangeTab({ active, href, children }: { active: boolean; href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${active ? "bg-blue-600 text-white" : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}>
      {children}
    </Link>
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

function Stat({ label, value, accent }: { label: string; value: string; accent?: "amber" | "green" }) {
  const valueCls = accent === "amber" ? "text-amber-600 dark:text-amber-400" : accent === "green" ? "text-green-600 dark:text-green-400" : "text-zinc-900 dark:text-zinc-100";
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
      <div className="text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">{label}</div>
      <div className={`text-lg font-semibold mt-1 ${valueCls}`}>{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-2">{title}</h2>
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
