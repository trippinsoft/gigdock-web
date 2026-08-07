"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import type { RawIngestion } from "@/lib/types";
import AdminTwoPane from "@/components/AdminTwoPane";

/**
 * Shared two-pane review for raw_ingestions rows (Discards, Duplicates). Both
 * tabs load rows by status, list them compactly, and expose a single action
 * that re-queues the row for processing (status → "pending"). They differ only
 * in copy, the action label/colour, and a couple of flags.
 */
export default function RawIngestionReview({
  title,
  subtitle,
  status,
  emptyLabel,
  actionLabel,
  actionClass,
  showDuplicateBadge = false,
  excludeStale = false,
}: {
  title: string;
  subtitle: string;
  status: RawIngestion["status"];
  emptyLabel: string;
  actionLabel: string;
  /** Tailwind colour classes for the action button (text/border/hover). */
  actionClass: string;
  showDuplicateBadge?: boolean;
  /** Discards only: hide rows the ingest flagged "Stale ..." — they're expired
      at ingest, not genuine AI "not-a-casting-call" classifications. */
  excludeStale?: boolean;
}) {
  const [rows, setRows] = useState<RawIngestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const supabase = createSupabaseBrowser();

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("raw_ingestions")
      .select("*")
      .eq("status", status)
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(100);
    setRows(data ?? []);
    setLoading(false);
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  async function requeue(row: RawIngestion) {
    setActionLoading(row.id);
    await supabase.from("raw_ingestions").update({ status: "pending" }).eq("id", row.id);
    setRows((prev) => prev.filter((r) => r.id !== row.id));
    setActionLoading(null);
  }

  const visible = useMemo(() => {
    let list = rows;
    // Filter out the ingest's "Stale ..." expiries client-side so NULL
    // error_detail rows are never accidentally dropped (a server NOT LIKE
    // filter would swallow them).
    if (excludeStale) {
      list = list.filter((r) => !/^\s*stale/i.test(r.error_detail ?? ""));
    }
    const q = search.toLowerCase().trim();
    if (q) {
      list = list.filter((r) =>
        [r.source_name, r.source_type, r.raw_text, r.error_detail]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }
    return list;
  }, [rows, search, excludeStale]);

  const toolbar = (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative flex-1 min-w-[150px] max-w-xs">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full pl-9 pr-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <span className="text-xs text-zinc-500 dark:text-zinc-400 ml-auto">
          {loading ? "Loading..." : `${visible.length} ${visible.length === 1 ? "item" : "items"}`}
        </span>
      </div>
    </div>
  );

  return (
    <AdminTwoPane
      items={visible}
      loading={loading}
      getKey={(r) => r.id}
      toolbar={toolbar}
      empty={emptyLabel}
      detailPlaceholder="Select a post to view details"
      renderRow={(row, { selected, onSelect }) => {
        const snippet = (row.raw_text ?? "").replace(/\s+/g, " ").trim();
        return (
          <button
            type="button"
            onClick={onSelect}
            className={`w-full text-left rounded-lg border transition-colors p-3 ${
              selected
                ? "bg-blue-50 dark:bg-blue-950/40 border-blue-500 dark:border-blue-600"
                : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 truncate">
                {row.source_name ?? row.source_type}
              </span>
              {showDuplicateBadge && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 shrink-0">
                  duplicate
                </span>
              )}
              {row.published_at && (
                <span className="text-xs text-zinc-400 ml-auto shrink-0">
                  {new Date(row.published_at).toLocaleDateString()}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">
              {snippet || "(no text)"}
            </p>
          </button>
        );
      }}
      renderDetail={(row) => (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {row.source_name ?? row.source_type}
                </span>
                {showDuplicateBadge && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                    duplicate
                  </span>
                )}
                {row.published_at && (
                  <span className="text-xs text-zinc-400">
                    {new Date(row.published_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => requeue(row)}
              disabled={actionLoading === row.id}
              className={`px-3 py-1.5 text-xs font-medium border rounded-lg transition-colors shrink-0 ${actionClass}`}
            >
              {actionLoading === row.id ? "..." : actionLabel}
            </button>
          </div>
          {row.error_detail && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{row.error_detail}</p>
          )}
          <pre className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">
            {row.raw_text}
          </pre>
          {row.original_url && (
            <a
              href={row.original_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 dark:text-blue-400 inline-block"
            >
              View original →
            </a>
          )}
        </div>
      )}
    />
  );
}
