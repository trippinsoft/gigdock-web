"use client";

import type { Opportunity } from "@/lib/types";
import { fitTierColor, type GigFitResult } from "@/lib/gigfit";

const FIT_CLASS: Record<string, string> = {
  green: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  blue: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  zinc: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  amber: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  red: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function shortDate(input: string | null): string | null {
  if (!input) return null;
  const [y, m, d] = input.split("T")[0].split("-").map(Number);
  if (!y || !m || !d) return input;
  const currentYear = new Date().getFullYear();
  const base = `${MONTHS[m - 1]} ${d}`;
  return y === currentYear ? base : `${base}, ${y}`;
}

function relativeTime(iso: string | null, nowMs: number): string | null {
  if (!iso) return null;
  const secs = Math.max(0, Math.floor((nowMs - new Date(iso).getTime()) / 1000));
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

function freshnessBadge(opp: Opportunity, nowMs: number): { label: string; color: string } | null {
  // Only genuine urgency (a same-day deadline) earns color; freshness is neutral.
  if (opp.apply_by) {
    const deadline = new Date(opp.apply_by + "T23:59:59").getTime();
    const hrs = (deadline - nowMs) / (1000 * 60 * 60);
    if (hrs > 0 && hrs <= 24) {
      return { label: "Deadline today", color: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" };
    }
  }
  if (opp.posted_at) {
    const hrs = (nowMs - new Date(opp.posted_at).getTime()) / (1000 * 60 * 60);
    if (hrs <= 6) return { label: "New", color: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" };
    if (hrs <= 24) return { label: "Today", color: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" };
  }
  return null;
}

export default function OpportunityListItem({
  opp,
  selected = false,
  onSelect,
  href,
  now,
  fit,
  saved,
  onToggleSave,
  dense,
}: {
  opp: Opportunity;
  selected?: boolean;
  /** Feed/app mode: click opens the detail sheet (rendered as a <button>). */
  onSelect?: () => void;
  /** Landing-page mode: render a real crawlable <a href> to the gig page. When
   *  BOTH href and onSelect are given, the link is intercepted to open the sheet
   *  (progressive enhancement: crawlable for bots, in-app for people). */
  href?: string;
  /** Stable timestamp so SSR and hydration compute the same relative times. */
  now?: number;
  fit?: GigFitResult | null;
  /** When provided, the corner shows a working save bookmark. */
  saved?: boolean;
  onToggleSave?: () => void;
  /** Admin uses a compact type scale for faster review. */
  dense?: boolean;
}) {
  const nowMs = now ?? Date.now();
  const fresh = freshnessBadge(opp, nowMs);
  const posted = relativeTime(opp.posted_at, nowMs);
  const shoot = shortDate(opp.work_date);

  const className = `block w-full text-left rounded-lg border transition-colors ${dense ? "p-3" : "p-4"} ${
    selected
      ? "bg-blue-50 dark:bg-blue-950/40 border-blue-500 dark:border-blue-600"
      : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
  }`;

  const inner = (
    <>
      {/* Row 1: Title (always first, always full-width for scan consistency) */}
      <div className="flex items-start justify-between gap-2">
        <h4 className={`font-semibold ${dense ? "text-sm" : "text-base"} text-zinc-900 dark:text-zinc-100 line-clamp-2 flex-1 min-w-0`}>
          {opp.title || "(No title)"}
        </h4>
        {/* Save bookmark (only when a handler is wired, e.g. the public feed).
            A <span role="button"> avoids nesting a <button> inside the card button. */}
        {onToggleSave && (
          <span
            role="button"
            tabIndex={0}
            aria-label={saved ? "Remove from saved" : "Save"}
            aria-pressed={saved}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleSave();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                onToggleSave();
              }
            }}
            className={`shrink-0 -mr-1 -mt-0.5 p-1 rounded-md cursor-pointer transition-colors ${
              saved
                ? "text-blue-600 dark:text-blue-400"
                : "text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
            }`}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill={saved ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" />
            </svg>
          </span>
        )}
      </div>

      {/* Row 2: Thumbnail (if present) + source (top) & location (bottom) stacked */}
      {(opp.source || opp.location || shoot) && (
        <div className={`flex items-start ${dense ? "gap-2 mt-1.5" : "gap-2.5 mt-2"}`}>
          {opp.image_url && (
            <span className={`shrink-0 rounded overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 ${dense ? "w-10 h-10" : "w-12 h-12"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={opp.image_url}
                alt=""
                className="w-full h-full object-cover"
              />
            </span>
          )}
          <div className="min-w-0 flex-1">
            {opp.source && (
              <p className={`${dense ? "text-xs" : "text-sm"} text-zinc-600 dark:text-zinc-400 truncate`}>
                {opp.source}
              </p>
            )}
            {(opp.location || shoot) && (
              <div className={`flex flex-wrap gap-x-2 gap-y-0.5 ${dense ? "text-xs" : "text-sm"} text-zinc-500 dark:text-zinc-400`}>
                {opp.location && <span className="truncate">{opp.location}</span>}
                {opp.location && shoot && <span className="text-zinc-300 dark:text-zinc-600">·</span>}
                {shoot && <span>{shoot}</span>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Row 4: Pay + match/urgency + posted time */}
      <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 ${dense ? "mt-2" : "mt-2.5"}`}>
        {opp.pay_rate && (
          <span className={`${dense ? "text-sm font-medium" : "text-base font-semibold"} text-zinc-900 dark:text-zinc-100`}>
            {opp.pay_rate}
          </span>
        )}
        {fit && (
          <span className={`${dense ? "text-xs" : "text-[13px]"} px-2 py-0.5 rounded font-medium ${fit.tier === "ineligible" ? FIT_CLASS.zinc : FIT_CLASS[fitTierColor(fit.tier)]}`}>
            {fit.tier === "strong" ? "★ " : ""}{fit.tier === "ineligible" ? "Not a match" : fit.label}
          </span>
        )}
        {fresh && (
          <span className={`${dense ? "text-xs" : "text-[13px]"} px-2 py-0.5 rounded font-medium ${fresh.color}`}>
            {fresh.label}
          </span>
        )}
        {posted && (
          <span className={`${dense ? "text-xs" : "text-[13px]"} text-zinc-500 dark:text-zinc-400 ml-auto`}>
            {posted}
          </span>
        )}
      </div>
    </>
  );

  // Landing-page mode → real crawlable link (intercepted to a sheet only when an
  // onSelect handler is also supplied). Feed/app mode → button.
  if (href) {
    return (
      <a
        href={href}
        className={className}
        onClick={onSelect ? (e) => { e.preventDefault(); onSelect(); } : undefined}
        aria-current={selected ? "true" : undefined}
      >
        {inner}
      </a>
    );
  }
  return (
    <button type="button" onClick={onSelect} className={className}>
      {inner}
    </button>
  );
}
