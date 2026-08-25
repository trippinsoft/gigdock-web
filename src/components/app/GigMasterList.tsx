"use client";

// The compact, scannable gig master list (middle column of the Gigs workspace).
// Search / filter / sort happen instantly in-memory over the server-seeded set.
// Rows are links to /gigs/<id> (soft navigation), and the active row is derived
// from the current path so selection survives without extra state.

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createDraftGig } from "@/lib/backoffice-actions";
import type { FilteredGig, GigFilter } from "@/lib/backoffice-types";
import { inBucket, bucketCounts, paymentStatusOf } from "@/lib/gigBuckets";
import { StatusPill } from "@/components/app/ui";
import { money, dateRange } from "@/lib/format";

const FILTERS: { key: GigFilter; label: string }[] = [
  { key: "payments_due", label: "Due" },
  { key: "missing_payment", label: "Missing pay" },
  { key: "missing_dates", label: "Missing dates" },
];

export default function GigMasterList({ gigs }: { gigs: FilteredGig[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const initialFilter = (["payments_due", "missing_payment", "missing_dates"].includes(params.get("filter") ?? "")
    ? (params.get("filter") as GigFilter)
    : null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<GigFilter | null>(initialFilter);
  const [sort, setSort] = useState<"recent" | "oldest">("recent");
  const [creating, setCreating] = useState(false);

  const counts = useMemo(() => bucketCounts(gigs), [gigs]);

  // On desktop, land on a gig instead of an empty detail pane (matches the
  // "detail shown by default" workspace feel). Runs once, only at the base path.
  const didAuto = useRef(false);
  useEffect(() => {
    if (didAuto.current) return;
    didAuto.current = true;
    if (pathname !== "/gigs") return;
    if (typeof window === "undefined" || !window.matchMedia("(min-width:1024px)").matches) return;
    const first = filter ? gigs.find((g) => inBucket(g, filter)) : gigs[0];
    if (first) router.replace(`/gigs/${first.id}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visible = useMemo(() => {
    let list = gigs;
    if (filter) list = list.filter((g) => inBucket(g, filter));
    const s = q.trim().toLowerCase();
    if (s) {
      list = list.filter((g) =>
        [g.title, g.location].filter(Boolean).join(" ").toLowerCase().includes(s)
      );
    }
    const sorted = [...list];
    sorted.sort((a, b) => {
      const av = a.updated_at ?? a.created_at ?? "";
      const bv = b.updated_at ?? b.created_at ?? "";
      return sort === "recent" ? bv.localeCompare(av) : av.localeCompare(bv);
    });
    return sorted;
  }, [gigs, filter, q, sort]);

  async function onNew() {
    setCreating(true);
    const res = await createDraftGig();
    if (!res.ok || !res.data) {
      setCreating(false);
      alert(res.ok ? "Could not create gig." : res.error);
      return;
    }
    router.push(`/gigs/${res.data.id}/edit`);
  }

  return (
    <div className="flex flex-col lg:h-full">
      {/* Sticky header */}
      <div className="sticky top-14 lg:top-0 z-10 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-baseline gap-2">
            <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">My Gigs</h1>
            <span className="text-xs text-zinc-400 dark:text-zinc-500">{gigs.length}</span>
          </div>
          <button
            onClick={onNew}
            disabled={creating}
            className="inline-flex items-center gap-1 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 px-2.5 py-1.5 text-xs font-semibold text-white"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            {creating ? "…" : "New"}
          </button>
        </div>

        <div className="relative mb-2.5">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search gigs"
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 pl-8 pr-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          <Chip active={filter === null} onClick={() => setFilter(null)}>All</Chip>
          {FILTERS.map((f) => (
            <Chip key={f.key} active={filter === f.key} onClick={() => setFilter(filter === f.key ? null : f.key)}>
              {f.label}
              {counts[f.key] > 0 && <span className="ml-1 opacity-70">{counts[f.key]}</span>}
            </Chip>
          ))}
          <button
            onClick={() => setSort(sort === "recent" ? "oldest" : "recent")}
            className="ml-auto shrink-0 rounded-full px-2 py-1 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            title="Toggle sort order"
          >
            {sort === "recent" ? "↓ Recent" : "↑ Oldest"}
          </button>
        </div>
      </div>

      {/* Rows */}
      <div className="flex-1 lg:overflow-y-auto">
        {visible.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-zinc-400 dark:text-zinc-500">
            {gigs.length === 0 ? "No gigs yet. Tap New to add one." : "No gigs match."}
          </p>
        ) : (
          <ul>
            {visible.map((g) => {
              const active = pathname === `/gigs/${g.id}` || pathname.startsWith(`/gigs/${g.id}/`);
              return (
                <li key={g.id}>
                  <GigRow gig={g} active={active} />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function GigRow({ gig, active }: { gig: FilteredGig; active: boolean }) {
  const earned = gig.earned_total ?? 0;
  const paid = gig.total_paid ?? 0;
  const remaining = gig.remaining ?? Math.max(earned - paid, 0);
  const status = paymentStatusOf(gig);
  const meta = [dateRange(gig.start_date, gig.end_date), gig.location].filter((x) => x && x !== "—").join(" · ");

  return (
    <Link
      href={`/gigs/${gig.id}`}
      className={`block border-l-2 px-4 py-3 border-b border-zinc-100 dark:border-zinc-800/70 ${
        active
          ? "border-l-blue-600 bg-blue-50/70 dark:bg-blue-950/30"
          : "border-l-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-semibold text-sm text-zinc-900 dark:text-zinc-100">{gig.title || "Untitled gig"}</div>
          {meta && <div className="truncate text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">{meta}</div>}
        </div>
        <div className="shrink-0 text-right">
          <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{money(earned)}</div>
        </div>
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <StatusPill status={status} small />
        <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
          {status === "paid" ? "Fully paid" : remaining > 0 ? `${money(remaining)} outstanding` : ""}
        </span>
      </div>
    </Link>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium border transition-colors ${
        active
          ? "bg-blue-600 border-blue-600 text-white"
          : "bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
      }`}
    >
      {children}
    </button>
  );
}
