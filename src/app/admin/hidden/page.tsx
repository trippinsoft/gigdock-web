"use client";

import { useEffect, useState, useCallback } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import type { Opportunity } from "@/lib/types";
import OpportunityCard from "@/components/OpportunityCard";

export default function HiddenPage() {
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "hidden" | "expired">("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const supabase = createSupabaseBrowser();

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("opportunities")
      .select("*")
      .order("posted_at", { ascending: false })
      .limit(100);

    if (filter === "all") {
      query = query.in("status", ["hidden", "expired"]);
    } else {
      query = query.eq("status", filter);
    }

    const { data } = await query;
    setOpps(data ?? []);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function restore(id: string) {
    setActionLoading(id);
    await supabase
      .from("opportunities")
      .update({ status: "active", deleted_at: null })
      .eq("id", id);
    setOpps((prev) => prev.filter((o) => o.id !== id));
    setActionLoading(null);
  }

  async function moveToDraft(id: string) {
    setActionLoading(id);
    await supabase
      .from("opportunities")
      .update({ status: "draft", deleted_at: null })
      .eq("id", id);
    setOpps((prev) => prev.filter((o) => o.id !== id));
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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          Hidden & Expired
        </h2>
        <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
          {(["all", "hidden", "expired"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-sm rounded-md transition-colors capitalize ${
                filter === f
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                  : "text-zinc-500 dark:text-zinc-400"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {opps.length === 0 ? (
        <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
          No {filter === "all" ? "hidden or expired" : filter} opportunities.
        </div>
      ) : (
        opps.map((opp) => (
          <OpportunityCard
            key={opp.id}
            opp={opp}
            actions={
              <>
                <button
                  onClick={() => moveToDraft(opp.id)}
                  disabled={actionLoading === opp.id}
                  className="px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                >
                  To Draft
                </button>
                <button
                  onClick={() => restore(opp.id)}
                  disabled={actionLoading === opp.id}
                  className="px-3 py-1.5 text-xs font-medium text-green-600 dark:text-green-400 border border-green-300 dark:border-green-800 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors"
                >
                  {actionLoading === opp.id ? "..." : "Restore"}
                </button>
              </>
            }
          />
        ))
      )}
    </div>
  );
}
