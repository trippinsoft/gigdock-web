"use client";

// Payments master list — a financial lens across gigs. Views: Outstanding /
// Received / All. Each row is a gig with its money rollup; selecting opens the
// payment detail (/payments/<gigId>) on the right. Filtering is instant,
// in-memory over the server-seeded gig set.

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FilteredGig } from "@/lib/backoffice-types";
import { paymentStatusOf } from "@/lib/gigBuckets";
import { StatusPill } from "@/components/app/ui";
import { money, dateRange } from "@/lib/format";

type View = "outstanding" | "received" | "all";
const VIEWS: { key: View; label: string }[] = [
  { key: "outstanding", label: "Outstanding" },
  { key: "received", label: "Received" },
  { key: "all", label: "All" },
];

function amountFor(g: FilteredGig, view: View): number {
  const earned = g.earned_total ?? 0;
  const paid = g.total_paid ?? 0;
  if (view === "outstanding") return g.remaining ?? Math.max(earned - paid, 0);
  if (view === "received") return paid;
  return earned;
}

function inView(g: FilteredGig, view: View): boolean {
  const earned = g.earned_total ?? 0;
  const paid = g.total_paid ?? 0;
  if (view === "outstanding") return !g.is_unpaid && (g.remaining ?? earned - paid) > 0;
  if (view === "received") return paid > 0;
  return earned > 0 || paid > 0;
}

export default function PaymentsMasterList({ gigs }: { gigs: FilteredGig[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const initialView = (["outstanding", "received", "all"].includes(params.get("view") ?? "")
    ? (params.get("view") as View)
    : "outstanding");
  const [view, setView] = useState<View>(initialView);
  const [q, setQ] = useState("");

  const visible = useMemo(() => {
    let list = gigs.filter((g) => inView(g, view));
    const s = q.trim().toLowerCase();
    if (s) list = list.filter((g) => [g.title, g.location].filter(Boolean).join(" ").toLowerCase().includes(s));
    return [...list].sort((a, b) => amountFor(b, view) - amountFor(a, view));
  }, [gigs, view, q]);

  const total = useMemo(() => visible.reduce((s, g) => s + amountFor(g, view), 0), [visible, view]);

  const didAuto = useRef(false);
  useEffect(() => {
    if (didAuto.current) return;
    didAuto.current = true;
    if (pathname !== "/payments") return;
    if (typeof window === "undefined" || !window.matchMedia("(min-width:1024px)").matches) return;
    if (visible[0]) router.replace(`/payments/${visible[0].id}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col lg:h-full">
      <div className="sticky top-14 lg:top-0 z-10 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4 pt-4 pb-3">
        <div className="flex items-baseline justify-between mb-3">
          <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Payments</h1>
          <span className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">{money(total)}</span>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-zinc-800 p-0.5 mb-2.5">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                view === v.key ? "bg-blue-600 text-white" : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search gigs" className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 pl-8 pr-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      <div className="flex-1 lg:overflow-y-auto">
        {visible.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-zinc-400 dark:text-zinc-500">Nothing {view === "all" ? "yet" : view}.</p>
        ) : (
          <ul>
            {visible.map((g) => {
              const active = pathname === `/payments/${g.id}`;
              const amt = amountFor(g, view);
              return (
                <li key={g.id}>
                  <Link
                    href={`/payments/${g.id}`}
                    className={`block border-l-2 px-4 py-3 border-b border-zinc-100 dark:border-zinc-800/70 ${
                      active ? "border-l-blue-600 bg-blue-50/70 dark:bg-blue-950/30" : "border-l-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-sm text-zinc-900 dark:text-zinc-100">{g.title || "Untitled gig"}</div>
                        <div className="truncate text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">{dateRange(g.start_date, g.end_date)}</div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className={`text-sm font-semibold ${view === "received" ? "text-green-600 dark:text-green-400" : view === "outstanding" ? "text-amber-600 dark:text-amber-400" : "text-zinc-900 dark:text-zinc-100"}`}>{money(amt)}</div>
                      </div>
                    </div>
                    <div className="mt-1.5"><StatusPill status={paymentStatusOf(g)} small /></div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
