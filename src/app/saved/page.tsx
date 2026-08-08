"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import type { Opportunity } from "@/lib/types";
import OpportunityCard from "@/components/OpportunityCard";
import OpportunityListItem from "@/components/OpportunityListItem";
import PublicShell from "@/components/PublicShell";

const DISMISS_THRESHOLD = 110;

export default function SavedPage() {
  const supabase = createSupabaseBrowser();

  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Mobile bottom sheet
  const [sheetMounted, setSheetMounted] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragYRef = useRef(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setSignedIn(false);
      setLoading(false);
      return;
    }
    setSignedIn(true);
    setUserId(auth.user.id);

    const { data: saved } = await supabase
      .from("saved_opportunities")
      .select("opportunity_id, created_at")
      .eq("user_id", auth.user.id)
      .order("created_at", { ascending: false });

    const ids = (saved ?? []).map((s) => s.opportunity_id as string);
    if (ids.length === 0) {
      setOpps([]);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("opportunities")
      .select("*")
      .in("id", ids)
      .is("deleted_at", null);

    // Preserve most-recently-saved-first order.
    const order = new Map(ids.map((id, i) => [id, i]));
    const rows = (data ?? []).slice().sort(
      (a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)
    );
    setOpps(rows);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function unsave(id: string) {
    if (!userId) return;
    await supabase
      .from("saved_opportunities")
      .delete()
      .eq("user_id", userId)
      .eq("opportunity_id", id);
    setOpps((prev) => prev.filter((o) => o.id !== id));
    if (selectedId === id) closeSheet();
  }

  const openSheet = useCallback((id: string) => {
    setSelectedId(id);
    setDragY(0);
    setSheetMounted(true);
    requestAnimationFrame(() => setSheetVisible(true));
  }, []);
  const closeSheet = useCallback(() => {
    setSheetVisible(false);
    setDragY(0);
    dragYRef.current = 0;
    setDragging(false);
    setTimeout(() => setSheetMounted(false), 300);
  }, []);

  // Lock the page behind the mobile sheet.
  useEffect(() => {
    if (!sheetMounted) return;
    const body = document.body, html = document.documentElement;
    const scrollY = window.scrollY;
    const prev = { position: body.style.position, top: body.style.top, width: body.style.width, overflow: body.style.overflow, overscroll: html.style.overscrollBehavior };
    body.style.position = "fixed"; body.style.top = `-${scrollY}px`; body.style.width = "100%"; body.style.overflow = "hidden"; html.style.overscrollBehavior = "none";
    return () => {
      body.style.position = prev.position; body.style.top = prev.top; body.style.width = prev.width; body.style.overflow = prev.overflow; html.style.overscrollBehavior = prev.overscroll;
      window.scrollTo(0, scrollY);
    };
  }, [sheetMounted]);

  // Swipe-down to dismiss (native listeners — React's are passive).
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

  const selected = opps.find((o) => o.id === selectedId) ?? null;

  function savedButton(id: string) {
    return (
      <button
        type="button"
        onClick={() => unsave(id)}
        className="px-3 py-1.5 text-xs font-medium rounded-lg border bg-blue-600 border-blue-600 text-white transition-colors"
      >
        ★ Saved
      </button>
    );
  }

  return (
    <PublicShell>
      {signedIn === false ? (
        <div className="max-w-md mx-auto text-center py-16">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Saved opportunities</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
            Sign in to see the gigs you&apos;ve saved.
          </p>
          <Link
            href="/login"
            className="inline-block mt-4 px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm"
          >
            Sign in
          </Link>
        </div>
      ) : (
        <div className="flex flex-col h-[calc(100vh-8rem)]">
          <div className="pb-3 border-b border-zinc-200 dark:border-zinc-800">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Saved</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
              {loading ? "Loading…" : `${opps.length} saved ${opps.length === 1 ? "opportunity" : "opportunities"}`}
            </p>
          </div>

          <div className="flex-1 flex min-h-0 mt-4 gap-6">
            <div className="w-full md:w-[30rem] md:shrink-0 flex flex-col min-h-0">
              {loading ? (
                <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
              ) : opps.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
                  Nothing saved yet. Tap the bookmark on any opportunity to save it.
                  <div className="mt-3">
                    <Link href="/opportunities" className="text-blue-600 dark:text-blue-400 text-sm">Browse opportunities →</Link>
                  </div>
                </div>
              ) : (
                <div className="overflow-y-auto pr-1 space-y-3">
                  {opps.map((opp) => (
                    <OpportunityListItem
                      key={opp.id}
                      opp={opp}
                      selected={opp.id === selectedId}
                      onSelect={() => openSheet(opp.id)}
                      saved
                      onToggleSave={() => unsave(opp.id)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Desktop detail pane */}
            <div className="hidden md:block flex-1 min-w-0 overflow-y-auto">
              {selected ? (
                <OpportunityCard opp={selected} actions={savedButton(selected.id)} hideAdminMeta />
              ) : (
                <div className="flex items-center justify-center h-full text-zinc-500 dark:text-zinc-400 text-sm">
                  Select a saved opportunity to view details
                </div>
              )}
            </div>
          </div>

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
                    <div className="flex gap-2">{savedButton(selected.id)}</div>
                  </div>
                </div>
                <div ref={contentRef} className="flex-1 overflow-y-auto overscroll-contain p-4">
                  <OpportunityCard opp={selected} hideAdminMeta />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </PublicShell>
  );
}
