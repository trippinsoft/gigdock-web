"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import type { Opportunity } from "@/lib/types";
import OpportunityCard from "@/components/OpportunityCard";
import OpportunityRow from "@/components/OpportunityRow";
import EditOpportunityModal from "@/components/EditOpportunityModal";
import FilterSidebar, {
  EMPTY_FILTERS,
  applyFilters,
  activeFilterCount,
  type Filters,
} from "@/components/FilterSidebar";

type SortKey = "recent" | "shoot-date" | "apply-by";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "recent", label: "Most recent" },
  { value: "shoot-date", label: "Shoot date (soonest)" },
  { value: "apply-by", label: "Apply deadline (soonest)" },
];

/**
 * Compare two nullable ISO date strings ascending, with nulls sorted last.
 */
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

  // UI state
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
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

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  // Derive unique location list from data (for the filter sidebar)
  const availableLocations = useMemo(() => {
    const set = new Set<string>();
    for (const o of opps) if (o.location) set.add(o.location);
    return Array.from(set).sort();
  }, [opps]);

  // Filtered + searched + sorted view
  const visible = useMemo(() => {
    let list = applyFilters(opps, filters);

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase().trim();
      list = list.filter((o) => {
        const hay = [
          o.title,
          o.summary,
          o.location,
          o.source,
          o.requirements,
          o.type,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
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

  // Keep the selection valid as the visible list changes; default to the
  // first result (Indeed-style auto-select), without stomping on a
  // still-visible manual selection.
  useEffect(() => {
    if (visible.length === 0) {
      setSelectedId(null);
      return;
    }
    setSelectedId((prev) =>
      prev && visible.some((o) => o.id === prev) ? prev : visible[0].id
    );
  }, [visible]);

  const selectedOpp = visible.find((o) => o.id === selectedId) ?? null;

  function selectOpp(id: string) {
    setSelectedId(id);
    setMobileDetailOpen(true);
  }

  async function hide(id: string) {
    setActionLoading(id);
    await supabase.from("opportunities").update({ status: "hidden" }).eq("id", id);
    setOpps((prev) => prev.filter((o) => o.id !== id));
    setActionLoading(null);
  }

  async function markExpired(id: string) {
    setActionLoading(id);
    await supabase.from("opportunities").update({ status: "expired" }).eq("id", id);
    setOpps((prev) => prev.filter((o) => o.id !== id));
    setActionLoading(null);
  }

  function actionsFor(opp: Opportunity) {
    return (
      <>
        <button
          onClick={() => setEditing(opp)}
          disabled={actionLoading === opp.id}
          className="px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
        >
          Edit
        </button>
        <button
          onClick={() => markExpired(opp.id)}
          disabled={actionLoading === opp.id}
          className="px-3 py-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-800 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors"
        >
          Expired
        </button>
        <button
          onClick={() => hide(opp.id)}
          disabled={actionLoading === opp.id}
          className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 border border-red-300 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
        >
          Hide
        </button>
      </>
    );
  }

  const filterCount = activeFilterCount(filters);

  return (
    <div>
      {/* Top toolbar — search + sort + result count + mobile filter button */}
      <div className="sticky top-0 z-10 bg-zinc-50 dark:bg-zinc-950 py-3 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 border-b border-zinc-200 dark:border-zinc-800 mb-4">
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-0">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
              🔍
            </span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search opportunities..."
              className="w-full pl-9 pr-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Sort + Mobile filter button */}
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(true)}
              className="md:hidden inline-flex items-center gap-1 px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-sm text-zinc-700 dark:text-zinc-300"
            >
              Filters
              {filterCount > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium bg-blue-600 text-white rounded-full">
                  {filterCount}
                </span>
              )}
            </button>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  Sort: {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Result count */}
        <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
          {loading
            ? "Loading..."
            : `${visible.length} of ${opps.length} active ${
                opps.length === 1 ? "opportunity" : "opportunities"
              }`}
        </div>
      </div>

      {/* Three-column layout: sidebar + list + detail */}
      <div className="flex gap-6">
        {/* Desktop filter sidebar */}
        <aside className="hidden md:block w-60 shrink-0">
          <div className="sticky top-32">
            <FilterSidebar
              filters={filters}
              onChange={setFilters}
              availableLocations={availableLocations}
            />
          </div>
        </aside>

        {/* List column — compact cards, full width on mobile */}
        <div className="w-full md:w-[360px] shrink-0 space-y-3">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : visible.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
              {opps.length === 0
                ? "No active opportunities yet."
                : "No opportunities match your filters."}
              {opps.length > 0 && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setFilters(EMPTY_FILTERS);
                      setSearch("");
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  >
                    Clear filters and search
                  </button>
                </div>
              )}
            </div>
          ) : (
            visible.map((opp) => (
              <OpportunityRow
                key={opp.id}
                opp={opp}
                selected={opp.id === selectedId}
                onClick={() => selectOpp(opp.id)}
              />
            ))
          )}
        </div>

        {/* Detail column — desktop only; mobile uses the bottom sheet below */}
        <div className="hidden md:block flex-1 min-w-0">
          <div className="sticky top-32">
            {selectedOpp ? (
              <OpportunityCard opp={selectedOpp} actions={actionsFor(selectedOpp)} />
            ) : (
              <div className="text-center py-12 text-zinc-500 dark:text-zinc-400 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg">
                Select an opportunity to see details.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile filter drawer */}
      {mobileFiltersOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileFiltersOpen(false)}
          />
          {/* Bottom sheet */}
          <div className="absolute inset-x-0 bottom-0 bg-white dark:bg-zinc-900 rounded-t-2xl p-5 max-h-[80vh] overflow-y-auto shadow-2xl">
            <FilterSidebar
              filters={filters}
              onChange={setFilters}
              availableLocations={availableLocations}
              onClose={() => setMobileFiltersOpen(false)}
            />
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(false)}
              className="mt-6 w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
            >
              Show {visible.length} {visible.length === 1 ? "result" : "results"}
            </button>
          </div>
        </div>
      )}

      {/* Mobile detail bottom sheet */}
      {mobileDetailOpen && selectedOpp && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileDetailOpen(false)}
          />
          {/* Bottom sheet */}
          <div className="absolute inset-x-0 bottom-0 bg-white dark:bg-zinc-900 rounded-t-2xl max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Details
              </span>
              <button
                type="button"
                onClick={() => setMobileDetailOpen(false)}
                className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 text-2xl leading-none"
                aria-label="Close details"
              >
                ×
              </button>
            </div>
            <div className="p-4">
              <OpportunityCard opp={selectedOpp} actions={actionsFor(selectedOpp)} />
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
