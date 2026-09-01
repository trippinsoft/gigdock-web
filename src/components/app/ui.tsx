// Reusable desktop primitives for the back-office workspace.
// Server-renderable (no "use client") — pure presentation.

import Link from "next/link";
import type { PayStatus } from "@/lib/gigBuckets";

/** A compact KPI tile for dashboard grids. Optional href makes it actionable. */
export function MetricCard({
  label,
  value,
  sub,
  tone = "default",
  href,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "amber" | "green" | "blue";
  href?: string;
}) {
  const valueCls =
    tone === "amber"
      ? "text-amber-600 dark:text-amber-400"
      : tone === "green"
        ? "text-green-600 dark:text-green-400"
        : tone === "blue"
          ? "text-blue-600 dark:text-blue-400"
          : "text-zinc-900 dark:text-zinc-100";
  const inner = (
    <>
      <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${valueCls}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">{sub}</div>}
    </>
  );
  const cls =
    "rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4";
  return href ? (
    <Link href={href} className={`${cls} block transition-colors hover:border-zinc-300 dark:hover:border-zinc-700`}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

const PAY_STATUS: Record<PayStatus, { label: string; cls: string }> = {
  paid: { label: "Paid", cls: "bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-900" },
  partial: { label: "Partial", cls: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900" },
  unpaid: { label: "Unpaid", cls: "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700" },
};

export function StatusPill({ status, small }: { status: PayStatus; small?: boolean }) {
  const s = PAY_STATUS[status];
  return (
    <span className={`inline-flex shrink-0 items-center rounded border font-semibold uppercase tracking-wide ${small ? "px-1 py-0.5 text-[10px]" : "px-1.5 py-0.5 text-[11px]"} ${s.cls}`}>
      {s.label}
    </span>
  );
}

/** A titled panel used inside dashboards and gig sections. */
export function Panel({
  title,
  action,
  children,
  className = "",
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 ${className}`}>
      {title && (
        <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
