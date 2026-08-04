"use client";

import { useState } from "react";

export type WorkDateRange = "all" | "today" | "week" | "two-weeks" | "month";
export type DatePostedRange = "any" | "today" | "3days" | "week";

export type Filters = {
  state: string | null;
  datePosted: DatePostedRange;
  workDateRange: WorkDateRange;
  sources: string[];
  gender: string | null;
  union: string | null;
  workType: string | null;
  payMin: number | null;
  /** Hide opportunities the selected GigFit profile isn't eligible for. */
  eligibleOnly: boolean;
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
  eligibleOnly: false,
};

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

const DATE_POSTED_OPTIONS = [
  { value: "any", label: "Any time" },
  { value: "today", label: "Today" },
  { value: "3days", label: "Last 3 days" },
  { value: "week", label: "Last 7 days" },
];

const WORK_DATE_OPTIONS = [
  { value: "all", label: "Any date" },
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "two-weeks", label: "Next 2 weeks" },
  { value: "month", label: "This month" },
];

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

const UNION_OPTIONS = [
  { value: "sag-aftra", label: "SAG-AFTRA" },
  { value: "non-union", label: "Non-union" },
];

const WORK_TYPE_OPTIONS = [
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

const PAY_OPTIONS = [
  { value: "100", label: "$100+" },
  { value: "250", label: "$250+" },
  { value: "500", label: "$500+" },
  { value: "1000", label: "$1,000+" },
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
    (f.payMin ? 1 : 0) +
    (f.eligibleOnly ? 1 : 0)
  );
}

function chipClass(selected: boolean) {
  return `text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
    selected
      ? "bg-blue-600 border-blue-600 text-white"
      : "bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400 dark:hover:border-zinc-600"
  }`;
}

/* ---- lenient canonicalizers (tolerate older free-form extractions) ---- */
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

/* ---------------------------------------------------------------------- */

type SelectSpec = {
  key: string;
  icon: string;
  /** Row label in the stacked (sheet) layout */
  label: string;
  /** Placeholder shown when nothing is selected */
  anyLabel: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
};

function buildSpecs(
  filters: Filters,
  onChange: (f: Filters) => void,
  availableStates: string[]
): SelectSpec[] {
  return [
    {
      key: "state", icon: "📍", label: "Location", anyLabel: "Any state",
      value: filters.state ?? "",
      options: availableStates.map((c) => ({ value: c, label: stateLabel(c) })),
      onChange: (v) => onChange({ ...filters, state: v || null }),
    },
    {
      key: "gender", icon: "👤", label: "Gender", anyLabel: "Any gender",
      value: filters.gender ?? "",
      options: GENDER_OPTIONS,
      onChange: (v) => onChange({ ...filters, gender: v || null }),
    },
    {
      key: "workType", icon: "🎬", label: "Type", anyLabel: "Any type",
      value: filters.workType ?? "",
      options: WORK_TYPE_OPTIONS,
      onChange: (v) => onChange({ ...filters, workType: v || null }),
    },
    {
      key: "union", icon: "🎭", label: "Union", anyLabel: "Any union",
      value: filters.union ?? "",
      options: UNION_OPTIONS,
      onChange: (v) => onChange({ ...filters, union: v || null }),
    },
    {
      key: "payMin", icon: "💰", label: "Pay", anyLabel: "Any pay",
      value: filters.payMin != null ? String(filters.payMin) : "",
      options: PAY_OPTIONS,
      onChange: (v) => onChange({ ...filters, payMin: v ? Number(v) : null }),
    },
    {
      key: "datePosted", icon: "🕐", label: "Posted", anyLabel: "Any time",
      value: filters.datePosted,
      options: DATE_POSTED_OPTIONS,
      onChange: (v) => onChange({ ...filters, datePosted: v as DatePostedRange }),
    },
    {
      key: "workDateRange", icon: "📅", label: "Shoot date", anyLabel: "Any date",
      value: filters.workDateRange,
      options: WORK_DATE_OPTIONS,
      onChange: (v) => onChange({ ...filters, workDateRange: v as WorkDateRange }),
    },
  ];
}

/** True when this spec represents a non-default selection. */
function specActive(s: SelectSpec): boolean {
  return s.value !== "" && s.value !== "any" && s.value !== "all";
}

/** Multi-select popover for sources (chip layout). */
function SourceChip({
  available, selected, onChange,
}: {
  available: string[]; selected: string[]; onChange: (n: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  function toggle(src: string) {
    const set = new Set(selected);
    if (set.has(src)) set.delete(src); else set.add(src);
    onChange(Array.from(set));
  }
  const label =
    selected.length === 0 ? "All sources"
    : selected.length === 1 ? selected[0]
    : `Sources (${selected.length})`;

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
                    <label key={src} className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded px-2 py-1">
                      <input type="checkbox" checked={selected.includes(src)} onChange={() => toggle(src)} className="rounded text-blue-600 focus:ring-blue-500" />
                      <span className="truncate">{src}</span>
                    </label>
                  ))}
                </div>
                {selected.length > 0 && (
                  <div className="border-t border-zinc-200 dark:border-zinc-800 mt-2 pt-2">
                    <button type="button" onClick={() => onChange([])} className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 px-2">
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

/** Sources as a checkbox list (stacked/sheet layout). */
function SourceList({
  available, selected, onChange,
}: {
  available: string[]; selected: string[]; onChange: (n: string[]) => void;
}) {
  function toggle(src: string) {
    const set = new Set(selected);
    if (set.has(src)) set.delete(src); else set.add(src);
    onChange(Array.from(set));
  }
  if (available.length === 0) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">No sources yet</p>;
  }
  return (
    <div className="space-y-1 max-h-48 overflow-y-auto">
      {available.map((src) => (
        <label key={src} className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer py-1">
          <input type="checkbox" checked={selected.includes(src)} onChange={() => toggle(src)} className="rounded text-blue-600 focus:ring-blue-500" />
          <span className="truncate">{src}</span>
        </label>
      ))}
    </div>
  );
}

/**
 * Custom dropdown for the two date filters (desktop chips row). A native
 * <select> can only show the bare selected option when collapsed, which makes
 * "Today" / "This week" ambiguous. This keeps the field name on the collapsed
 * button ("Posted" / "Shoot date", or "Posted: Today" once chosen) while the
 * menu lists bare options.
 */
function ChipDropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find(
    (o) => o.value === value && value !== "" && value !== "any" && value !== "all"
  );
  const buttonLabel = selected ? `${label}: ${selected.label}` : label;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={chipClass(!!selected)}
      >
        {buttonLabel} ▾
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute z-40 mt-2 left-0 min-w-[180px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl p-1">
            {options.map((o) => {
              const isSel = o.value === value;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className={`block w-full text-left text-sm rounded px-2 py-1.5 ${
                    isSel
                      ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-medium"
                      : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  }`}
                >
                  {o.label}
                </button>
              );
            })}
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
  layout = "chips",
  showEligibleOnly = false,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
  availableStates: string[];
  availableSources: string[];
  /** "chips" = inline pills (desktop). "stacked" = labeled rows (mobile sheet). */
  layout?: "chips" | "stacked";
  /** Show the "Eligible only" control (only when a GigFit profile is selected). */
  showEligibleOnly?: boolean;
}) {
  const specs = buildSpecs(filters, onChange, availableStates);

  if (layout === "stacked") {
    return (
      <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {showEligibleOnly && (
          <label className="flex items-center justify-between gap-3 py-3 cursor-pointer">
            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Eligible only
            </span>
            <input
              type="checkbox"
              checked={filters.eligibleOnly}
              onChange={(e) => onChange({ ...filters, eligibleOnly: e.target.checked })}
              className="rounded text-blue-600 focus:ring-blue-500 w-5 h-5"
            />
          </label>
        )}
        {specs.map((s) => (
          <div key={s.key} className="flex items-center justify-between gap-3 py-3">
            <span className="text-sm text-zinc-700 dark:text-zinc-300">
              {s.label}
            </span>
            <select
              value={s.value}
              onChange={(e) => s.onChange(e.target.value)}
              className={`text-sm px-2 py-1.5 rounded-lg border max-w-[55%] ${
                specActive(s)
                  ? "bg-blue-600 border-blue-600 text-white"
                  : "bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
              }`}
            >
              <option value={s.key === "datePosted" ? "any" : s.key === "workDateRange" ? "all" : ""}>
                {s.anyLabel}
              </option>
              {s.options
                .filter((o) => o.value !== "any" && o.value !== "all")
                .map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
            </select>
          </div>
        ))}
        <div className="py-3">
          <div className="text-sm text-zinc-700 dark:text-zinc-300 mb-2">Sources</div>
          <SourceList
            available={availableSources}
            selected={filters.sources}
            onChange={(sources) => onChange({ ...filters, sources })}
          />
        </div>
      </div>
    );
  }

  // Default: inline chips (desktop)
  return (
    <div className="flex flex-wrap gap-2 items-center">
      {showEligibleOnly && (
        <button
          type="button"
          onClick={() => onChange({ ...filters, eligibleOnly: !filters.eligibleOnly })}
          className={chipClass(filters.eligibleOnly)}
        >
          {filters.eligibleOnly ? "✓ " : ""}Eligible only
        </button>
      )}
      {specs.map((s) =>
        // Date filters need a persistent field name on the collapsed control, so
        // they use a custom dropdown; the rest are self-evident native selects.
        s.key === "datePosted" || s.key === "workDateRange" ? (
          <ChipDropdown
            key={s.key}
            label={s.label}
            value={s.value}
            options={s.options}
            onChange={s.onChange}
          />
        ) : (
          <select
            key={s.key}
            value={s.value}
            onChange={(e) => s.onChange(e.target.value)}
            className={chipClass(specActive(s))}
          >
            <option value="">{s.anyLabel}</option>
            {s.options
              .filter((o) => o.value !== "any" && o.value !== "all")
              .map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
          </select>
        )
      )}
      <SourceChip
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
  pay_rate?: string | null;
  casting_specs?: { gender?: unknown; union_status?: unknown; work_type?: unknown } | null;
};

// Hourly gigs aren't comparable to a flat dollar threshold ($30/hr adds up over
// a shoot), so a pay filter never excludes them.
const HOURLY_RE = /\/\s*hr\b|\/\s*hour|per\s*hour|hourly|an?\s+hour/i;

/**
 * Applies every filter EXCEPT `eligibleOnly` (which needs GigFit results and is
 * applied by the caller).
 */
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
    const hours =
      filters.datePosted === "today" ? 24 :
      filters.datePosted === "3days" ? 24 * 3 : 24 * 7;
    postedCutoff = Date.now() - hours * 60 * 60 * 1000;
  }

  const sourceSet = filters.sources.length > 0 ? new Set(filters.sources) : null;

  return items.filter((item) => {
    if (filters.state && extractState(item.location) !== filters.state) return false;
    if (workEnd && filters.workDateRange !== "all") {
      if (!item.work_date) return false;
      if (item.work_date < todayStr || item.work_date > workEnd) return false;
    }
    if (postedCutoff !== null && new Date(item.posted_at).getTime() < postedCutoff) return false;
    if (sourceSet && (!item.source || !sourceSet.has(item.source))) return false;

    const specs = item.casting_specs ?? {};
    // Gender / union are ELIGIBILITY filters: a gig with no stated value is open
    // to everyone, so it stays visible. Only an explicit, conflicting value hides it.
    if (filters.gender) {
      const arr = Array.isArray(specs.gender) ? (specs.gender as string[]) : [];
      const open = arr.length === 0; // no gender stated = open to all
      if (!open && !arr.map(canonGender).includes(filters.gender)) return false;
    }
    if (filters.union) {
      const u = typeof specs.union_status === "string" ? canonUnion(specs.union_status) : "";
      const open = u === "" || u === "either"; // unspecified or "either" = open
      if (!open && u !== filters.union) return false;
    }
    // Work type is a CATEGORY, not eligibility — stay strict (exact match only).
    if (filters.workType) {
      const wt = typeof specs.work_type === "string" ? specs.work_type.toLowerCase() : "";
      if (wt !== filters.workType) return false;
    }
    if (filters.payMin != null && !HOURLY_RE.test(item.pay_rate ?? "")) {
      if (item.pay_min == null || item.pay_min < filters.payMin) return false;
    }
    return true;
  });
}
