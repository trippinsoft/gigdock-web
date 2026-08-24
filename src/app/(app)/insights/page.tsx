import Link from "next/link";
import type { Metadata } from "next";
import { getInsights } from "@/lib/backoffice";
import type { InsightsOverview } from "@/lib/backoffice-types";
import { money } from "@/lib/format";

export const metadata: Metadata = {
  title: "Insights",
  robots: { index: false, follow: false },
};

type Range = "ytd" | "12mo";

function bounds(range: Range) {
  const now = new Date();
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  if (range === "12mo") {
    const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return { start: fmt(start), end: fmt(end), label: "Last 12 months" };
  }
  const start = new Date(now.getFullYear(), 0, 1);
  const end = new Date(now.getFullYear() + 1, 0, 1);
  return { start: fmt(start), end: fmt(end), label: `${now.getFullYear()}` };
}

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const sp = await searchParams;
  const range: Range = sp.range === "12mo" ? "12mo" : "ytd";
  const { start, end, label } = bounds(range);
  const data = await getInsights(start, end, "year");

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-5 gap-4 flex-wrap">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Insights</h1>
        <div className="flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-zinc-800 p-0.5 bg-white dark:bg-zinc-900">
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <Stat label="Earned" value={money(data.gross_earned)} />
            <Stat label="Received" value={money(data.received)} />
            <Stat label="Outstanding" value={money(data.outstanding)} accent={data.outstanding > 0 ? "amber" : "green"} />
            <Stat label="Avg / work day" value={money(data.average_per_work_day)} />
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
            {data.gigs_worked} {data.gigs_worked === 1 ? "gig" : "gigs"} · {data.days_worked} {data.days_worked === 1 ? "day" : "days"} worked in {label}
          </p>

          {/* Trend */}
          {data.trend.length > 0 && (
            <Section title="Earnings by month">
              <TrendChart trend={data.trend} />
            </Section>
          )}

          {/* Top companies */}
          {data.companies.length > 0 && (
            <Section title="By company">
              <Ranked rows={data.companies} />
            </Section>
          )}

          {/* Top projects */}
          {data.projects.length > 0 && (
            <Section title="By project">
              <Ranked rows={data.projects} />
            </Section>
          )}

          {/* Outstanding */}
          {data.outstanding_items.length > 0 && (
            <Section title="Outstanding">
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800">
                {data.outstanding_items.map((o) => (
                  <Link
                    key={o.gig_id}
                    href={`/gigs/${o.gig_id}`}
                    className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{o.title}</div>
                      <div className="text-xs text-zinc-400 dark:text-zinc-500">
                        {money(o.received)} of {money(o.earned)} received
                      </div>
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
    <Link
      href={href}
      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
        active
          ? "bg-blue-600 text-white"
          : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
      }`}
    >
      {children}
    </Link>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: "amber" | "green" }) {
  const valueCls =
    accent === "amber"
      ? "text-amber-600 dark:text-amber-400"
      : accent === "green"
        ? "text-green-600 dark:text-green-400"
        : "text-zinc-900 dark:text-zinc-100";
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

function TrendChart({ trend }: { trend: { date: string; gross: number }[] }) {
  const max = Math.max(...trend.map((t) => t.gross), 1);
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
      <div className="flex items-end gap-1.5 h-40">
        {trend.map((t) => {
          const h = Math.max(Math.round((t.gross / max) * 100), t.gross > 0 ? 4 : 0);
          const [, m] = t.date.split("-");
          const monthLabel = new Date(2000, Number(m) - 1, 1).toLocaleDateString("en-US", { month: "short" });
          return (
            <div key={t.date} className="flex-1 flex flex-col items-center gap-1 min-w-0">
              <div className="w-full flex items-end justify-center h-full">
                <div
                  className="w-full max-w-[28px] rounded-t bg-blue-500 dark:bg-blue-500/80"
                  style={{ height: `${h}%` }}
                  title={`${monthLabel}: ${money(t.gross)}`}
                />
              </div>
              <div className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate w-full text-center">{monthLabel}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Ranked({
  rows,
}: {
  rows: { id: string | null; name: string; gross: number; gig_count: number; days_worked: number }[];
}) {
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
