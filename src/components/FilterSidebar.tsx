"use client";

export type WorkDateRange = "all" | "today" | "week" | "two-weeks" | "month";

export type Filters = {
  locations: string[];
  workDateRange: WorkDateRange;
};

export const EMPTY_FILTERS: Filters = {
  locations: [],
  workDateRange: "all",
};

const WORK_DATE_OPTIONS: { value: WorkDateRange; label: string }[] = [
  { value: "all", label: "All dates" },
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "two-weeks", label: "Next 2 weeks" },
  { value: "month", label: "This month" },
];

export function activeFilterCount(f: Filters): number {
  return f.locations.length + (f.workDateRange === "all" ? 0 : 1);
}

export default function FilterSidebar({
  filters,
  onChange,
  availableLocations,
  onClose,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
  availableLocations: string[];
  /** Only passed when rendered inside the mobile drawer */
  onClose?: () => void;
}) {
  function toggleLocation(loc: string) {
    const set = new Set(filters.locations);
    if (set.has(loc)) set.delete(loc);
    else set.add(loc);
    onChange({ ...filters, locations: Array.from(set) });
  }

  function clearAll() {
    onChange(EMPTY_FILTERS);
  }

  const hasFilters = activeFilterCount(filters) > 0;

  return (
    <div className="space-y-6">
      {/* Header — only shown in mobile drawer via onClose */}
      {onClose && (
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Filters</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 text-2xl leading-none"
            aria-label="Close filters"
          >
            ×
          </button>
        </div>
      )}

      {/* Work date */}
      <div>
        <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2">
          Work date
        </h4>
        <div className="space-y-1">
          {WORK_DATE_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              <input
                type="radio"
                name="workDateRange"
                checked={filters.workDateRange === opt.value}
                onChange={() => onChange({ ...filters, workDateRange: opt.value })}
                className="text-blue-600 focus:ring-blue-500"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      {/* Location */}
      <div>
        <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2">
          Location{" "}
          {filters.locations.length > 0 && (
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-normal">
              ({filters.locations.length} selected)
            </span>
          )}
        </h4>
        {availableLocations.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No locations yet</p>
        ) : (
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {availableLocations.map((loc) => (
              <label
                key={loc}
                className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                <input
                  type="checkbox"
                  checked={filters.locations.includes(loc)}
                  onChange={() => toggleLocation(loc)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="truncate">{loc}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Clear */}
      {hasFilters && (
        <button
          type="button"
          onClick={clearAll}
          className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          Clear all filters
        </button>
      )}
    </div>
  );
}

/**
 * Applies filters (except search — that's applied separately) to a list of opportunities.
 * Pure function, safe to call on every render.
 */
export function applyFilters<T extends { location: string | null; work_date: string | null }>(
  items: T[],
  filters: Filters
): T[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);

  let endStr: string | null = null;
  if (filters.workDateRange === "today") {
    endStr = todayStr;
  } else if (filters.workDateRange === "week") {
    const end = new Date(today);
    end.setDate(end.getDate() + 6);
    endStr = end.toISOString().slice(0, 10);
  } else if (filters.workDateRange === "two-weeks") {
    const end = new Date(today);
    end.setDate(end.getDate() + 13);
    endStr = end.toISOString().slice(0, 10);
  } else if (filters.workDateRange === "month") {
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    endStr = end.toISOString().slice(0, 10);
  }

  return items.filter((item) => {
    // Location
    if (filters.locations.length > 0) {
      if (!item.location || !filters.locations.includes(item.location)) return false;
    }
    // Work date
    if (endStr && filters.workDateRange !== "all") {
      if (!item.work_date) return false;
      if (item.work_date < todayStr || item.work_date > endStr) return false;
    }
    return true;
  });
}
