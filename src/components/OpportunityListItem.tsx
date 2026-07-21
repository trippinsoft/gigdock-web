"use client";

import type { Opportunity } from "@/lib/types";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function shortDate(input: string | null): string | null {
  if (!input) return null;
  const [y, m, d] = input.split("T")[0].split("-").map(Number);
  if (!y || !m || !d) return input;
  const currentYear = new Date().getFullYear();
  const base = `${MONTHS[m - 1]} ${d}`;
  return y === currentYear ? base : `${base}, ${y}`;
}

function relativeTime(iso: string | null): string | null {
  if (!iso) return null;
  const secs = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function freshnessBadge(opp: Opportunity): { label: string; color: string } | null {
  if (opp.apply_by) {
    const deadline = new Date(opp.apply_by + "T23:59:59").getTime();
    const hrs = (deadline - Date.now()) / (1000 * 60 * 60);
    if (hrs > 0 && hrs <= 24) {
      return { label: "🔥 Deadline", color: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" };
    }
  }
  if (opp.posted_at) {
    const hrs = (Date.now() - new Date(opp.posted_at).getTime()) / (1000 * 60 * 60);
    if (hrs <= 6) return { label: "🆕 NEW", color: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" };
    if (hrs <= 24) return { label: "Today", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" };
  }
  return null;
}

export default function OpportunityListItem({
  opp,
  selected,
  onSelect,
}: {
  opp: Opportunity;
  selected: boolean;
  onSelect: () => void;
}) {
  const fresh = freshnessBadge(opp);
  const posted = relativeTime(opp.posted_at);
  const shoot = shortDate(opp.work_date);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left p-3 rounded-lg border transition-colors ${
        selected
          ? "bg-blue-50 dark:bg-blue-950/40 border-blue-500 dark:border-blue-600"
          : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 line-clamp-2 flex-1 min-w-0">
          {opp.title || "(No title)"}
        </h4>
        <span className="text-xs text-zinc-500 dark:text-zinc-400 shrink-0 whitespace-nowrap">
          {posted}
        </span>
      </div>

      {opp.source && (
        <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5 truncate">
          {opp.source}
        </p>
      )}

      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-xs text-zinc-600 dark:text-zinc-400">
        {opp.location && <span className="truncate">📍 {opp.location}</span>}
        {shoot && <span>📅 {shoot}</span>}
      </div>

      {opp.pay_rate && (
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mt-1">
          💰 {opp.pay_rate}
        </p>
      )}

      {fresh && (
        <span
          className={`inline-flex items-center px-1.5 py-0.5 mt-1.5 rounded text-xs font-medium ${fresh.color}`}
        >
          {fresh.label}
        </span>
      )}
    </button>
  );
}
