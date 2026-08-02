"use client";

import { useState } from "react";

export type WorkDateRange = "all" | "today" | "week" | "two-weeks" | "month";
export type DatePostedRange = "any" | "today" | "3days" | "week";

export type Filters = {
  state: string | null;          // 2-letter US state / CA province, or null = all
  datePosted: DatePostedRange;
  workDateRange: WorkDateRange;
  sources: string[];             // empty = all sources
  // Casting-criteria filters (manual; independent of profile matching)
  gender: string | null;         // "male" | "female" | "non-binary"
  union: string | null;          // "sag-aftra" | "non-union"
  workType: string | null;       // controlled work type
  payMin: number | null;         // roles paying at least this $
};

export const EMPTY_FILTERS: Filters = {
  state: null,
  datePosted: "any",
  workDateRange: "all",
  sources: [],
  gender: null,
  union: null,
  workType: null,
  payMin: null,
};

/**
 * Extract 2-letter state/province code from a location string.
 */
export function extractState(location: string | null): string | null {
  if (!location) return null;
  const matches = [...location.matchAll(/,\s*([A-Z]{2})(?=[\s,\-\/\(\)]|$)/g)];
  return matches.length > 0 ? matches[matches.length - 1][1] : null;
}

const STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
  MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
  OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
  DC: "Washington, D.C.",
  AB: "Alberta", BC: "British Columbia", MB: "Manitoba", NB: "New Brunswick",
  NL: "Newfoundland & Labrador", NS: "Nova Scotia", NT: "Northwest Territories",
  NU: "Nunavut", ON: "Ontario", PE: "Prince Edward Island", QC: "Quebec",
  SK: "Saskatchewan", YT: "Yukon",
};

export function stateLabel(code: string): string {
  return STATE_NAMES[code] ? `${STATE_NAMES[code]} (${code})` : code;
}

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

const GENDER_OPTIONS: { value: string; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "non-binary", label: "Non-binary" },
];

const UNION_OPTIONS: { value: string; label: string }[] = [
  { value: "sag-aftra", label: "SAG-AFTRA" },
  { value: "non-union", label: "Non-union" },
];

const WORK_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "background", label: "Background" },
  { value: "featured", label: "Featured" },
  { value: "stand-in", label: "Stand-in" },
  { value: "photo-double", label: "Photo double" },
  { value: "principal", label: "Principal" },
  { value: "voice-over", label: "Voice-over" },
  { value: "live-music", label: "Live music" },
  { value: "brand-ambassador", label: "Brand ambassador" },
  { value: "model", label: "Model" },
  { value: "other", label: "Other" },
];

const PAY_OPTIONS: { value: number; label: string }[] = [
  { value: 100, label: "$100+" },
  { value: 250, label: "$250+" },
  { value: 500, label: "$500+" },
  { value: 1000, label: "$1,000+" },
];

export function activeFilterCount(f: Filters): number {
  return (
    (f.state ? 1 : 0) +
    (f.datePosted === "any" ? 0 : 1) +
    (f.workDateRange === "all" ? 0 : 1) +
    (f.sources.length > 0 ? 1 : 0) +
    (f.gender ? 1 : 0) +
    (f.union ? 1 : 0) +
    (f.workType ? 1 : 0) +
    (f.payMin ? 1 : 0)
  );
}

function chipClass(selected: boolean) {
  return `text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
    selected
      ? "bg-blue-600 border-blue-600 text-white"
      : "bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400 dark:hover:border-zinc-600"
  }`;
}

/* ---- lenient canonicalizers for filter matching (tolerate old free-form data) ---- */
function canonGender(g: string): string {
  const s = g.toLowerCase().trim();
  if (["male", "males", "man", "men", "m", "boy", "boys"].includes(s)) return "male";
  if (["female", "females", "woman", "women", "f", "girl", "girls"].includes(s)) return "female";
  if (["non-binary", "nonbinary", "non binary", "nb", "enby"].includes(s)) return "non-binary";
  return s;
}
function canonUnion(u: string): string {
  const s = u.toLowerCase().trim();
  if (!s) return "";
  if (s.includes("non")) return "non-union";
  if (s.includes("sag") || s.includes("aftra")) return "sag-aftra";
  if (s.includes("either") || s.includes("both") || s.includes("any")) return "either";
  return s;
}

/** Multi-select dropdown for sources */
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
      <button type="button" onClick={() => setOpen((o) => !o)} className={chipClass(selected.length > 0)}>
        {label} ▾
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute z-40 mt-2 left-0 min-w-[240px] max-w-[320px] max-h-72 overflow-y-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl p-2">
            {available.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400 p-2">No sources yet</p>
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
  availableStates,
  availableSources,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
  availableStates: string[];
  availableSources: string[];
}) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <select
        value={filters.state ?? ""}
        onChange={(e) => onChange({ ...filters, state: e.target.value || null })}
        className={chipClass(!!filters.state)}
      >
        <option value="">📍 Any state</option>
        {availableStates.map((code) => (
          <option key={code} value={code}>{stateLabel(code)}</option>
        ))}
      </select>

      <select
        value={filters.gender ?? ""}
        onChange={(e) => onChange({ ...filters, gender: e.target.value || null })}
        className={chipClass(!!filters.gender)}
      >
        <option value="">👤 Any gender</option>
        {GENDER_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      <select
        value={filters.workType ?? ""}
        onChange={(e) => onChange({ ...filters, workType: e.target.value || null })}
        className={chipClass(!!filters.workType)}
      >
        <option value="">🎬 Any type</option>
        {WORK_TYPE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      <select
        value={filters.union ?? ""}
        onChange={(e) => onChange({ ...filters, union: e.target.value || null })}
        className={chipClass(!!filters.union)}
      >
        <option value="">🎭 Any union</option>
        {UNION_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      <select
        value={filters.payMin ?? ""}
        onChange={(e) => onChange({ ...filters, payMin: e.target.value ? Number(e.target.value) : null })}
        className={chipClass(!!filters.payMin)}
      >
        <option value="">💰 Any pay</option>
        {PAY_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      <select
        value={filters.datePosted}
        onChange={(e) => onChange({ ...filters, datePosted: e.target.value as DatePostedRange })}
        className={chipClass(filters.datePosted !== "any")}
      >
        {DATE_POSTED_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>🕐 Posted: {o.label}</option>
        ))}
      </select>

      <select
        value={filters.workDateRange}
        onChange={(e) => onChange({ ...filters, workDateRange: e.target.value as WorkDateRange })}
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

type FilterableOpp = {
  location: string | null;
  work_date: string | null;
  posted_at: string;
  source: string | null;
  pay_min?: number | null;
  casting_specs?: {
    gender?: unknown;
    union_status?: unknown;
    work_type?: unknown;
  } | null;
};

export function applyFilters<T extends FilterableOpp>(items: T[], filters: Filters): T[] {
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
    if (filters.state) {
      if (extractState(item.location) !== filters.state) return false;
    }
    if (workEnd && filters.workDateRange !== "all") {
      if (!item.work_date) return false;
      if (item.work_date < todayStr || item.work_date > workEnd) return false;
    }
    if (postedCutoff !== null) {
      if (new Date(item.posted_at).getTime() < postedCutoff) return false;
    }
    if (sourceSet && (!item.source || !sourceSet.has(item.source))) return false;

    // ── Casting-criteria filters (strict: the gig must specify the value) ──
    const specs = item.casting_specs ?? {};

    if (filters.gender) {
      const arr = Array.isArray(specs.gender) ? (specs.gender as string[]) : [];
      if (!arr.map(canonGender).includes(filters.gender)) return false;
    }
    if (filters.workType) {
      const wt = typeof specs.work_type === "string" ? specs.work_type.toLowerCase() : "";
      if (wt !== filters.workType) return false;
    }
    if (filters.union) {
      const u = typeof specs.union_status === "string" ? canonUnion(specs.union_status) : "";
      if (u !== filters.union) return false;
    }
    if (filters.payMin != null) {
      if (item.pay_min == null || item.pay_min < filters.payMin) return false;
    }

    return true;
  });
}
