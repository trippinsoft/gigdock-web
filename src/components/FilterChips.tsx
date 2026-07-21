"use client";

export type WorkDateRange = "all" | "today" | "week" | "two-weeks" | "month";
export type DatePostedRange = "any" | "today" | "3days" | "week";

export type Filters = {
  location: string | null; // null = All
  datePosted: DatePostedRange;
  workDateRange: WorkDateRange;
};

export const EMPTY_FILTERS: Filters = {
  location: null,
  datePosted: "any",
  workDateRange: "all",
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
    (f.workDateRange === "all" ? 0 : 1)
  );
}

function chipClass(selected: boolean) {
  return `text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
    selected
      ? "bg-blue-600 border-blue-600 text-white"
      : "bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400 dark:hover:border-zinc-600"
  }`;
}

export default function FilterChips({
  filters,
  onChange,
  availableLocations,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
  availableLocations: string[];
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
          <option key={loc} value={loc}>
            {loc}
          </option>
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
          <option key={o.value} value={o.value}>
            🕐 Posted: {o.label}
          </option>
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
          <option key={o.value} value={o.value}>
            📅 Shoot: {o.label}
          </option>
        ))}
      </select>

      {activeFilterCount(filters) > 0 && (
        <button
          type="button"
          onClick={() => onChange(EMPTY_FILTERS)}
          className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 px-2"
        >
          Clear
        </button>
      )}
    </div>
  );
}

/**
 * Filter helper — pure function, applies date-posted + work-date + location.
 * Search text is applied separately by the caller.
 */
export function applyFilters<
  T extends { location: string | null; work_date: string | null; posted_at: string }
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
    return true;
  });
}
