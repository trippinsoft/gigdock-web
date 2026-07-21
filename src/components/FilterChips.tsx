"use client";

import { useState } from "react";

export type WorkDateRange = "all" | "today" | "week" | "two-weeks" | "month";
export type DatePostedRange = "any" | "today" | "3days" | "week";

export type Filters = {
  location: string | null;
  datePosted: DatePostedRange;
  workDateRange: WorkDateRange;
  sources: string[]; // empty array = all sources
};

export const EMPTY_FILTERS: Filters = {
  location: null,
  datePosted: "any",
  workDateRange: "all",
  sources: [],
};

const DATE_POSTED_OPTIONS: { value: DatePostedRange; label: string }[] = [
  { value: "any", label: "Any time" },
  { value: "today", label: "Today" },
  { value: "3days", label: "Last 3 days" },
  { value: "week", label: "Last 7 days" },
];

const WORK_DATE_OPTIONS: { value: WorkDateRange; label: string }[] = [
  { value: "all", label: "Any date" },
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "two-weeks", label: "Next 2 weeks" },
  { value: "month", label: "This month" },
];

export function activeFilterCount(f: Filters): number {
  return (
    (f.location ? 1 : 0) +
    (f.datePosted === "any" ? 0 : 1) +
    (f.workDateRange === "all" ? 0 : 1) +
    (f.sources.length > 0 ? 1 : 0)
  );
}

function chipClass(selected: boolean) {
  return `text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
    selected
      ? "bg-blue-600 border-blue-600 text-white"
      : "bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400 dark:hover:border-zinc-600"
  }`;
}

/** Multi-select dropdown for sources — chip button that opens a checkbox popover */
function SourceFilter({
  available,
  selected,
  onChange,
}: {
  available: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);

  function toggle(src: string) {
    const set = new Set(selected);
    if (set.has(src)) set.delete(src);
    else set.add(src);
    onChange(Array.from(set));
  }

  const label =
    selected.length === 0
      ? "📰 All sources"
      : selected.length === 1
      ? `📰 ${selected[0]}`
      : `📰 Sources (${selected.length})`;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={chipClass(selected.length > 0)}
      >
        {label} ▾
      </button>
      {open && (
        <>
          {/* Click-out backdrop */}
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
          />
          <div className="absolute z-40 mt-2 left-0 min-w-[240px] max-w-[320px] max-h-72 overflow-y-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl p-2">
            {available.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400 p-2">
                No sources yet
              </p>
            ) : (
              <>
                <div className="space-y-1">
                  {available.map((src) => (
                    <label
                      key={src}
                      className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded px-2 py-1"
                    >
                      <input
                        type="checkbox"
                        checked={selected.includes(src)}
                        onChange={() => toggle(src)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="truncate">{src}</span>
                    </label>
                  ))}
                </div>
                {selected.length > 0 && (
                  <div className="border-t border-zinc-200 dark:border-zinc-800 mt-2 pt-2">
                    <button
                      type="button"
                      onClick={() => onChange([])}
                      className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 px-2"
                    >
                      Clear sources
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function FilterChips({
  filters,
  onChange,
  availableLocations,
  availableSources,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
  availableLocations: string[];
  availableSources: string[];
}) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <select
        value={filters.location ?? ""}
        onChange={(e) => onChange({ ...filters, location: e.target.value || null })}
        className={chipClass(!!filters.location)}
      >
        <option value="">📍 Any location</option>
        {availableLocations.map((loc) => (
          <option key={loc} value={loc}>{loc}</option>
        ))}
      </select>

      <select
        value={filters.datePosted}
        onChange={(e) =>
          onChange({ ...filters, datePosted: e.target.value as DatePostedRange })
        }
        className={chipClass(filters.datePosted !== "any")}
      >
        {DATE_POSTED_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>🕐 Posted: {o.label}</option>
        ))}
      </select>

      <select
        value={filters.workDateRange}
        onChange={(e) =>
          onChange({ ...filters, workDateRange: e.target.value as WorkDateRange })
        }
        className={chipClass(filters.workDateRange !== "all")}
      >
        {WORK_DATE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>📅 Shoot: {o.label}</option>
        ))}
      </select>

      <SourceFilter
        available={availableSources}
        selected={filters.sources}
        onChange={(sources) => onChange({ ...filters, sources })}
      />

      {activeFilterCount(filters) > 0 && (
        <button
          type="button"
          onClick={() => onChange(EMPTY_FILTERS)}
          className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 px-2"
        >
          Clear all
        </button>
      )}
    </div>
  );
}

export function applyFilters<
  T extends { location: string | null; work_date: string | null; posted_at: string; source: string | null }
>(items: T[], filters: Filters): T[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);

  let workEnd: string | null = null;
  if (filters.workDateRange === "today") workEnd = todayStr;
  else if (filters.workDateRange === "week") {
    const d = new Date(today); d.setDate(d.getDate() + 6);
    workEnd = d.toISOString().slice(0, 10);
  } else if (filters.workDateRange === "two-weeks") {
    const d = new Date(today); d.setDate(d.getDate() + 13);
    workEnd = d.toISOString().slice(0, 10);
  } else if (filters.workDateRange === "month") {
    const d = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    workEnd = d.toISOString().slice(0, 10);
  }

  let postedCutoff: number | null = null;
  if (filters.datePosted !== "any") {
    const now = Date.now();
    const hours =
      filters.datePosted === "today" ? 24 :
      filters.datePosted === "3days" ? 24 * 3 :
      24 * 7;
    postedCutoff = now - hours * 60 * 60 * 1000;
  }

  const sourceSet = filters.sources.length > 0 ? new Set(filters.sources) : null;

  return items.filter((item) => {
    if (filters.location && item.location !== filters.location) return false;
    if (workEnd && filters.workDateRange !== "all") {
      if (!item.work_date) return false;
      if (item.work_date < todayStr || item.work_date > workEnd) return false;
    }
    if (postedCutoff !== null) {
      const posted = new Date(item.posted_at).getTime();
      if (posted < postedCutoff) return false;
    }
    if (sourceSet && (!item.source || !sourceSet.has(item.source))) return false;
    return true;
  });
}
