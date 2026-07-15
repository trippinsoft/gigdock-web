"use client";

import { useEffect, useState, useCallback } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import type { RawIngestion } from "@/lib/types";

export default function DuplicatesPage() {
  const [dupes, setDupes] = useState<RawIngestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const supabase = createSupabaseBrowser();

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("raw_ingestions")
      .select("*")
      .eq("status", "duplicate")
      .order("created_at", { ascending: false })
      .limit(100);
    setDupes(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function forceCreate(ingestion: RawIngestion) {
    setActionLoading(ingestion.id);
    await supabase
      .from("raw_ingestions")
      .update({ status: "pending" })
      .eq("id", ingestion.id);
    setDupes((prev) => prev.filter((d) => d.id !== ingestion.id));
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
            Duplicates
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Posts flagged as duplicates of existing opportunities
          </p>
        </div>
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          {dupes.length} duplicates
        </span>
      </div>

      {dupes.length === 0 ? (
        <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
          No duplicates detected.
        </div>
      ) : (
        dupes.map((d) => (
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
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                    duplicate
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
                onClick={() => forceCreate(d)}
                disabled={actionLoading === d.id}
                className="px-3 py-1.5 text-xs font-medium text-green-600 dark:text-green-400 border border-green-300 dark:border-green-800 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors shrink-0"
              >
                {actionLoading === d.id ? "..." : "Force Create"}
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
