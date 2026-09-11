"use client";

// Reusable searchable Gig picker. Matches mobile's DocumentGigPickerScreen —
// same fields (title + location + date span + active/past), same search
// (title + location + formatted dates), "No specific gig" row lets the user
// detach a document. Used inline by AddDocumentSheet and by the Documents
// inspector Change/Remove control.

import { useMemo, useState } from "react";
import { shortDate, dateRange } from "@/lib/format";

export type PickerGig = {
  id: string;
  title: string;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  active: boolean;
};

type Choice = { id: string | null; title: string };

export default function GigPickerSheet({
  gigs,
  currentGigId,
  allowDetach = false,
  onPick,
  onClose,
  title = "Choose a gig",
}: {
  gigs: PickerGig[];
  currentGigId?: string | null;
  /** Show the "No specific gig" row that clears the association. */
  allowDetach?: boolean;
  onPick: (choice: Choice) => void;
  onClose: () => void;
  title?: string;
}) {
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return gigs;
    return gigs.filter((g) => {
      const bag = [g.title, g.location ?? "", shortDate(g.start_date), shortDate(g.end_date), dateRange(g.start_date, g.end_date)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return bag.includes(s);
    });
  }, [gigs, q]);

  // Pin the currently-connected gig at the top so the user can see it's
  // already selected (matches mobile's picker behavior).
  const currentGig = currentGigId ? gigs.find((g) => g.id === currentGigId) : null;
  const otherRows = currentGig ? rows.filter((g) => g.id !== currentGig.id) : rows;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg max-h-[92vh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden"
      >
        <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 px-4 py-3">
          <h2 className="flex-1 text-base font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by title, location, or date"
            className="w-full h-10 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {allowDetach && (
            <button
              type="button"
              onClick={() => onPick({ id: null, title: "Personal Documents" })}
              className="w-full text-left px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
            >
              <div className="text-sm font-medium text-zinc-800 dark:text-zinc-100">Personal Documents</div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">Not connected to a specific gig</div>
            </button>
          )}

          {currentGig && (
            <div className="border-b border-zinc-100 dark:border-zinc-800 bg-blue-50/40 dark:bg-blue-950/20">
              <GigRow gig={currentGig} onPick={onPick} highlight />
            </div>
          )}

          {otherRows.length === 0 ? (
            <div className="px-4 py-6 text-sm text-zinc-500 dark:text-zinc-400">
              {gigs.length === 0 ? "You don't have any gigs yet." : "No gigs match that search."}
            </div>
          ) : (
            otherRows.map((g) => <GigRow key={g.id} gig={g} onPick={onPick} />)
          )}
        </div>
      </div>
    </div>
  );
}

function GigRow({ gig, onPick, highlight = false }: { gig: PickerGig; onPick: (c: Choice) => void; highlight?: boolean }) {
  const dates = dateRange(gig.start_date, gig.end_date);
  const meta = [dates, gig.location].filter((s) => s && s !== "—").join(" · ");
  return (
    <button
      type="button"
      onClick={() => onPick({ id: gig.id, title: gig.title })}
      className="w-full text-left px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 last:border-b-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
    >
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-zinc-800 dark:text-zinc-100 truncate">
            {gig.title || "Untitled gig"}
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
            {meta || (gig.active ? "Active" : "Past")}
          </div>
        </div>
        {highlight && (
          <span className="text-[10px] font-bold uppercase tracking-wide text-blue-700 dark:text-blue-300">Current</span>
        )}
        {!gig.active && !highlight && (
          <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Past</span>
        )}
      </div>
    </button>
  );
}
