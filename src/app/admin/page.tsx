"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import type { Opportunity, RawIngestion } from "@/lib/types";
import OpportunityCard from "@/components/OpportunityCard";
import OpportunityListItem from "@/components/OpportunityListItem";
import EditOpportunityModal from "@/components/EditOpportunityModal";
import AdminTwoPane from "@/components/AdminTwoPane";

type Draft = Opportunity & { raw_ingestion?: RawIngestion };

export default function ReviewPage() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
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

  const flaggedCount = useMemo(
    () => drafts.filter((d) => d.review_reason).length,
    [drafts]
  );

  async function approve(id: string) {
    setActionLoading(id);
    // Clear the review reason as it becomes active.
    await supabase
      .from("opportunities")
      .update({ status: "active", review_reason: null })
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

  const visible = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return drafts;
    return drafts.filter((o) =>
      [o.title, o.summary, o.location, o.source, o.review_reason]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [drafts, search]);

  const actionsFor = (opp: Draft) => (
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
  );

  const toolbar = (
    <div className="space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          Review Drafts
        </h2>
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          {drafts.length} pending
          {flaggedCount > 0 && ` · ${flaggedCount} flagged`}
        </span>
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
      </div>
    </div>
  );

  return (
    <>
      <AdminTwoPane
        items={visible}
        loading={loading}
        getKey={(o) => o.id}
        toolbar={toolbar}
        empty="No drafts to review. All clear!"
        detailPlaceholder="Select a draft to review"
        renderRow={(opp, { selected, onSelect }) => (
          <OpportunityListItem opp={opp} selected={selected} onSelect={onSelect} dense />
        )}
        renderDetail={(opp) => (
          <div className="space-y-2">
            {opp.review_reason ? (
              <div className="flex items-start gap-2 text-xs px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300">
                <span className="font-semibold shrink-0">⚠ Held:</span>
                <span>{opp.review_reason}</span>
              </div>
            ) : (
              <div className="text-xs px-3 py-1.5 text-zinc-400 dark:text-zinc-500">
                Awaiting auto-review…
              </div>
            )}
            <OpportunityCard
              opp={opp}
              showRawText={opp.raw_ingestion?.raw_text}
              actions={actionsFor(opp)}
              dense
            />
          </div>
        )}
      />

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
    </>
  );
}
