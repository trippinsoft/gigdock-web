"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import type { Opportunity } from "@/lib/types";
import OpportunityCard from "@/components/OpportunityCard";
import OpportunityListItem from "@/components/OpportunityListItem";
import EditOpportunityModal from "@/components/EditOpportunityModal";
import FilterChips, {
  EMPTY_FILTERS,
  applyFilters,
  type Filters,
} from "@/components/FilterChips";

type SortKey = "recent" | "shoot-date" | "apply-by";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "recent", label: "Most recent" },
  { value: "shoot-date", label: "Shoot date (soonest)" },
  { value: "apply-by", label: "Apply deadline (soonest)" },
];

function cmpDateAsc(a: string | null, b: string | null): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a < b ? -1 : 1;
}

export default function ActivePage() {
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Opportunity | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  const supabase = createSupabaseBrowser();

  const load = useCallback(async () => {
    setLoading(true);
    const todayStr = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from("opportunities")
      .select("*")
      .eq("status", "active")
      .is("deleted_at", null)
      .or(`work_date.is.null,work_date.gte.${todayStr}`)
      .order("posted_at", { ascending: false });
    setOpps(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  const availableLocations = useMemo(() => {
    const set = new Set<string>();
    for (const o of opps) if (o.location) set.add(o.location);
    return Array.from(set).sort();
  }, [opps]);

  const availableSources = useMemo(() => {
    const set = new Set<string>();
    for (const o of opps) if (o.source) set.add(o.source);
    return Array.from(set).sort();
  }, [opps]);

  const visible = useMemo(() => {
    let list = applyFilters(opps, filters);
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase().trim();
      list = list.filter((o) =>
        [o.title, o.summary, o.location, o.source, o.requirements, o.type]
          .filter(Boolean).join(" ").toLowerCase().includes(q)
      );
    }
    const sorted = [...list];
    if (sort === "recent") {
      sorted.sort((a, b) => (b.posted_at ?? "").localeCompare(a.posted_at ?? ""));
    } else if (sort === "shoot-date") {
      sorted.sort((a, b) => cmpDateAsc(a.work_date, b.work_date));
    } else if (sort === "apply-by") {
      sorted.sort((a, b) => cmpDateAsc(a.apply_by, b.apply_by));
    }
    return sorted;
  }, [opps, filters, debouncedSearch, sort]);

  // Auto-select first visible if nothing selected (or selection filtered out)
  useEffect(() => {
    if (visible.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !visible.some((o) => o.id === selectedId)) {
      setSelectedId(visible[0].id);
    }
  }, [visible, selectedId]);

  const selected = useMemo(
    () => visible.find((o) => o.id === selectedId) ?? null,
    [visible, selectedId]
  );

  async function hide(id: string) {
    setActionLoading(id);
    await supabase.from("opportunities").update({ status: "hidden" }).eq("id", id);
    setOpps((prev) => prev.filter((o) => o.id !== id));
    setActionLoading(null);
    setMobileDetailOpen(false);
  }

  async function markExpired(id: string) {
    setActionLoading(id);
    await supabase.from("opportunities").update({ status: "expired" }).eq("id", id);
    setOpps((prev) => prev.filter((o) => o.id !== id));
    setActionLoading(null);
    setMobileDetailOpen(false);
  }

  const actionButtons = selected && (
    <>
      <button
        onClick={() => setEditing(selected)}
        disabled={actionLoading === selected.id}
        className="px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800"
      >
        Edit
      </button>
      <button
        onClick={() => markExpired(selected.id)}
        disabled={actionLoading === selected.id}
        className="px-3 py-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-800 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/30"
      >
        Expired
      </button>
      <button
        onClick={() => hide(selected.id)}
        disabled={actionLoading === selected.id}
        className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 border border-red-300 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30"
      >
        Hide
      </button>
    </>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Toolbar */}
      <div className="space-y-3 pb-3 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex gap-2">
          <div className="relative flex-1 min-w-0">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">🔍</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search opportunities..."
              className="w-full pl-9 pr-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <FilterChips
          filters={filters}
          onChange={setFilters}
          availableLocations={availableLocations}
          availableSources={availableSources}
        />

        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          {loading
            ? "Loading..."
            : `${visible.length} of ${opps.length} active ${
                opps.length === 1 ? "opportunity" : "opportunities"
              }`}
        </div>
      </div>

      {/* Two-pane split (desktop) / list only (mobile) */}
      <div className="flex-1 flex min-h-0 mt-4 gap-4">
        {/* Left: compact list */}
        <div className="w-full md:w-96 md:shrink-0 flex flex-col min-h-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : visible.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
              {opps.length === 0 ? "No active opportunities yet." : "No opportunities match your filters."}
            </div>
          ) : (
            <div className="overflow-y-auto pr-1 space-y-2">
              {visible.map((opp) => (
                <OpportunityListItem
                  key={opp.id}
                  opp={opp}
                  selected={opp.id === selectedId}
                  onSelect={() => {
                    setSelectedId(opp.id);
                    setMobileDetailOpen(true);
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right: detail pane (desktop only) */}
        <div className="hidden md:block flex-1 min-w-0 overflow-y-auto">
          {selected ? (
            <OpportunityCard opp={selected} actions={actionButtons} />
          ) : (
            <div className="flex items-center justify-center h-full text-zinc-500 dark:text-zinc-400 text-sm">
              Select an opportunity to view details
            </div>
          )}
        </div>
      </div>

      {/* Mobile bottom sheet — only shown on mobile when a card is tapped */}
      {mobileDetailOpen && selected && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileDetailOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 top-16 bg-zinc-50 dark:bg-zinc-950 rounded-t-2xl overflow-hidden flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <button
                type="button"
                onClick={() => setMobileDetailOpen(false)}
                className="text-sm text-blue-600 dark:text-blue-400 font-medium"
              >
                ← Back
              </button>
              <div className="flex gap-2">{actionButtons}</div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <OpportunityCard opp={selected} />
            </div>
          </div>
        </div>
      )}

      {editing && (
        <EditOpportunityModal
          opportunity={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}
