"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

type FindResult = {
  id: string;
  raw_text: string;
  source_name: string | null;
  published_at: string | null;
  created_at: string;
  status: string;
  error_detail: string | null;
  opportunity_id: string | null;
  original_url: string | null;
  opportunity: {
    id: string;
    title: string;
    status: string;
    location: string | null;
    work_date: string | null;
    deleted_at: string | null;
  } | null;
};

const STATUS_OPTIONS = [
  "processed",
  "discarded",
  "duplicate",
  "auto_expired",
  "error",
  "pending",
];

function statusColor(status: string): string {
  switch (status) {
    case "processed": return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300";
    case "discarded": return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400";
    case "duplicate": return "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300";
    case "auto_expired": return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300";
    case "error": return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
    default: return "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300";
  }
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const WEEKDAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const cur = new Date().getFullYear();
  const y = d.getFullYear();
  const yearPart = y === cur ? "" : `, ${y}`;
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}${yearPart} at ${time}`;
}

export default function FindPage() {
  const supabase = createSupabaseBrowser();
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<FindResult[]>([]);
  const [availableSources, setAvailableSources] = useState<string[]>([]);
  const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Load unique source names once for the filter
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("raw_ingestions")
        .select("source_name")
        .not("source_name", "is", null)
        .limit(1000);
      const set = new Set<string>();
      for (const row of data ?? []) if (row.source_name) set.add(row.source_name);
      setAvailableSources(Array.from(set).sort());
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const runSearch = useCallback(async () => {
    // Skip empty searches with no filters — avoid dumping the full table
    if (!debouncedSearch.trim() && selectedStatuses.size === 0 && selectedSources.size === 0) {
      setResults([]);
      return;
    }

    setLoading(true);
    let query = supabase
      .from("raw_ingestions")
      .select(`
        id, raw_text, source_name, published_at, created_at, status, error_detail, opportunity_id, original_url,
        opportunity:opportunities ( id, title, status, location, work_date, deleted_at )
      `)
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(100);

    if (debouncedSearch.trim()) {
      query = query.ilike("raw_text", `%${debouncedSearch.trim()}%`);
    }
    if (selectedStatuses.size > 0) {
      query = query.in("status", Array.from(selectedStatuses));
    }
    if (selectedSources.size > 0) {
      query = query.in("source_name", Array.from(selectedSources));
    }

    const { data } = await query;
    setResults((data as unknown as FindResult[]) ?? []);
    setLoading(false);
  }, [debouncedSearch, selectedStatuses, selectedSources, supabase]);

  useEffect(() => {
    runSearch();
  }, [runSearch]);

  function toggleStatus(s: string) {
    const next = new Set(selectedStatuses);
    if (next.has(s)) next.delete(s);
    else next.add(s);
    setSelectedStatuses(next);
  }

  function toggleSource(s: string) {
    const next = new Set(selectedSources);
    if (next.has(s)) next.delete(s);
    else next.add(s);
    setSelectedSources(next);
  }

  const hasQuery = debouncedSearch.trim().length > 0 || selectedStatuses.size > 0 || selectedSources.size > 0;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          Find post
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Search every post ingested from every source — including ones that were discarded, duplicated, expired, or errored. Matches against the original post text.
        </p>
      </div>

      {/* Search + filters */}
      <div className="space-y-3">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">🔍</span>
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search post text (e.g. &quot;grandparents&quot;, &quot;Talbot Pines&quot;, &quot;8/25&quot;)..."
            className="w-full pl-9 pr-3 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1.5">Status</div>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((s) => {
              const sel = selectedStatuses.has(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleStatus(s)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    sel
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400"
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        {availableSources.length > 0 && (
          <div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1.5">Source</div>
            <div className="flex flex-wrap gap-2">
              {availableSources.map((s) => {
                const sel = selectedSources.has(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSource(s)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      sel
                        ? "bg-blue-600 border-blue-600 text-white"
                        : "bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400"
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {hasQuery && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setSearchInput("");
                setSelectedStatuses(new Set());
                setSelectedSources(new Set());
              }}
              className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              Clear all
            </button>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {loading ? "Searching..." : `${results.length} result${results.length === 1 ? "" : "s"} (limit 100)`}
            </span>
          </div>
        )}
      </div>

      {/* Results */}
      {!hasQuery ? (
        <div className="text-center py-16 text-zinc-500 dark:text-zinc-400 text-sm">
          Type in the search box or pick a status/source filter to begin.
        </div>
      ) : loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
          No posts match your search.
        </div>
      ) : (
        <div className="space-y-2">
          {results.map((r) => {
            const expanded = expandedId === r.id;
            return (
              <div
                key={r.id}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3"
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : r.id)}
                  className="w-full text-left"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${statusColor(r.status)}`}>
                          {r.status}
                        </span>
                        {r.source_name && (
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">
                            {r.source_name}
                          </span>
                        )}
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          Posted {fmtDateTime(r.published_at)}
                        </span>
                      </div>
                      {r.opportunity && !r.opportunity.deleted_at && (
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mt-1.5">
                          → {r.opportunity.title}{" "}
                          <span className="text-xs font-normal text-zinc-500">
                            ({r.opportunity.status}
                            {r.opportunity.location ? ` · ${r.opportunity.location}` : ""})
                          </span>
                        </p>
                      )}
                      <p className="text-sm text-zinc-700 dark:text-zinc-300 mt-1 line-clamp-2">
                        {r.raw_text || "(no text)"}
                      </p>
                    </div>
                    <span className="text-zinc-400 text-sm shrink-0 mt-0.5">
                      {expanded ? "▾" : "▸"}
                    </span>
                  </div>
                </button>

                {expanded && (
                  <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
                    <pre className="text-xs text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800 p-3 rounded whitespace-pre-wrap break-words max-h-96 overflow-y-auto">
                      {r.raw_text || "(no text)"}
                    </pre>
                    {r.error_detail && (
                      <p className="text-xs text-red-600 dark:text-red-400">
                        <span className="font-medium">Reason:</span> {r.error_detail}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-3 text-xs">
                      {r.original_url && (
                        <a
                          href={r.original_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                        >
                          Original post ↗
                        </a>
                      )}
                      <span className="text-zinc-500 dark:text-zinc-400">
                        Ingested {fmtDateTime(r.created_at)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
