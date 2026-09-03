"use client";

import Link from "next/link";
import { track } from "@/lib/analytics";
import { ProBadge } from "@/components/app/pro";

// Client wrapper for the Advanced Reports catalog rows so we can fire
// report_selected (mobile-mirrored) on the outbound click, matching mobile's
// AdvancedReportsScreen instrumentation.
export default function ReportRowLink({
  reportId,
  title,
  description,
}: {
  reportId: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={`/reports/${reportId}`}
      onClick={() => track("report_selected", { report: reportId })}
      className="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2 font-medium text-zinc-900 dark:text-zinc-100">
          {title} <ProBadge />
        </div>
        <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{description}</div>
      </div>
      <svg className="shrink-0 text-zinc-400" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
    </Link>
  );
}
