"use client";

import { useEffect, useState, useCallback } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import type { Opportunity, RawIngestion } from "@/lib/types";
import OpportunityCard from "@/components/OpportunityCard";
import EditOpportunityModal from "@/components/EditOpportunityModal";

export default function ReviewPage() {
  const [drafts, setDrafts] = useState<
    (Opportunity & { raw_ingestion?: RawIngestion })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Opportunity | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const supabase = createSupabaseBrowser();

  const loadDrafts = useCallback(async () => {
    setLoading(true);
    const todayStr = new Date().toISOString().slice(0, 10);
    const { data: opps } = await supabase
      .from("opportunities")
      .select("*")
      .eq("status", "draft")
      .is("deleted_at", null)
      .or(`work_date.is.null,work_date.gte.${todayStr}`)
      .order("posted_at", { ascending: false });

    if (opps && opps.length > 0) {
      const oppIds = opps.map((o) => o.id);
      const { data: ingestions } = await supabase
        .from("raw_ingestions")
        .select("*")
        .in("opportunity_id", oppIds);

      const ingestionMap = new Map(
        (ingestions ?? []).map((i) => [i.opportunity_id, i])
      );
      setDrafts(
        opps.map((o) => ({ ...o, raw_ingestion: ingestionMap.get(o.id) }))
      );
    } else {
      setDrafts([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadDrafts();
  }, [loadDrafts]);

  async function approve(id: string) {
    setActionLoading(id);
    await supabase
      .from("opportunities")
      .update({ status: "active" })
      .eq("id", id);
    setDrafts((prev) => prev.filter((d) => d.id !== id));
    setActionLoading(null);
  }

  async function reject(id: string) {
    setActionLoading(id);
    await supabase
      .from("opportunities")
      .update({ status: "hidden", deleted_at: new Date().toISOString() })
      .eq("id", id);
    setDrafts((prev) => prev.filter((d) => d.id !== id));
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
          Review Drafts
        </h2>
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          {drafts.length} pending
        </span>
      </div>

      {drafts.length === 0 ? (
        <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
          No drafts to review. All clear!
        </div>
      ) : (
        drafts.map((opp) => (
          <OpportunityCard
            key={opp.id}
            opp={opp}
            showRawText={opp.raw_ingestion?.raw_text}
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
                  onClick={() => reject(opp.id)}
                  disabled={actionLoading === opp.id}
                  className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 border border-red-300 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                >
                  Reject
                </button>
                <button
                  onClick={() => approve(opp.id)}
                  disabled={actionLoading === opp.id}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-green-400 rounded-lg transition-colors"
                >
                  {actionLoading === opp.id ? "..." : "Approve"}
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
            loadDrafts();
          }}
        />
      )}
    </div>
  );
}
