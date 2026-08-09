"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import type { Opportunity } from "@/lib/types";
import OpportunityCard from "@/components/OpportunityCard";
import OpportunityListItem from "@/components/OpportunityListItem";
import PublicShell from "@/components/PublicShell";
import ShareButton from "@/components/ShareButton";
import FilterChips, {
  EMPTY_FILTERS,
  applyFilters,
  activeFilterCount,
  extractState,
  type Filters,
} from "@/components/FilterChips";
import {
  describeProfile,
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

const DISMISS_THRESHOLD = 110;

// Pull-to-refresh on the list.
const PULL_TRIGGER = 70; // px pulled (after damping) before a refresh fires
const PULL_MAX = 110; // cap on the visual pull distance

export default function OpportunitiesFeed({
  initialSelectedId,
}: {
  /** When set (a shared /opportunities/[id] link), that gig opens pre-selected. */
  initialSelectedId?: string;
} = {}) {
  const router = useRouter();
  const supabase = createSupabaseBrowser();

  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);

  const [userId, setUserId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());

  // Scope filter (All / Saved / Applied), like the mobile app.
  const [scope, setScope] = useState<"all" | "saved" | "applied">("all");
  const [scopedOpps, setScopedOpps] = useState<Opportunity[]>([]);
  const [scopeLoading, setScopeLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [profiles, setProfiles] = useState<PerformerProfile[]>([]);
  const [gigfitProfileId, setGigfitProfileId] = useState<string | null>(null);
  const [fitById, setFitById] = useState<Map<string, GigFitResult>>(new Map());

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filtersMounted, setFiltersMounted] = useState(false);

  const [sheetMounted, setSheetMounted] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragYRef = useRef(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  // Filter sheet drag-to-dismiss (its own state/refs, same mechanics as detail).
  const [fDragY, setFDragY] = useState(0);
  const [fDragging, setFDragging] = useState(false);
  const fDragYRef = useRef(0);
  const fSheetRef = useRef<HTMLDivElement>(null);
  const fContentRef = useRef<HTMLDivElement>(null);
  const fHeaderRef = useRef<HTMLDivElement>(null);

  // Pull-to-refresh (list-driven)
  const listRef = useRef<HTMLDivElement>(null);
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const pullYRef = useRef(0);
  const refreshingRef = useRef(false);

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

  useEffect(() => { load(); }, [load]);

  // Initial scope from ?scope= (e.g. the old /saved route redirects here).
  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get("scope");
    if (s === "saved" || s === "applied") setScope(s);
  }, []);

  // Saved/Applied show the user's own list regardless of active status (so an
  // expired-but-saved gig still appears), fetched by id.
  useEffect(() => {
    if (scope === "all" || !userId) { setScopedOpps([]); return; }
    const ids = Array.from(scope === "saved" ? savedIds : appliedIds);
    if (ids.length === 0) { setScopedOpps([]); return; }
    let cancelled = false;
    (async () => {
      setScopeLoading(true);
      const { data } = await supabase
        .from("opportunities").select("*").in("id", ids).is("deleted_at", null);
      if (!cancelled) { setScopedOpps((data ?? []) as Opportunity[]); setScopeLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [scope, savedIds, appliedIds, userId]);

  // Pull-to-refresh: re-fetch the feed WITHOUT a full page reload, so the
  // user's filters/search/sort (all client-side state) survive the refresh.
  // Only setOpps changes; the visible list is recomputed from the same filters.
  const refresh = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setRefreshing(true);
    const todayStr = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from("opportunities")
      .select("*")
      .eq("status", "active")
      .is("deleted_at", null)
      .or(`work_date.is.null,work_date.gte.${todayStr}`)
      .order("posted_at", { ascending: false });
    setOpps(data ?? []);
    refreshingRef.current = false;
    setRefreshing(false);
  }, []);

  // Auth + saved + profiles (all optional — logged-out users just browse).
  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id ?? null;
      setUserId(uid);
      if (!uid) return;
      const [{ data: saved }, { data: applied }, { data: profs }] = await Promise.all([
        supabase.from("saved_opportunities").select("opportunity_id").eq("user_id", uid),
        supabase.from("applied_opportunities").select("opportunity_id").eq("user_id", uid),
        supabase.from("performer_profiles").select("*").eq("user_id", uid).order("is_default", { ascending: false }),
      ]);
      setSavedIds(new Set((saved ?? []).map((s) => s.opportunity_id)));
      setAppliedIds(new Set((applied ?? []).map((s) => s.opportunity_id)));
      const list = (profs ?? []) as PerformerProfile[];
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
  const profileHasCriteria = !!selectedProfile && fieldsSet(selectedProfile).length > 0;

  useEffect(() => {
    (async () => {
      if (!gigfitProfileId || !profileHasCriteria) { setFitById(new Map()); return; }
      const { data, error } = await supabase.rpc("gigfit", { p_profile_id: gigfitProfileId });
      if (error) { console.error("GigFit RPC failed:", error.message ?? error); setFitById(new Map()); return; }
      const map = new Map<string, GigFitResult>();
      for (const row of (data ?? []) as GigFitRow[]) {
        map.set(row.opportunity_id, {
          eligible: row.eligible, tier: row.tier, label: row.label,
          color: row.color, matched: row.matched ?? [], blockers: row.blockers ?? [],
        });
      }
      setFitById(map);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gigfitProfileId, profileHasCriteria, opps]);

  useEffect(() => {
    if (!profileHasCriteria && filters.eligibleOnly) {
      setFilters((f) => ({ ...f, eligibleOnly: false }));
    }
  }, [profileHasCriteria, filters.eligibleOnly]);

  const availableStates = useMemo(() => {
    const set = new Set<string>();
    for (const o of opps) { const st = extractState(o.location); if (st) set.add(st); }
    return Array.from(set).sort();
  }, [opps]);

  const availableSources = useMemo(() => {
    const set = new Set<string>();
    for (const o of opps) if (o.source) set.add(o.source);
    return Array.from(set).sort();
  }, [opps]);

  const visible = useMemo(() => {
    const base = scope === "all" ? opps : scopedOpps;
    let list = applyFilters(base, filters);
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
    if (sort === "recent") sorted.sort((a, b) => (b.posted_at ?? "").localeCompare(a.posted_at ?? ""));
    else if (sort === "shoot-date") sorted.sort((a, b) => cmpDateAsc(a.work_date, b.work_date));
    else if (sort === "apply-by") sorted.sort((a, b) => cmpDateAsc(a.apply_by, b.apply_by));
    return sorted;
  }, [opps, scopedOpps, scope, filters, debouncedSearch, sort, profileHasCriteria, fitById]);

  useEffect(() => {
    if (visible.length === 0) { setSelectedId(null); return; }
    if (!selectedId || !visible.some((o) => o.id === selectedId)) {
      // A shared link's gig wins the default selection when it's present.
      const preferred =
        initialSelectedId && visible.some((o) => o.id === initialSelectedId)
          ? initialSelectedId
          : visible[0].id;
      setSelectedId(preferred);
    }
  }, [visible, selectedId, initialSelectedId]);

  const selected = useMemo(() => visible.find((o) => o.id === selectedId) ?? null, [visible, selectedId]);

  /* ---------- save ---------- */
  async function toggleSave(id: string) {
    if (!userId) { router.push("/signup"); return; }
    const isSaved = savedIds.has(id);
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (isSaved) next.delete(id); else next.add(id);
      return next;
    });
    if (isSaved) {
      await supabase.from("saved_opportunities").delete().eq("user_id", userId).eq("opportunity_id", id);
    } else {
      await supabase.from("saved_opportunities").insert({ user_id: userId, opportunity_id: id });
    }
  }

  /* ---------- applied (mirrors the mobile app's applied_opportunities) ---------- */
  async function toggleApplied(id: string) {
    if (!userId) { router.push("/signup"); return; }
    const isApplied = appliedIds.has(id);
    setAppliedIds((prev) => {
      const next = new Set(prev);
      if (isApplied) next.delete(id); else next.add(id);
      return next;
    });
    if (isApplied) {
      await supabase.from("applied_opportunities").delete().eq("user_id", userId).eq("opportunity_id", id);
    } else {
      await supabase.from("applied_opportunities").upsert(
        { user_id: userId, opportunity_id: id, method: "manual" },
        { onConflict: "user_id,opportunity_id", ignoreDuplicates: true }
      );
    }
  }

  // Tapping Apply auto-marks applied (method = how they applied), like mobile.
  async function markApplied(id: string, method: string) {
    if (!userId || appliedIds.has(id)) return;
    setAppliedIds((prev) => new Set(prev).add(id));
    await supabase.from("applied_opportunities").upsert(
      { user_id: userId, opportunity_id: id, method },
      { onConflict: "user_id,opportunity_id", ignoreDuplicates: true }
    );
  }

  /* ---------- detail sheet ---------- */
  const openSheet = useCallback((id: string) => {
    setSelectedId(id); setDragY(0); setSheetMounted(true);
    requestAnimationFrame(() => setSheetVisible(true));
  }, []);
  const closeSheet = useCallback(() => {
    setSheetVisible(false); setDragY(0); dragYRef.current = 0; setDragging(false);
    setTimeout(() => setSheetMounted(false), 300);
  }, []);

  // Shared link on mobile: once the gig is in the list, open its detail sheet
  // (desktop already shows it in the right pane via the selection effect above).
  const didOpenInitial = useRef(false);
  useEffect(() => {
    if (didOpenInitial.current) return;
    if (!initialSelectedId) { didOpenInitial.current = true; return; }
    if (!visible.some((o) => o.id === initialSelectedId)) return;
    didOpenInitial.current = true;
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
      openSheet(initialSelectedId);
    }
  }, [initialSelectedId, visible, openSheet]);

  /* ---------- filter sheet (slide up / dismiss) ---------- */
  const openFilters = () => {
    setFDragY(0); fDragYRef.current = 0; setFDragging(false);
    setFiltersMounted(true);
    requestAnimationFrame(() => setFiltersOpen(true));
  };
  const closeFilters = useCallback(() => {
    setFiltersOpen(false); setFDragY(0); fDragYRef.current = 0; setFDragging(false);
    setTimeout(() => setFiltersMounted(false), 300);
  }, []);

  useEffect(() => {
    if (!sheetMounted && !filtersMounted) return;
    const body = document.body, html = document.documentElement;
    const scrollY = window.scrollY;
    const prev = { position: body.style.position, top: body.style.top, width: body.style.width, overflow: body.style.overflow, overscroll: html.style.overscrollBehavior };
    body.style.position = "fixed"; body.style.top = `-${scrollY}px`; body.style.width = "100%"; body.style.overflow = "hidden"; html.style.overscrollBehavior = "none";
    return () => {
      body.style.position = prev.position; body.style.top = prev.top; body.style.width = prev.width; body.style.overflow = prev.overflow; html.style.overscrollBehavior = prev.overscroll;
      window.scrollTo(0, scrollY);
    };
  }, [sheetMounted, filtersMounted]);

  useEffect(() => {
    const el = sheetRef.current;
    if (!sheetMounted || !el) return;
    let startY = 0, active = false, fromContent = false;
    const onStart = (e: TouchEvent) => {
      const target = e.target as Node;
      fromContent = !!contentRef.current?.contains(target);
      const fromHeader = !!headerRef.current?.contains(target);
      active = fromHeader || (fromContent && (contentRef.current?.scrollTop ?? 0) <= 0);
      startY = e.touches[0].clientY;
      if (active) setDragging(true);
    };
    const onMove = (e: TouchEvent) => {
      if (!active) return;
      const delta = e.touches[0].clientY - startY;
      if (delta > 0) { if (e.cancelable) e.preventDefault(); dragYRef.current = delta; setDragY(delta); }
      else if (fromContent) { active = false; dragYRef.current = 0; setDragY(0); setDragging(false); }
    };
    const onEnd = () => {
      if (!active) return; active = false;
      if (dragYRef.current > DISMISS_THRESHOLD) closeSheet();
      else { dragYRef.current = 0; setDragY(0); setDragging(false); }
    };
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("touchcancel", onEnd);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, [sheetMounted, closeSheet]);

  useEffect(() => {
    const el = fSheetRef.current;
    if (!filtersMounted || !el) return;
    let startY = 0, active = false, fromContent = false;
    const onStart = (e: TouchEvent) => {
      const target = e.target as Node;
      fromContent = !!fContentRef.current?.contains(target);
      const fromHeader = !!fHeaderRef.current?.contains(target);
      active = fromHeader || (fromContent && (fContentRef.current?.scrollTop ?? 0) <= 0);
      startY = e.touches[0].clientY;
      if (active) setFDragging(true);
    };
    const onMove = (e: TouchEvent) => {
      if (!active) return;
      const delta = e.touches[0].clientY - startY;
      if (delta > 0) { if (e.cancelable) e.preventDefault(); fDragYRef.current = delta; setFDragY(delta); }
      else if (fromContent) { active = false; fDragYRef.current = 0; setFDragY(0); setFDragging(false); }
    };
    const onEnd = () => {
      if (!active) return; active = false;
      if (fDragYRef.current > DISMISS_THRESHOLD) closeFilters();
      else { fDragYRef.current = 0; setFDragY(0); setFDragging(false); }
    };
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("touchcancel", onEnd);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, [filtersMounted, closeFilters]);

  // Suppress the browser's native pull-to-refresh on this page so a stray pull
  // near the top can't full-reload the page and wipe the user's filters. The
  // list has its own pull-to-refresh (below) that preserves them.
  useEffect(() => {
    const html = document.documentElement;
    const prev = html.style.overscrollBehavior;
    html.style.overscrollBehavior = "none";
    return () => { html.style.overscrollBehavior = prev; };
  }, []);

  // Pull-to-refresh from the list itself: drag down from the top of the list.
  // Native non-passive listener so preventDefault() beats the browser gesture.
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    let startY = 0;
    let active = false;
    const onStart = (e: TouchEvent) => {
      if (refreshingRef.current || el.scrollTop > 0) { active = false; return; }
      startY = e.touches[0].clientY;
      active = true;
    };
    const onMove = (e: TouchEvent) => {
      if (!active) return;
      const delta = e.touches[0].clientY - startY;
      // Scrolling up, or the list has since scrolled off the top → hand the
      // gesture back to normal scrolling.
      if (delta <= 0 || el.scrollTop > 0) {
        active = false;
        pullYRef.current = 0;
        setPullY(0);
        return;
      }
      if (e.cancelable) e.preventDefault();
      const damped = Math.min(PULL_MAX, delta * 0.5);
      pullYRef.current = damped;
      setPullY(damped);
    };
    const onEnd = () => {
      if (!active) return;
      active = false;
      const shouldRefresh = pullYRef.current >= PULL_TRIGGER;
      pullYRef.current = 0;
      setPullY(0);
      if (shouldRefresh) refresh();
    };
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("touchcancel", onEnd);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, [refresh]);

  function saveButton(id: string) {
    const isSaved = savedIds.has(id);
    return (
      <button
        onClick={() => toggleSave(id)}
        className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
          isSaved
            ? "bg-blue-600 border-blue-600 text-white"
            : "border-blue-300 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30"
        }`}
      >
        {isSaved ? "★ Saved" : "☆ Save"}
      </button>
    );
  }

  function appliedButton(id: string) {
    const isApplied = appliedIds.has(id);
    return (
      <button
        onClick={() => toggleApplied(id)}
        className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
          isApplied
            ? "bg-green-600 border-green-600 text-white"
            : "border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
        }`}
        title={isApplied ? "Marked as applied — tap to undo" : "Mark as applied"}
      >
        {isApplied ? "✓ Applied" : "Mark applied"}
      </button>
    );
  }

  const filterCount = activeFilterCount(filters);
  const gigfitOn = !!gigfitProfileId;

  return (
    <PublicShell>
      <div className="flex flex-col h-[calc(100vh-8rem)]">
        {/* Toolbar */}
        <div className="space-y-2 pb-3 border-b border-zinc-200 dark:border-zinc-800">
          {/* Scope: All / Saved / Applied */}
          <div className="inline-flex rounded-lg border border-zinc-300 dark:border-zinc-700 p-0.5 bg-white dark:bg-zinc-800">
            {(["all", "saved", "applied"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setScope(s)}
                className={`px-3.5 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  scope === s
                    ? "bg-blue-600 text-white"
                    : "text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100"
                }`}
              >
                {s === "all"
                  ? "All"
                  : s === "saved"
                  ? `Saved${savedIds.size ? ` (${savedIds.size})` : ""}`
                  : `Applied${appliedIds.size ? ` (${appliedIds.size})` : ""}`}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[150px] max-w-xs">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" /></svg>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full h-10 pl-9 pr-3 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="h-10 px-2.5 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {profiles.length > 0 && (
              <select
                value={gigfitProfileId ?? ""}
                onChange={(e) => setGigfitProfileId(e.target.value || null)}
                className={`text-sm h-10 px-2.5 rounded-lg border shrink-0 transition-colors ${
                  gigfitOn ? "bg-blue-600 border-blue-600 text-white" : "bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300"
                }`}
              >
                <option value="">GigFit: Off</option>
                {profiles.map((p) => <option key={p.id} value={p.id}>GigFit: {p.label}</option>)}
              </select>
            )}
            <button
              type="button"
              onClick={openFilters}
              className="md:hidden inline-flex items-center gap-1.5 text-sm h-10 px-3 rounded-lg border bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 shrink-0"
            >
              Filters
              {filterCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 text-xs font-medium bg-blue-600 text-white rounded-full">{filterCount}</span>
              )}
            </button>
          </div>

          {selectedProfile && (
            <div className="text-sm text-zinc-600 dark:text-zinc-400">
              {fieldsSet(selectedProfile).length === 0 ? (
                <span>
                  <Link href="/profile" className="text-blue-600 dark:text-blue-400 underline underline-offset-2">Set up your profile</Link>
                  {" "}to see your matches.
                </span>
              ) : (
                <>Matching on: <span className="text-zinc-900 dark:text-zinc-100 font-medium">{describeProfile(selectedProfile).join(" · ")}</span></>
              )}
            </div>
          )}

          <div className="hidden md:block">
            <FilterChips
              filters={filters}
              onChange={setFilters}
              availableStates={availableStates}
              availableSources={availableSources}
              showEligibleOnly={profileHasCriteria}
            />
          </div>

          <div className="text-sm text-zinc-500 dark:text-zinc-400">
            {loading ? "Loading..." : `${visible.length} ${visible.length === 1 ? "opportunity" : "opportunities"}`}
          </div>
        </div>

        {/* List + detail */}
        <div className="flex-1 flex min-h-0 mt-4 gap-6">
          <div className="w-full md:w-[30rem] md:shrink-0 flex flex-col min-h-0">
            <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain pr-1">
              {/* Pull-to-refresh indicator (grows as you drag, spins while refreshing) */}
              {(pullY > 0 || refreshing) && (
                <div
                  className="flex items-center justify-center overflow-hidden"
                  style={{ height: refreshing ? 40 : pullY, transition: pullY === 0 ? "height 200ms" : undefined }}
                >
                  <div
                    className={`rounded-full h-6 w-6 border-b-2 border-blue-600 ${refreshing ? "animate-spin" : ""}`}
                    style={refreshing ? undefined : { transform: `rotate(${pullY * 3}deg)`, opacity: Math.min(1, pullY / PULL_TRIGGER) }}
                  />
                </div>
              )}
              {loading || (scope !== "all" && scopeLoading) ? (
                <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
              ) : scope !== "all" && !userId ? (
                <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
                  Sign in to see your {scope} opportunities.
                </div>
              ) : visible.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
                  {scope === "saved"
                    ? "Nothing saved yet. Tap the bookmark on any opportunity to save it."
                    : scope === "applied"
                    ? "Nothing marked applied yet. Apply to a gig or mark it applied to track it here."
                    : "No opportunities match your filters."}
                </div>
              ) : (
                <div className="space-y-3">
                  {visible.map((opp) => (
                    <OpportunityListItem key={opp.id} opp={opp} selected={opp.id === selectedId} onSelect={() => openSheet(opp.id)} fit={fitById.get(opp.id) ?? null} saved={savedIds.has(opp.id)} onToggleSave={() => toggleSave(opp.id)} />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="hidden md:block flex-1 min-w-0 overflow-y-auto">
            {selected ? (
              <OpportunityCard opp={selected} actions={<div className="flex items-center gap-2 flex-wrap justify-end">{saveButton(selected.id)}{appliedButton(selected.id)}<ShareButton id={selected.id} title={selected.title} /></div>} fit={selectedId ? fitById.get(selectedId) ?? null : null} onApply={(kind) => markApplied(selected.id, kind)} hideAdminMeta />
            ) : (
              <div className="flex items-center justify-center h-full text-zinc-500 dark:text-zinc-400 text-sm">Select an opportunity to view details</div>
            )}
          </div>
        </div>

        {/* Mobile filter sheet */}
        {filtersMounted && (
          <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
            <div
              className={`absolute inset-0 bg-black/50 ${fDragging ? "" : "transition-opacity duration-300"}`}
              style={{ opacity: filtersOpen ? Math.max(0, 1 - fDragY / 400) : 0 }}
              onClick={closeFilters}
            />
            <div
              ref={fSheetRef}
              className={`absolute inset-x-0 bottom-0 max-h-[85vh] bg-white dark:bg-zinc-900 rounded-t-2xl shadow-2xl flex flex-col ${fDragging ? "" : "transition-transform duration-300 ease-out"}`}
              style={{ transform: filtersOpen ? `translateY(${fDragY}px)` : "translateY(100%)" }}
            >
              <div ref={fHeaderRef} className="shrink-0 touch-none select-none">
                <div className="flex justify-center pt-2.5 pb-1"><div className="h-1.5 w-10 rounded-full bg-zinc-300 dark:bg-zinc-700" /></div>
                <div className="flex items-center justify-between px-4 pb-3 border-b border-zinc-200 dark:border-zinc-800">
                  <button type="button" onClick={closeFilters} className="text-2xl leading-none text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 -ml-1 px-1" aria-label="Close">×</button>
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Filters</h3>
                  {filterCount > 0 ? (
                    <button type="button" onClick={() => setFilters(EMPTY_FILTERS)} className="text-sm text-blue-600 dark:text-blue-400">Clear all</button>
                  ) : (
                    <span className="w-6" />
                  )}
                </div>
              </div>
              <div ref={fContentRef} className="flex-1 overflow-y-auto overscroll-none px-4">
                <FilterChips filters={filters} onChange={setFilters} availableStates={availableStates} availableSources={availableSources} layout="stacked" showEligibleOnly={profileHasCriteria} />
              </div>
              <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 shrink-0">
                <button type="button" onClick={closeFilters} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">
                  Show {visible.length} {visible.length === 1 ? "result" : "results"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile detail sheet */}
        {sheetMounted && selected && (
          <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true">
            <div
              className={`absolute inset-0 bg-black/50 ${dragging ? "" : "transition-opacity duration-300"}`}
              style={{ opacity: sheetVisible ? Math.max(0, 1 - dragY / 400) : 0 }}
              onClick={closeSheet}
            />
            <div
              ref={sheetRef}
              className={`absolute inset-x-0 bottom-0 top-14 bg-zinc-50 dark:bg-zinc-950 rounded-t-2xl overflow-hidden flex flex-col shadow-2xl ${dragging ? "" : "transition-transform duration-300 ease-out"}`}
              style={{ transform: sheetVisible ? `translateY(${dragY}px)` : "translateY(100%)" }}
            >
              <div ref={headerRef} className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 touch-none select-none">
                <div className="flex justify-center pt-2.5 pb-1"><div className="h-1.5 w-10 rounded-full bg-zinc-300 dark:bg-zinc-700" /></div>
                <div className="flex items-center justify-between px-4 pb-3">
                  <button type="button" onClick={closeSheet} className="text-2xl leading-none text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 -ml-1 px-1" aria-label="Close">×</button>
                  <div className="flex gap-2 flex-wrap">{saveButton(selected.id)}{appliedButton(selected.id)}<ShareButton id={selected.id} title={selected.title} /></div>
                </div>
              </div>
              <div ref={contentRef} className="flex-1 overflow-y-auto overscroll-contain p-4">
                <OpportunityCard opp={selected} fit={selectedId ? fitById.get(selectedId) ?? null : null} onApply={(kind) => markApplied(selected.id, kind)} hideAdminMeta />
              </div>
            </div>
          </div>
        )}
      </div>
    </PublicShell>
  );
}
