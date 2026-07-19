"use client";

import { useEffect, useState, useCallback } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import type { RawIngestion } from "@/lib/types";

export default function DiscardsPage() {
  const [discards, setDiscards] = useState<RawIngestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const supabase = createSupabaseBrowser();

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("raw_ingestions")
      .select("*")
      .eq("status", "discarded")
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(100);
    setDiscards(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function reclassify(ingestion: RawIngestion) {
    setActionLoading(ingestion.id);
    await supabase
      .from("raw_ingestions")
      .update({ status: "pending" })
      .eq("id", ingestion.id);
    setDiscards((prev) => prev.filter((d) => d.id !== ingestion.id));
    setActionLoading(null);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            Discards
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Posts the AI classified as non-casting-calls
          </p>
        </div>
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          {discards.length} discards
        </span>
      </div>

      {discards.length === 0 ? (
        <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
          No discards.
        </div>
      ) : (
        discards.map((d) => (
          <div
            key={d.id}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {d.source_name ?? d.source_type}
                  </span>
                  {d.published_at && (
                    <span className="text-xs text-zinc-400">
                      {new Date(d.published_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <pre className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {d.raw_text}
                </pre>
                {d.original_url && (
                  <a
                    href={d.original_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 dark:text-blue-400 mt-1 inline-block"
                  >
                    View original →
                  </a>
                )}
              </div>
              <button
                onClick={() => reclassify(d)}
                disabled={actionLoading === d.id}
                className="px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors shrink-0"
              >
                {actionLoading === d.id ? "..." : "Re-classify"}
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
