"use client";

// Filter chips + search + sort for the Gigs list. Presentation-only: it just
// rewrites the URL's query string; the server page re-fetches via load_filtered_gigs
// so the business logic for each bucket stays in Postgres.

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { GigFilter } from "@/lib/backoffice-types";

const FILTERS: { key: GigFilter; label: string }[] = [
  { key: "payments_due", label: "Payments due" },
  { key: "missing_payment", label: "Missing pay info" },
  { key: "missing_dates", label: "Missing dates" },
];

export default function GigsToolbar({
  counts,
}: {
  counts?: Partial<Record<GigFilter, number>>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const activeFilter = (params.get("filter") as GigFilter | null) ?? null;
  const sort = params.get("sort") === "oldest" ? "oldest" : "recent";
  const [q, setQ] = useState(params.get("q") ?? "");
  const firstRender = useRef(true);

  // Build a new URL preserving the other params.
  const push = (next: Record<string, string | null>) => {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === null || v === "") sp.delete(k);
      else sp.set(k, v);
    }
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  // Debounce search input → ?q=
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const t = setTimeout(() => push({ q: q.trim() || null }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => push({ filter: null })}
          className={chip(activeFilter === null)}
        >
          All gigs
        </button>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => push({ filter: activeFilter === f.key ? null : f.key })}
            className={chip(activeFilter === f.key)}
          >
            {f.label}
            {counts?.[f.key] ? (
              <span className="ml-1.5 text-xs opacity-70">{counts[f.key]}</span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <div className="relative">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400"
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search gigs"
            className="w-full sm:w-52 pl-8 pr-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={() => push({ sort: sort === "recent" ? "oldest" : "recent" })}
          className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 whitespace-nowrap"
          title="Toggle sort order"
        >
          {sort === "recent" ? "Recent" : "Oldest"}
        </button>
      </div>
    </div>
  );
}

function chip(active: boolean) {
  return `px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
    active
      ? "bg-blue-600 border-blue-600 text-white"
      : "bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
  }`;
}
