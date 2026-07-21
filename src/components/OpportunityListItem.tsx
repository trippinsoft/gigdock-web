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
      {/* Row 1: Title (always first, always full-width for scan consistency) */}
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 line-clamp-2 flex-1 min-w-0">
          {opp.title || "(No title)"}
        </h4>
        {/* Bookmark icon — visual anchor for future "save" feature */}
        <span
          aria-hidden
          className="shrink-0 text-zinc-300 dark:text-zinc-600 text-lg leading-none mt-0.5"
        >
          ☐
        </span>
      </div>

      {/* Row 2: Thumbnail (if present) + source */}
      <div className="flex items-center gap-2 mt-1.5">
        {opp.image_url && (
          <span className="shrink-0 w-8 h-8 rounded overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={opp.image_url}
              alt=""
              className="w-full h-full object-cover"
            />
          </span>
        )}
        {opp.source && (
          <p className="text-xs text-zinc-600 dark:text-zinc-400 truncate flex-1 min-w-0">
            {opp.source}
          </p>
        )}
      </div>

      {/* Row 3: Location + shoot date */}
      {(opp.location || shoot) && (
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-zinc-600 dark:text-zinc-400">
          {opp.location && <span className="truncate">📍 {opp.location}</span>}
          {shoot && <span>📅 {shoot}</span>}
        </div>
      )}

      {/* Row 4: Pay + tags + posted time */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2">
        {opp.pay_rate && (
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {opp.pay_rate}
          </span>
        )}
        {opp.type && (
          <span className="text-xs px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
            {opp.type}
          </span>
        )}
        {fresh && (
          <span className={`text-xs px-2 py-0.5 rounded font-medium ${fresh.color}`}>
            {fresh.label}
          </span>
        )}
        {posted && (
          <span className="text-xs text-zinc-500 dark:text-zinc-400 ml-auto">
            {posted}
          </span>
        )}
      </div>
    </button>
  );
}
