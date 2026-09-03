import type { Metadata } from "next";
import { getPlan } from "@/lib/backoffice";
import { REPORT_GROUPS } from "@/lib/reportDefs";
import { ProBadge } from "@/components/app/pro";
import TrackEvent from "@/components/TrackEvent";
import ReportRowLink from "@/components/app/ReportRowLink";

export const metadata: Metadata = {
  title: "Advanced Reports",
  robots: { index: false, follow: false },
};

export default async function ReportsPage() {
  const plan = await getPlan();
  return (
    <div className="max-w-3xl">
      <TrackEvent event="advanced_reports_open" props={{ plan }} />
      <header className="mb-1 flex items-center gap-2">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Advanced Reports</h1>
        <ProBadge />
      </header>
      <p className="mb-5 text-sm text-zinc-500 dark:text-zinc-400">Create detailed reports from your GigDock records.</p>

      {REPORT_GROUPS.map((g) => (
        <section key={g.group} className="mb-5">
          <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">{g.group}</h2>
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800">
            {g.reports.map((r) => (
              <ReportRowLink key={r.id} reportId={r.id} title={r.title} description={r.description} />
            ))}
          </div>
        </section>
      ))}

      {plan !== "pro" && (
        <div className="rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/60 dark:bg-blue-950/20 px-4 py-3 text-sm text-blue-800 dark:text-blue-200">
          Detailed reports are included with <strong>GigDock Pro</strong>. Choose any report above to preview the Pro experience.
        </div>
      )}
    </div>
  );
}
