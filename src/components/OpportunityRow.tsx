"use client";

import type { Opportunity } from "@/lib/types";
import { FreshnessBadge, formatDate } from "./OpportunityCard";

export default function OpportunityRow({
  opp,
  selected,
  onClick,
}: {
  opp: Opportunity;
  selected?: boolean;
  onClick?: () => void;
}) {
  const workDate = formatDate(opp.work_date);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={selected ? "true" : undefined}
      className={`w-full text-left bg-white dark:bg-zinc-900 border rounded-lg p-3 transition-colors ${
        selected
          ? "border-blue-500 ring-1 ring-blue-500"
          : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
      }`}
    >
      <div className="flex gap-3 items-start">
        {opp.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={opp.image_url}
            alt=""
            className="w-12 h-12 rounded-md object-cover shrink-0"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-medium text-sm text-zinc-900 dark:text-zinc-100 truncate">
              {opp.title || "(No title)"}
            </h3>
            <FreshnessBadge opp={opp} />
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {opp.location && <span>📍 {opp.location}</span>}
            {opp.pay_rate && <span>💰 {opp.pay_rate}</span>}
            {workDate && <span>📅 {workDate}</span>}
          </div>
        </div>
      </div>
    </button>
  );
}
