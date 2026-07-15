"use client";

import { useEffect, useState, useCallback } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import type { Opportunity } from "@/lib/types";
import OpportunityCard from "@/components/OpportunityCard";
import EditOpportunityModal from "@/components/EditOpportunityModal";

export default function ActivePage() {
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Opportunity | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const supabase = createSupabaseBrowser();

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("opportunities")
      .select("*")
      .eq("status", "active")
      .is("deleted_at", null)
      .order("posted_at", { ascending: false });
    setOpps(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function hide(id: string) {
    setActionLoading(id);
    await supabase
      .from("opportunities")
      .update({ status: "hidden" })
      .eq("id", id);
    setOpps((prev) => prev.filter((o) => o.id !== id));
    setActionLoading(null);
  }

  async function markExpired(id: string) {
    setActionLoading(id);
    await supabase
      .from("opportunities")
      .update({ status: "expired" })
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
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          Active Opportunities
        </h2>
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          {opps.length} active
        </span>
      </div>

      {opps.length === 0 ? (
        <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
          No active opportunities yet.
        </div>
      ) : (
        opps.map((opp) => (
          <OpportunityCard
            key={opp.id}
            opp={opp}
            actions={
              <>
                <button
                  onClick={() => setEditing(opp)}
                  disabled={actionLoading === opp.id}
                  className="px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => markExpired(opp.id)}
                  disabled={actionLoading === opp.id}
                  className="px-3 py-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-800 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors"
                >
                  Expired
                </button>
                <button
                  onClick={() => hide(opp.id)}
                  disabled={actionLoading === opp.id}
                  className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 border border-red-300 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                >
                  Hide
                </button>
              </>
            }
          />
        ))
      )}

      {editing && (
        <EditOpportunityModal
          opportunity={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}
