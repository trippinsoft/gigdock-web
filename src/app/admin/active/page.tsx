"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import type { Opportunity } from "@/lib/types";
import OpportunityCard from "@/components/OpportunityCard";
import OpportunityListItem from "@/components/OpportunityListItem";
import EditOpportunityModal from "@/components/EditOpportunityModal";
import FilterChips, {
  EMPTY_FILTERS,
  applyFilters,
  activeFilterCount,
  extractState,
  type Filters,
} from "@/components/FilterChips";
import ProfileSummary from "@/components/ProfileSummary";
import {
  fieldsSet,
  type GigFitResult,
  type GigFitRow,
  type PerformerProfile,
} from "@/lib/gigfit";

type SortKey = "recent" | "shoot-date" | "apply-by";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "recent", label: "Most recent" },
  { value: "shoot-date", label: "Shoot date" },
  { value: "apply-by", label: "Apply deadline" },
];

function cmpDateAsc(a: string | null, b: string | null): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a < b ? -1 : 1;
}

// How far (px) the user must drag a sheet down before it dismisses on release.
const DISMISS_THRESHOLD = 110;

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

  // GigFit context: which performer profile are we viewing through?
  // null = "Off" (no badges, no eligibility filtering).
  const [profiles, setProfiles] = useState<PerformerProfile[]>([]);
  const [gigfitProfileId, setGigfitProfileId] = useState<string | null>(null);
  const [fitById, setFitById] = useState<Map<string, GigFitResult>>(new Map());

  // Mobile filter sheet
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Detail bottom-sheet state
  const [sheetMounted, setSheetMounted] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const touchStartY = useRef<number | null>(null);
  const dragEligible = useRef(true);
  const contentRef = useRef<HTMLDivElement>(null);

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

  // Load the user's performer profiles; default to the flagged one.
  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { data } = await supabase
        .from("performer_profiles")
        .select("*")
        .eq("user_id", auth.user.id)
        .order("is_default", { ascending: false });
      const list = (data ?? []) as PerformerProfile[];
      setProfiles(list);
      if (list.length > 0) setGigfitProfileId(list[0].id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  const selectedProfile = useMemo(
    () => profiles.find((p) => p.id === gigfitProfileId) ?? null,
    [profiles, gigfitProfileId]
  );

  // A profile with nothing set can't match on anything — badges would be noise.
  const profileHasCriteria = !!selectedProfile && fieldsSet(selectedProfile).length > 0;

  // GigFit results, computed server-side via the gigfit() RPC.
  useEffect(() => {
    (async () => {
      if (!gigfitProfileId || !profileHasCriteria) {
        setFitById(new Map());
        return;
      }
      const { data, error } = await supabase.rpc("gigfit", {
        p_profile_id: gigfitProfileId,
      });
      if (error) {
        setFitById(new Map());
        return;
      }
      const map = new Map<string, GigFitResult>();
      for (const row of (data ?? []) as GigFitRow[]) {
        map.set(row.opportunity_id, {
          eligible: row.eligible,
          tier: row.tier,
          label: row.label,
          color: row.color,
          matched: row.matched ?? [],
          blockers: row.blockers ?? [],
        });
      }
      setFitById(map);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gigfitProfileId, profileHasCriteria, opps]);

  // When GigFit is off (or has nothing to match on), eligibility filtering
  // can't apply — clear it so the chip can never dangle.
  useEffect(() => {
    if (!profileHasCriteria && filters.eligibleOnly) {
      setFilters((f) => ({ ...f, eligibleOnly: false }));
    }
  }, [profileHasCriteria, filters.eligibleOnly]);

  const availableStates = useMemo(() => {
    const set = new Set<string>();
    for (const o of opps) {
      const st = extractState(o.location);
      if (st) set.add(st);
    }
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
    if (filters.eligibleOnly && profileHasCriteria) {
      list = list.filter((o) => fitById.get(o.id)?.eligible);
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
  }, [opps, filters, debouncedSearch, sort, profileHasCriteria, fitById]);

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

  /* ---------- detail bottom sheet ---------- */

  const openSheet = useCallback((id: string) => {
    setSelectedId(id);
    setDragY(0);
    setSheetMounted(true);
    requestAnimationFrame(() => setSheetVisible(true));
  }, []);

  const closeSheet = useCallback(() => {
    setSheetVisible(false);
    setDragY(0);
    setDragging(false);
    setTimeout(() => setSheetMounted(false), 300);
  }, []);

  // Lock the page behind any open sheet: no background scroll / pull-to-refresh.
  useEffect(() => {
    if (!sheetMounted && !filtersOpen) return;
    const body = document.body;
    const prevOverflow = body.style.overflow;
    const prevOverscroll = body.style.overscrollBehavior;
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
    return () => {
      body.style.overflow = prevOverflow;
      body.style.overscrollBehavior = prevOverscroll;
    };
  }, [sheetMounted, filtersOpen]);

  function handleTouchStart(fromContent: boolean) {
    return (e: React.TouchEvent) => {
      touchStartY.current = e.touches[0].clientY;
      dragEligible.current = fromContent
        ? (contentRef.current?.scrollTop ?? 0) <= 0
        : true;
      setDragging(true);
    };
  }
  function onTouchMove(e: React.TouchEvent) {
    if (touchStartY.current === null || !dragEligible.current) return;
    const delta = e.touches[0].clientY - touchStartY.current;
    setDragY(delta > 0 ? delta : 0);
  }
  function onTouchEnd() {
    if (dragEligible.current && dragY > DISMISS_THRESHOLD) {
      closeSheet();
    } else {
      setDragY(0);
      setDragging(false);
    }
    touchStartY.current = null;
  }

  async function hide(id: string) {
    setActionLoading(id);
    await supabase.from("opportunities").update({ status: "hidden" }).eq("id", id);
    setOpps((prev) => prev.filter((o) => o.id !== id));
    setActionLoading(null);
    closeSheet();
  }

  async function markExpired(id: string) {
    setActionLoading(id);
    await supabase.from("opportunities").update({ status: "expired" }).eq("id", id);
    setOpps((prev) => prev.filter((o) => o.id !== id));
    setActionLoading(null);
    closeSheet();
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

  const filterCount = activeFilterCount(filters);
  const gigfitOn = !!gigfitProfileId;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Toolbar */}
      <div className="space-y-2 pb-3 border-b border-zinc-200 dark:border-zinc-800">
        {/* Search + sort + GigFit (+ filters on mobile).
            flex-wrap keeps this one line on desktop, two on narrow screens. */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[150px] max-w-xs">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">🔍</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full pl-9 pr-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="px-2.5 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {profiles.length > 0 && (
            <select
              value={gigfitProfileId ?? ""}
              onChange={(e) => setGigfitProfileId(e.target.value || null)}
              className={`text-sm px-2.5 py-2 rounded-lg border shrink-0 transition-colors ${
                gigfitOn
                  ? "bg-green-600 border-green-600 text-white"
                  : "bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300"
              }`}
            >
              <option value="">GigFit: Off</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>GigFit: {p.label}</option>
              ))}
            </select>
          )}

          {/* Mobile-only: open the filter sheet */}
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="md:hidden inline-flex items-center gap-1.5 text-sm px-2.5 py-2 rounded-lg border bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 shrink-0"
          >
            ⚙
            {filterCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 text-xs font-medium bg-blue-600 text-white rounded-full">
                {filterCount}
              </span>
            )}
          </button>
        </div>

        {/* What the selected profile actually matches on */}
        {selectedProfile && <ProfileSummary profile={selectedProfile} />}

        {/* Row 3 (desktop only): inline filter chips */}
        <div className="hidden md:block">
          <FilterChips
            filters={filters}
            onChange={setFilters}
            availableStates={availableStates}
            availableSources={availableSources}
            showEligibleOnly={profileHasCriteria}
          />
        </div>

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
                  onSelect={() => openSheet(opp.id)}
                  fit={fitById.get(opp.id) ?? null}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right: detail pane (desktop only) */}
        <div className="hidden md:block flex-1 min-w-0 overflow-y-auto">
          {selected ? (
            <OpportunityCard
              opp={selected}
              actions={actionButtons}
              fit={selectedId ? fitById.get(selectedId) ?? null : null}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-zinc-500 dark:text-zinc-400 text-sm">
              Select an opportunity to view details
            </div>
          )}
        </div>
      </div>

      {/* Mobile filter sheet */}
      {filtersOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50" onClick={() => setFiltersOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] bg-white dark:bg-zinc-900 rounded-t-2xl shadow-2xl flex flex-col">
            <div className="flex justify-center pt-2.5 pb-1 shrink-0">
              <div className="h-1.5 w-10 rounded-full bg-zinc-300 dark:bg-zinc-700" />
            </div>
            <div className="flex items-center justify-between px-4 pb-3 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Filters</h3>
              {filterCount > 0 && (
                <button
                  type="button"
                  onClick={() => setFilters(EMPTY_FILTERS)}
                  className="text-sm text-blue-600 dark:text-blue-400"
                >
                  Clear all
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto overscroll-none px-4">
              <FilterChips
                filters={filters}
                onChange={setFilters}
                availableStates={availableStates}
                availableSources={availableSources}
                layout="stacked"
                showEligibleOnly={profileHasCriteria}
              />
            </div>
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 shrink-0">
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
              >
                Show {visible.length} {visible.length === 1 ? "result" : "results"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile detail sheet (slides up, drag-to-dismiss) */}
      {sheetMounted && selected && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true">
          <div
            className={`absolute inset-0 bg-black/50 ${dragging ? "" : "transition-opacity duration-300"}`}
            style={{ opacity: sheetVisible ? Math.max(0, 1 - dragY / 400) : 0 }}
            onClick={closeSheet}
          />
          <div
            className={`absolute inset-x-0 bottom-0 top-14 bg-zinc-50 dark:bg-zinc-950 rounded-t-2xl overflow-hidden flex flex-col shadow-2xl ${
              dragging ? "" : "transition-transform duration-300 ease-out"
            }`}
            style={{
              transform: sheetVisible ? `translateY(${dragY}px)` : "translateY(100%)",
            }}
          >
            <div
              onTouchStart={handleTouchStart(false)}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 touch-none select-none"
            >
              <div className="flex justify-center pt-2.5 pb-1">
                <div className="h-1.5 w-10 rounded-full bg-zinc-300 dark:bg-zinc-700" />
              </div>
              <div className="flex items-center justify-between px-4 pb-3">
                <button
                  type="button"
                  onClick={closeSheet}
                  className="text-2xl leading-none text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 -ml-1 px-1"
                  aria-label="Close"
                >
                  ×
                </button>
                <div className="flex gap-2">{actionButtons}</div>
              </div>
            </div>

            <div
              ref={contentRef}
              onTouchStart={handleTouchStart(true)}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              className="flex-1 overflow-y-auto overscroll-none p-4"
            >
              <OpportunityCard
                opp={selected}
                fit={selectedId ? fitById.get(selectedId) ?? null : null}
              />
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
