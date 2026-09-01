"use client";

// Reusable monetization primitives (Part XV reveal patterns). Build the locks
// once, use everywhere. All fire monetization analytics. Free users see a
// useful preview + a path to Pro; Pro users see the real thing.

import Link from "next/link";
import { createContext, useContext, useEffect, useRef } from "react";
import { trackPro, type ProContextTag } from "@/lib/monetization";

/* ── plan context ──────────────────────────────────────────────────────────── */

const PlanCtx = createContext<"free" | "pro">("free");
export function ProProvider({ plan, children }: { plan: "free" | "pro"; children: React.ReactNode }) {
  return <PlanCtx.Provider value={plan}>{children}</PlanCtx.Provider>;
}
export function usePlan() { return useContext(PlanCtx); }
export function useIsPro() { return useContext(PlanCtx) === "pro"; }

/* ── badge ─────────────────────────────────────────────────────────────────── */

export function ProBadge({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 ${className}`}>
      Pro
    </span>
  );
}

/* ── shared bits ───────────────────────────────────────────────────────────── */

function useImpression(context: ProContextTag, when: boolean) {
  const fired = useRef(false);
  useEffect(() => {
    if (when && !fired.current) {
      fired.current = true;
      trackPro("pro_preview_impression", context);
    }
  }, [when, context]);
}

function ProCta({ context, children }: { context: ProContextTag; children: React.ReactNode }) {
  return (
    <Link
      href={`/pro?from=${context}`}
      onClick={() => trackPro("pro_preview_clicked", context)}
      className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 dark:text-blue-300 hover:underline"
    >
      {children}
    </Link>
  );
}

const LockIcon = ({ size = 13 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);

/* ── Pattern A — partial reveal ────────────────────────────────────────────── */
// Free sees `free` (a genuinely useful observation) plus a locked CTA; Pro sees
// `free` plus the deeper `pro` content.

export function PartialReveal({
  context,
  free,
  pro,
  lockedCta,
  plan,
}: {
  context: ProContextTag;
  free: React.ReactNode;
  pro?: React.ReactNode;
  lockedCta: string;
  /** Server `getPlan()` result. Wins over context so a page that already
   * resolved Pro (Settings-style) cannot still render the lock CTA. */
  plan?: "free" | "pro";
}) {
  const ctxPro = useIsPro();
  const isPro = plan != null ? plan === "pro" : ctxPro;
  useImpression(context, !isPro);
  return (
    <div>
      {free}
      {isPro ? (
        pro
      ) : (
        <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-blue-200 dark:border-blue-900/50 bg-blue-50/60 dark:bg-blue-950/20 px-3 py-2">
          <span className="inline-flex items-center gap-1.5 text-xs text-blue-700 dark:text-blue-300"><LockIcon /> {lockedCta}</span>
          <ProCta context={context}>Unlock →</ProCta>
        </div>
      )}
    </div>
  );
}

/* ── Pattern B — blurred preview ───────────────────────────────────────────── */
// Show the real structure, blurred, with an overlay. Best for charts/reports.

export function BlurredPreview({
  context,
  title,
  cta = "Explore Pro",
  children,
}: {
  context: ProContextTag;
  title: string;
  cta?: string;
  children: React.ReactNode;
}) {
  const isPro = useIsPro();
  useImpression(context, !isPro);
  if (isPro) return <>{children}</>;
  return (
    <div className="relative overflow-hidden rounded-xl">
      <div aria-hidden className="pointer-events-none select-none blur-[6px] opacity-60">{children}</div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center bg-white/50 dark:bg-zinc-950/50 px-4">
        <ProBadge />
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">{title}</p>
        <ProCta context={context}>{cta} →</ProCta>
      </div>
    </div>
  );
}

/* ── Pattern D — contextual feature lock ───────────────────────────────────── */
// A single locked action inside an otherwise-free surface. Pro renders children.

export function ProLock({
  context,
  label,
  children,
}: {
  context: ProContextTag;
  label: string;
  children?: React.ReactNode;
}) {
  const isPro = useIsPro();
  useImpression(context, !isPro);
  if (isPro) return <>{children}</>;
  return (
    <Link
      href={`/pro?from=${context}`}
      onClick={() => trackPro("locked_feature_attempted", context)}
      className="inline-flex items-center gap-1.5 text-sm text-zinc-400 dark:text-zinc-500 hover:text-blue-700 dark:hover:text-blue-300"
    >
      <LockIcon /> {label} <ProBadge />
    </Link>
  );
}
