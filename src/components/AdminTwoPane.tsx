"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

// How far (px) the user must drag the mobile sheet down before it dismisses.
const DISMISS_THRESHOLD = 110;

/**
 * Generic admin two-pane review shell: a compact list on the left, a detail
 * pane on the right (desktop), collapsing to a list + drag-to-dismiss bottom
 * sheet on mobile. Selection is managed internally and always defaults to the
 * first item. Ported from the Active tab so every admin review tab behaves
 * identically.
 *
 * The caller owns rendering:
 *  - renderRow  → a fully-interactive row (call opts.onSelect on click).
 *  - renderDetail → the detail body (include any action buttons here so they
 *    appear in both the desktop pane and the mobile sheet without duplication).
 */
export default function AdminTwoPane<T>({
  items,
  loading,
  getKey,
  renderRow,
  renderDetail,
  toolbar,
  empty,
  detailPlaceholder = "Select an item to view details",
}: {
  items: T[];
  loading: boolean;
  getKey: (item: T) => string;
  renderRow: (item: T, opts: { selected: boolean; onSelect: () => void }) => ReactNode;
  renderDetail: (item: T) => ReactNode;
  toolbar?: ReactNode;
  empty?: ReactNode;
  detailPlaceholder?: string;
}) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // Mobile detail-sheet state
  const [sheetMounted, setSheetMounted] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragYRef = useRef(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  // Keep selection valid as items change; default to the first row.
  useEffect(() => {
    if (items.length === 0) {
      setSelectedKey(null);
      return;
    }
    if (!selectedKey || !items.some((it) => getKey(it) === selectedKey)) {
      setSelectedKey(getKey(items[0]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, selectedKey]);

  const selected = items.find((it) => getKey(it) === selectedKey) ?? null;

  const openSheet = useCallback((key: string) => {
    setSelectedKey(key);
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

  // Lock the page behind the open sheet. position:fixed is the only reliable
  // way to take the document out of the scroll chain on iOS Safari.
  useEffect(() => {
    if (!sheetMounted) return;
    const body = document.body;
    const html = document.documentElement;
    const scrollY = window.scrollY;
    const prev = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      overflow: body.style.overflow,
      overscroll: html.style.overscrollBehavior,
    };
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    body.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    return () => {
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.width = prev.width;
      body.style.overflow = prev.overflow;
      html.style.overscrollBehavior = prev.overscroll;
      window.scrollTo(0, scrollY);
    };
  }, [sheetMounted]);

  // Drag-to-dismiss via NATIVE non-passive listeners so preventDefault() can
  // beat the browser's pull-to-refresh (React's onTouchMove is passive).
  useEffect(() => {
    const el = sheetRef.current;
    if (!sheetMounted || !el) return;

    let startY = 0;
    let active = false;
    let fromContent = false;

    const onStart = (e: TouchEvent) => {
      const target = e.target as Node;
      fromContent = !!contentRef.current?.contains(target);
      const fromHeader = !!headerRef.current?.contains(target);
      // Header always drags. Content drags only when already scrolled to top.
      active = fromHeader || (fromContent && (contentRef.current?.scrollTop ?? 0) <= 0);
      startY = e.touches[0].clientY;
      if (active) setDragging(true);
    };

    const onMove = (e: TouchEvent) => {
      if (!active) return;
      const delta = e.touches[0].clientY - startY;
      if (delta > 0) {
        if (e.cancelable) e.preventDefault();
        dragYRef.current = delta;
        setDragY(delta);
      } else if (fromContent) {
        active = false;
        dragYRef.current = 0;
        setDragY(0);
        setDragging(false);
      }
    };

    const onEnd = () => {
      if (!active) return;
      active = false;
      if (dragYRef.current > DISMISS_THRESHOLD) {
        closeSheet();
      } else {
        dragYRef.current = 0;
        setDragY(0);
        setDragging(false);
      }
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

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {toolbar && (
        <div className="pb-3 border-b border-zinc-200 dark:border-zinc-800">{toolbar}</div>
      )}

      {/* Two-pane split (desktop) / list only (mobile) */}
      <div className="flex-1 flex min-h-0 mt-4 gap-4">
        <div className="w-full md:w-96 md:shrink-0 flex flex-col min-h-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
              {empty ?? "Nothing here."}
            </div>
          ) : (
            <div className="overflow-y-auto pr-1 space-y-2">
              {items.map((item) => {
                const key = getKey(item);
                return (
                  <div key={key}>
                    {renderRow(item, {
                      selected: key === selectedKey,
                      onSelect: () => openSheet(key),
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: detail pane (desktop only) */}
        <div className="hidden md:block flex-1 min-w-0 overflow-y-auto">
          {selected ? (
            renderDetail(selected)
          ) : (
            <div className="flex items-center justify-center h-full text-zinc-500 dark:text-zinc-400 text-sm">
              {detailPlaceholder}
            </div>
          )}
        </div>
      </div>

      {/* Mobile detail sheet (slides up, drag-to-dismiss) */}
      {sheetMounted && selected && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true">
          <div
            className={`absolute inset-0 bg-black/50 ${dragging ? "" : "transition-opacity duration-300"}`}
            style={{ opacity: sheetVisible ? Math.max(0, 1 - dragY / 400) : 0 }}
            onClick={closeSheet}
          />
          <div
            ref={sheetRef}
            className={`absolute inset-x-0 bottom-0 top-14 bg-zinc-50 dark:bg-zinc-950 rounded-t-2xl overflow-hidden flex flex-col shadow-2xl ${
              dragging ? "" : "transition-transform duration-300 ease-out"
            }`}
            style={{ transform: sheetVisible ? `translateY(${dragY}px)` : "translateY(100%)" }}
          >
            <div
              ref={headerRef}
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
              </div>
            </div>

            <div ref={contentRef} className="flex-1 overflow-y-auto overscroll-contain p-4">
              {renderDetail(selected)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
