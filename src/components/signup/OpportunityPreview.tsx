"use client";

// Pre-account Opportunity Preview. Calls the anonymous `gigfit_preview` RPC
// with the wizard's current draft and renders the top matches so the visitor
// can see GigFit value BEFORE creating an account. Uses the same Poor / Good
// / Strong tier badges the authenticated feed uses.
//
// The RPC does the ranking; this component just picks the top few and shows
// each with a fit badge. No opportunity details fetched separately — we join
// against a lightweight list the parent already loaded from the anonymous
// opportunities feed.

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { fitTierColor, type GigFitRow, type GigFitTier } from "@/lib/gigfit";

export type PreviewOpportunity = {
  id: string;
  title: string;
  location: string | null;
  work_date: string | null;
  pay_rate: string | null;
  image_url: string | null;
  match_state: string | null;
};

export interface OpportunityPreviewProps {
  workRoles: string[];
  workMarkets: string[];
  performer?: {
    gender: string | null;
    ethnicity: string[];
    date_of_birth: string | null;
    union_status: string | null;
    height_inches: number | null;
  } | null;
  /** Anonymous-fetched active opportunity list. The parent loads this via
   *  the existing public opportunities pipeline; we only compute fit. */
  opportunities: PreviewOpportunity[];
  /** Cap the number of top matches rendered (default 6). */
  limit?: number;
}

const TIER_RANK: Record<GigFitTier, number> = {
  strong: 4, good: 3, open: 2, poor: 1, ineligible: 0,
};

const TIER_BADGE_CLS: Record<"green" | "blue" | "zinc" | "amber" | "red", string> = {
  green: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  blue:  "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  zinc:  "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  red:   "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

export default function OpportunityPreview({
  workRoles,
  workMarkets,
  performer,
  opportunities,
  limit = 6,
}: OpportunityPreviewProps) {
  const supabase = useMemo(() => createSupabaseBrowser(), []);
  const [loading, setLoading] = useState(true);
  const [fitById, setFitById] = useState<Map<string, GigFitRow>>(new Map());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error: rpcErr } = await supabase.rpc("gigfit_preview", {
        p_work_roles: workRoles,
        p_work_markets: workMarkets,
        p_gender: performer?.gender ?? null,
        p_ethnicity: performer?.ethnicity ?? null,
        p_date_of_birth: performer?.date_of_birth ?? null,
        p_union_status: performer?.union_status ?? null,
        p_height_inches: performer?.height_inches ?? null,
        p_pay_minimum: null,
        p_work_types_wanted: null,
        p_skills: null,
        p_vehicles: null,
      });
      if (cancelled) return;
      if (rpcErr) {
        setError(rpcErr.message ?? "GigFit preview failed");
        setFitById(new Map());
      } else {
        const map = new Map<string, GigFitRow>();
        for (const row of (data ?? []) as GigFitRow[]) {
          map.set(row.opportunity_id, row);
        }
        setFitById(map);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // Recompute whenever any input changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    workRoles.join(","),
    workMarkets.join(","),
    performer?.gender,
    performer?.ethnicity?.join(",") ?? "",
    performer?.date_of_birth,
    performer?.union_status,
    performer?.height_inches ?? 0,
  ]);

  const ranked = useMemo(() => {
    const withFit = opportunities
      .map((o) => ({ o, fit: fitById.get(o.id) ?? null }))
      .filter(({ fit }) => !fit || fit.eligible);
    withFit.sort((a, b) => {
      const at = a.fit ? TIER_RANK[a.fit.tier] : 1;
      const bt = b.fit ? TIER_RANK[b.fit.tier] : 1;
      return bt - at;
    });
    return withFit.slice(0, limit);
  }, [opportunities, fitById, limit]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-zinc-500 dark:text-zinc-400">
        Finding matches…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20 p-3 text-sm text-amber-800 dark:text-amber-200">
        Preview isn&rsquo;t available right now. You can still create your account and see matches after signup.
      </div>
    );
  }

  if (ranked.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 p-4 text-sm text-zinc-500 dark:text-zinc-400 text-center">
        No matching opportunities right now. New ones are posted daily — create your account to be notified.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {ranked.map(({ o, fit }) => (
        <div
          key={o.id}
          className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 flex gap-3 items-start"
        >
          {o.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={o.image_url}
              alt=""
              className="shrink-0 h-14 w-14 rounded-md object-cover border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800"
            />
          ) : (
            <div className="shrink-0 h-14 w-14 rounded-md bg-zinc-100 dark:bg-zinc-800" />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                {o.title}
              </div>
              {fit && <FitBadge tier={fit.tier} label={fit.label} />}
            </div>
            <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 truncate">
              {[o.location, o.work_date].filter(Boolean).join(" · ") || " "}
            </div>
            {o.pay_rate && (
              <div className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-300 truncate">
                {o.pay_rate}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function FitBadge({ tier, label }: { tier: GigFitTier; label: string }) {
  // Only Strong / Good / Poor render a badge. `open` and `ineligible`
  // are internal-only states — the UI shows no rating.
  if (tier === "open" || tier === "ineligible") return null;
  const color = fitTierColor(tier);
  const display = tier === "strong" ? `★ ${label}` : label;
  return (
    <span className={`shrink-0 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ${TIER_BADGE_CLS[color]}`}>
      {display}
    </span>
  );
}
