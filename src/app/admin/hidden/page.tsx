"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import type { Opportunity } from "@/lib/types";
import OpportunityCard from "@/components/OpportunityCard";
import OpportunityListItem from "@/components/OpportunityListItem";
import AdminTwoPane from "@/components/AdminTwoPane";

export default function HiddenPage() {
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "hidden" | "expired">("all");
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const supabase = createSupabaseBrowser();

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("opportunities")
      .select("*")
      .order("posted_at", { ascending: false })
      .limit(100);

    if (filter === "all") {
      query = query.in("status", ["hidden", "expired"]);
    } else {
      query = query.eq("status", filter);
    }

    const { data } = await query;
    setOpps(data ?? []);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function restore(id: string) {
    setActionLoading(id);
    await supabase
      .from("opportunities")
      .update({ status: "active", deleted_at: null })
      .eq("id", id);
    setOpps((prev) => prev.filter((o) => o.id !== id));
    setActionLoading(null);
  }

  async function moveToDraft(id: string) {
    setActionLoading(id);
    await supabase
      .from("opportunities")
      .update({ status: "draft", deleted_at: null })
      .eq("id", id);
    setOpps((prev) => prev.filter((o) => o.id !== id));
    setActionLoading(null);
  }

  const visible = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return opps;
    return opps.filter((o) =>
      [o.title, o.summary, o.location, o.source]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [opps, search]);

  const actionsFor = (opp: Opportunity) => (
    <>
      <button
        onClick={() => moveToDraft(opp.id)}
        disabled={actionLoading === opp.id}
        className="px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
      >
        To Draft
      </button>
      <button
        onClick={() => restore(opp.id)}
        disabled={actionLoading === opp.id}
        className="px-3 py-1.5 text-xs font-medium text-green-600 dark:text-green-400 border border-green-300 dark:border-green-800 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors"
      >
        {actionLoading === opp.id ? "..." : "Restore"}
      </button>
    </>
  );

  const toolbar = (
    <div className="space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          Hidden &amp; Expired
        </h2>
        <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
          {(["all", "hidden", "expired"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-sm rounded-md transition-colors capitalize ${
                filter === f
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                  : "text-zinc-500 dark:text-zinc-400"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative flex-1 min-w-[150px] max-w-xs">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full pl-9 pr-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <span className="text-xs text-zinc-500 dark:text-zinc-400 ml-auto">
          {loading ? "Loading..." : `${visible.length} ${visible.length === 1 ? "item" : "items"}`}
        </span>
      </div>
    </div>
  );

  return (
    <AdminTwoPane
      items={visible}
      loading={loading}
      getKey={(o) => o.id}
      toolbar={toolbar}
      empty={`No ${filter === "all" ? "hidden or expired" : filter} opportunities.`}
      detailPlaceholder="Select an opportunity to view details"
      renderRow={(opp, { selected, onSelect }) => (
        <OpportunityListItem opp={opp} selected={selected} onSelect={onSelect} dense />
      )}
      renderDetail={(opp) => (
        <OpportunityCard opp={opp} actions={actionsFor(opp)} dense />
      )}
    />
  );
}
