import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getInsights, getDocuments, getPlan } from "@/lib/backoffice";
import {
  REPORT_META, buildReport, filterDocsByPeriod, isReportId,
  type ReportId, type BuiltReport,
} from "@/lib/reportDefs";
import { EarningsBars } from "@/components/app/charts";
import { ProBadge } from "@/components/app/pro";
import { type ReportData } from "@/components/app/ReportExport";
import ReportTable from "@/components/app/ReportTable";
import ReportBody from "@/components/app/ReportBody";
import TrackEvent from "@/components/TrackEvent";
import ExplorePro from "@/components/app/ExplorePro";

export const metadata: Metadata = {
  title: "Report",
  robots: { index: false, follow: false },
};

type Mode = "month" | "year";

function currentPeriod(mode: Mode): string {
  const n = new Date();
  return mode === "year" ? `${n.getFullYear()}` : `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
}
function shiftMonth(period: string, delta: number): string {
  const [y, m] = period.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
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

export default async function ReportDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ report: string }>;
  searchParams: Promise<{ mode?: string; p?: string }>;
}) {
  const { report } = await params;
  if (!isReportId(report)) notFound();
  const id = report as ReportId;
  const meta = REPORT_META[id];
  const sp = await searchParams;
  const plan = await getPlan();
  const isPro = plan === "pro";

  // Free users don't get the period switcher; they see the default period.
  const mode: Mode = isPro && sp.mode === "year" ? "year" : isPro && sp.mode === "month" ? "month" : meta.defaultMode;
  const current = currentPeriod(mode);
  const valid = sp.p && (mode === "year" ? /^\d{4}$/.test(sp.p) : /^\d{4}-\d{2}$/.test(sp.p));
  const period = isPro && valid ? sp.p! : current;

  const { start, end, bucket, label } = bounds(mode, period);
  const data = await getInsights(start, end, bucket);

  let docs: Awaited<ReturnType<typeof getDocuments>> = [];
  if (id === "documents" || id === "taxReady") {
    docs = filterDocsByPeriod(await getDocuments(), mode, period);
  }

  const built = buildReport(id, data, docs, Date.now());
  const hasRows = built.rows.length > 0;

  const reportData: ReportData = {
    title: meta.title,
    periodLabel: label,
    summary: built.summary,
    tables: [{ columns: built.columns, rows: built.rows }],
    note: built.note,
  };

  return (
    <div className="max-w-4xl">
      {/* Pro users see the real report (report_generated); free users see the
          preview (report_preview_open + the Pro reveal). Mirrors mobile's
          ReportDetailScreen instrumentation. */}
      {isPro ? (
        <TrackEvent event="report_generated" props={{ report: id, period: label }} />
      ) : (
        <>
          <TrackEvent event="report_preview_open" props={{ report_type: id }} />
          <TrackEvent event="report_pro_reveal_view" props={{ report_type: id }} />
        </>
      )}
      {/* Header */}
      <div className="mb-4">
        <Link href="/reports" className="inline-flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          Advanced Reports
        </Link>
        <div className="mt-2 flex items-center justify-between gap-3 flex-wrap">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{meta.title} <ProBadge /></h1>
          {isPro ? <PeriodNav id={id} mode={mode} period={period} current={current} /> : <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{label}</span>}
        </div>
      </div>

      {/* Summary cards */}
      <SummaryCards summary={built.summary} />

      {/* Body */}
      {isPro ? (
        hasRows ? (
          <ReportBody
            columns={built.columns}
            rows={built.rows}
            note={built.note}
            reportData={reportData}
            reportId={id}
          />
        ) : (
          <EmptyCard text={built.emptyText} />
        )
      ) : (
        <FreePreview id={id} meta={meta} built={built} data={data} mode={mode} />
      )}
    </div>
  );
}

/* ── period nav (Pro) ─────────────────────────────────────────────────────── */
function PeriodNav({ id, mode, period, current }: { id: ReportId; mode: Mode; period: string; current: string }) {
  const older = mode === "year" ? String(Number(period) - 1) : shiftMonth(period, -1);
  const newer = mode === "year" ? String(Number(period) + 1) : shiftMonth(period, 1);
  const href = (m: Mode, p: string) => `/reports/${id}?mode=${m}&p=${p}`;
  const atNewest = period >= current;
  const tab = (active: boolean) => `px-2.5 py-1 text-xs font-medium rounded-md ${active ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm" : "text-zinc-500 dark:text-zinc-400"}`;
  const monthP = mode === "month" ? period : `${period.slice(0, 4)}-01`;
  const yearP = period.slice(0, 4);
  const dispLabel = mode === "year" ? period : new Date(Number(period.split("-")[0]), Number(period.split("-")[1]) - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 p-0.5">
        <Link href={href("month", monthP)} className={tab(mode === "month")}>Month</Link>
        <Link href={href("year", yearP)} className={tab(mode === "year")}>Year</Link>
      </div>
      <div className="flex items-center gap-1">
        <Link href={href(mode, older)} className="h-7 w-7 grid place-items-center rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="Previous"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg></Link>
        <span className="min-w-[8rem] text-center text-sm font-semibold text-zinc-900 dark:text-zinc-100">{dispLabel}</span>
        {atNewest ? (
          <span className="h-7 w-7 grid place-items-center rounded-md text-zinc-300 dark:text-zinc-700"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg></span>
        ) : (
          <Link href={href(mode, newer)} className="h-7 w-7 grid place-items-center rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="Next"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg></Link>
        )}
      </div>
    </div>
  );
}

/* ── shared render bits ───────────────────────────────────────────────────── */
function SummaryCards({ summary }: { summary: { label: string; value: string }[] }) {
  const [hero, ...rest] = summary;
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 mb-4">
      <div className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">{hero.label}</div>
      <div className="mt-1 text-4xl font-extrabold text-blue-600 dark:text-blue-400">{hero.value}</div>
      {rest.length > 0 && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
          {rest.map((s) => (
            <div key={s.label}>
              <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{s.value}</div>
              <div className="text-xs text-zinc-400 dark:text-zinc-500">{s.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 p-10 text-center text-sm text-zinc-500 dark:text-zinc-400">{text}</div>
  );
}

/* ── free preview ─────────────────────────────────────────────────────────── */
function FreePreview({
  id, meta, built, data, mode,
}: {
  id: ReportId;
  meta: (typeof REPORT_META)[ReportId];
  built: BuiltReport;
  data: Awaited<ReturnType<typeof getInsights>>;
  mode: Mode;
}) {
  const previewChart =
    meta.previewKind === "trend"
      ? (id === "grossNet" ? (data?.payment_trend ?? []).map((t) => ({ label: bucketLabel(t.date, mode), value: t.received })) : (data?.trend ?? []).map((t) => ({ label: bucketLabel(t.date, mode), value: t.gross }))).slice(-4)
      : null;

  return (
    <div>
      <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{meta.preview.heading}</h2>
          <ProBadge />
        </div>

        {meta.previewKind === "trend" && (
          previewChart && previewChart.length > 0 ? (
            <>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-3">A limited look at how your recorded totals change.</p>
              <div className="relative">
                <EarningsBars data={previewChart} />
                <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-white dark:from-zinc-900 to-transparent" />
              </div>
            </>
          ) : (
            <p className="text-sm text-zinc-400 dark:text-zinc-500 py-6 text-center">Not enough data to chart yet.</p>
          )
        )}

        {meta.previewKind === "text" && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {id === "payments"
              ? "The complete report adds average payment time, outstanding aging, payment history and company payment patterns."
              : built.emptyText}
          </p>
        )}

        {meta.previewKind === "list" && (
          built.rows.length > 0 ? (
            <ReportTable columns={built.columns} rows={built.rows.slice(0, meta.previewRows ?? 3)} sortable={false} />
          ) : (
            <p className="text-sm text-zinc-400 dark:text-zinc-500 py-6 text-center">No records found for this period</p>
          )
        )}
      </section>

      {/* Locked promo */}
      <div className="rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/60 dark:bg-blue-950/20 p-5 text-center">
        <ProBadge />
        <h3 className="mt-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">{meta.preview.title}</h3>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300 max-w-md mx-auto">{meta.preview.copy}</p>
        <ExplorePro href="/pro?from=report_export" event="report_pro_cta_tap" props={{ report_type: id }}>
          Explore Pro →
        </ExplorePro>
      </div>
    </div>
  );
}
