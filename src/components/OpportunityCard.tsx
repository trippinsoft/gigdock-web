"use client";

import { useState } from "react";
import type { Opportunity } from "@/lib/types";

type Props = {
  opportunity: Opportunity;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onEdit?: (opp: Opportunity) => void;
  onHide?: (id: string) => void;
  onRestore?: (id: string) => void;
  onExpire?: (id: string) => void;
  onDraft?: (id: string) => void;
  actions?: "review" | "active" | "hidden";
};

/* ---------- date formatting helpers ---------- */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "Tue, Aug 25" — appends ", 2027" only if year != current year */
function formatDate(input: string | null): string | null {
  if (!input) return null;
  // work_date/apply_by come as YYYY-MM-DD — parse as local, not UTC
  const [y, m, d] = input.split("T")[0].split("-").map(Number);
  if (!y || !m || !d) return input;
  const dt = new Date(y, m - 1, d);
  const currentYear = new Date().getFullYear();
  const base = `${WEEKDAYS[dt.getDay()]}, ${MONTHS[dt.getMonth()]} ${dt.getDate()}`;
  return y === currentYear ? base : `${base}, ${y}`;
}

/** "3 days ago" / "12 minutes ago" / "just now" */
function relativeTime(iso: string | null): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  const now = Date.now();
  const secs = Math.max(0, Math.floor((now - then) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.floor(days / 365);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

/** Absolute date without weekday — for parenthetical after relative time */
function shortDate(iso: string | null): string | null {
  if (!iso) return null;
  const dt = new Date(iso);
  const currentYear = new Date().getFullYear();
  const base = `${MONTHS[dt.getMonth()]} ${dt.getDate()}`;
  return dt.getFullYear() === currentYear ? base : `${base}, ${dt.getFullYear()}`;
}

/* ---------- component ---------- */

export default function OpportunityCard({
  opportunity: opp,
  onApprove,
  onReject,
  onEdit,
  onHide,
  onRestore,
  onExpire,
  onDraft,
  actions = "review",
}: Props) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [rawOpen, setRawOpen] = useState(false);

  const postedAgo = relativeTime(opp.posted_at);
  const postedAbs = shortDate(opp.posted_at);
  const workDate = formatDate(opp.work_date);
  const applyBy = formatDate(opp.apply_by);

  const specs = opp.casting_specs as Record<string, unknown> | null;

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 mb-4">
      {/* Header row */}
      <div className="flex gap-3 items-start">
        {opp.image_url && (
          <button
            onClick={() => setLightboxOpen(true)}
            className="shrink-0"
            aria-label="Open image"
          >
            <img
              src={opp.image_url}
              alt=""
              className="w-20 h-20 rounded-md object-cover"
            />
          </button>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-lg font-semibold text-white truncate">
              {opp.title}
            </h3>
            {actions === "review" && (
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => onEdit?.(opp)}
                  className="px-3 py-1 text-sm rounded border border-neutral-600 text-neutral-200 hover:bg-neutral-800"
                >
                  Edit
                </button>
                <button
                  onClick={() => onReject?.(opp.id)}
                  className="px-3 py-1 text-sm rounded border border-red-600 text-red-400 hover:bg-red-900/30"
                >
                  Reject
                </button>
                <button
                  onClick={() => onApprove?.(opp.id)}
                  className="px-3 py-1 text-sm rounded bg-green-600 text-white hover:bg-green-500"
                >
                  Approve
                </button>
              </div>
            )}
            {actions === "active" && (
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => onEdit?.(opp)}
                  className="px-3 py-1 text-sm rounded border border-neutral-600 text-neutral-200 hover:bg-neutral-800"
                >
                  Edit
                </button>
                <button
                  onClick={() => onHide?.(opp.id)}
                  className="px-3 py-1 text-sm rounded border border-neutral-600 text-neutral-200 hover:bg-neutral-800"
                >
                  Hide
                </button>
                <button
                  onClick={() => onExpire?.(opp.id)}
                  className="px-3 py-1 text-sm rounded border border-amber-600 text-amber-400 hover:bg-amber-900/30"
                >
                  Expire
                </button>
              </div>
            )}
            {actions === "hidden" && (
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => onDraft?.(opp.id)}
                  className="px-3 py-1 text-sm rounded border border-neutral-600 text-neutral-200 hover:bg-neutral-800"
                >
                  Back to draft
                </button>
                <button
                  onClick={() => onRestore?.(opp.id)}
                  className="px-3 py-1 text-sm rounded bg-green-600 text-white hover:bg-green-500"
                >
                  Restore
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 mt-1">
            <Badge>{opp.status}</Badge>
            <Badge muted>{opp.source_type}</Badge>
            {opp.source && (
              <span className="text-sm text-neutral-400">
                Source: {opp.source}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Summary */}
      {opp.summary && (
        <p className="mt-3 text-neutral-200 leading-relaxed">{opp.summary}</p>
      )}

      {/* Meta grid — clearly labeled */}
      <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
        {postedAgo && (
          <MetaRow icon="🕐" label="Posted">
            <span className="text-neutral-100">{postedAgo}</span>
            {postedAbs && (
              <span className="text-neutral-500 ml-1">({postedAbs})</span>
            )}
          </MetaRow>
        )}
        {opp.location && (
          <MetaRow icon="📍" label="Location">
            <span className="text-neutral-100">{opp.location}</span>
          </MetaRow>
        )}
        {workDate && (
          <MetaRow icon="📅" label="Shoot date">
            <span className="text-neutral-100">{workDate}</span>
          </MetaRow>
        )}
        {applyBy && (
          <MetaRow icon="⏰" label="Apply by">
            <span className="text-neutral-100">{applyBy}</span>
          </MetaRow>
        )}
        {opp.pay_rate && (
          <MetaRow icon="💰" label="Pay">
            <span className="text-neutral-100">{opp.pay_rate}</span>
          </MetaRow>
        )}
        {opp.type && (
          <MetaRow icon="🎬" label="Type">
            <span className="text-neutral-100">{opp.type}</span>
          </MetaRow>
        )}
      </dl>

      {opp.pay_bumps && (
        <p className="mt-3 text-sm">
          <span className="text-neutral-400">Bumps: </span>
          <span className="text-neutral-100">{opp.pay_bumps}</span>
        </p>
      )}

      {opp.requirements && (
        <p className="mt-2 text-sm">
          <span className="text-neutral-400">Requirements: </span>
          <span className="text-neutral-100">{opp.requirements}</span>
        </p>
      )}

      {/* Casting specs pills */}
      {specs && Object.keys(specs).length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {Object.entries(specs).map(([k, v]) => {
            const display = Array.isArray(v) ? v.join(", ") : String(v);
            if (!display) return null;
            return (
              <span
                key={k}
                className="text-xs px-2 py-1 rounded bg-neutral-800 text-neutral-200 border border-neutral-700"
              >
                {k}: {display}
              </span>
            );
          })}
        </div>
      )}

      {opp.application_info && (
        <p className="mt-3 text-sm">
          <span className="text-neutral-400">How to apply: </span>
          <span className="text-neutral-100">{opp.application_info}</span>
        </p>
      )}

      {/* Links */}
      <div className="mt-3 flex gap-4 text-sm">
        {opp.link && (
          <a
            href={opp.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300"
          >
            Apply here →
          </a>
        )}
        {opp.source_url && (
          <a
            href={opp.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-neutral-400 hover:text-neutral-200"
          >
            View original post →
          </a>
        )}
      </div>

      {/* Raw text expandable */}
      {opp.notes && (
        <details className="mt-3">
          <summary
            className="text-xs text-neutral-500 cursor-pointer hover:text-neutral-300"
            onClick={() => setRawOpen((v) => !v)}
          >
            {rawOpen ? "▾" : "▸"} Show raw text
          </summary>
          <pre className="mt-2 text-xs text-neutral-400 whitespace-pre-wrap break-words">
            {opp.notes}
          </pre>
        </details>
      )}

      {/* Lightbox */}
      {lightboxOpen && opp.image_url && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <img
            src={opp.image_url}
            alt=""
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}
    </div>
  );
}

/* ---------- small subcomponents ---------- */

function Badge({
  children,
  muted,
}: {
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded ${
        muted
          ? "bg-neutral-800 text-neutral-400 border border-neutral-700"
          : "bg-blue-900/40 text-blue-300 border border-blue-700/50"
      }`}
    >
      {children}
    </span>
  );
}

function MetaRow({
  icon,
  label,
  children,
}: {
  icon: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <span aria-hidden>{icon}</span>
      <span className="text-neutral-400 shrink-0">{label}:</span>
      <span className="min-w-0">{children}</span>
    </div>
  );
}
