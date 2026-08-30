"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { track } from "@/lib/analytics";
import type { Opportunity } from "@/lib/types";
import { getApplyHref } from "@/lib/applyHref";
import { fitTierColor, type GigFitResult } from "@/lib/gigfit";

// Join an array of tags into a readable string; return null if empty.
function joinTags(v: unknown): string | null {
  if (Array.isArray(v)) return v.length ? v.join(", ") : null;
  if (typeof v === "string" && v.trim()) return v;
  return null;
}

/* ---------- inline single-color icons (16px, currentColor) ---------- */

const iconProps = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "w-4 h-4",
};

const ClockIcon = () => (
  <svg {...iconProps}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);
const PinIcon = () => (
  <svg {...iconProps}><path d="M12 21s-6-5.686-6-10a6 6 0 1112 0c0 4.314-6 10-6 10z" /><circle cx="12" cy="11" r="2" /></svg>
);
const CalendarIcon = () => (
  <svg {...iconProps}><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" /></svg>
);
const BellIcon = () => (
  <svg {...iconProps}><path d="M6 8a6 6 0 1112 0c0 7 3 8 3 8H3s3-1 3-8" /><path d="M10.3 21a1.94 1.94 0 003.4 0" /></svg>
);
const PayIcon = () => (
  <svg {...iconProps}><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /><path d="M6 12h.01M18 12h.01" /></svg>
);

/* A single icon + label-over-value detail row (Indeed "Job details" style). */
function MetaRow({
  icon,
  label,
  children,
  dense,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  dense?: boolean;
}) {
  return (
    <div className={`flex items-start ${dense ? "gap-2.5" : "gap-3"}`}>
      <span className="mt-0.5 shrink-0 text-zinc-400 dark:text-zinc-500">{icon}</span>
      <div className="min-w-0">
        <div className={`${dense ? "text-xs" : "text-[13px]"} font-medium text-zinc-500 dark:text-zinc-400`}>{label}</div>
        <div className={`${dense ? "text-sm" : "text-base"} font-semibold text-zinc-900 dark:text-zinc-100`}>{children}</div>
      </div>
    </div>
  );
}

/* A bold near-black heading over readable body text (clear hierarchy). */
function Section({ title, children, dense }: { title: string; children: React.ReactNode; dense?: boolean }) {
  return (
    <div>
      <h4 className={`${dense ? "text-sm" : "text-base"} font-bold text-zinc-900 dark:text-zinc-100`}>{title}</h4>
      <div className={`${dense ? "text-sm mt-1" : "text-[15px] sm:text-base mt-1.5"} text-zinc-700 dark:text-zinc-300 leading-relaxed`}>
        {children}
      </div>
    </div>
  );
}

function Badge({
  children,
  color,
}: {
  children: React.ReactNode;
  color: "green" | "blue" | "amber" | "red" | "zinc";
}) {
  const classes: Record<string, string> = {
    green:
      "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
    blue: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
    amber:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    red: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
    zinc: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${classes[color]}`}
    >
      {children}
    </span>
  );
}

function statusColor(status: string): "green" | "blue" | "amber" | "red" | "zinc" {
  switch (status) {
    case "active":
      return "green";
    case "draft":
      return "blue";
    case "expired":
      return "amber";
    case "hidden":
      return "red";
    default:
      return "zinc";
  }
}

/* ---------- date formatting helpers ---------- */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatDate(input: string | null): string | null {
  if (!input) return null;
  const [y, m, d] = input.split("T")[0].split("-").map(Number);
  if (!y || !m || !d) return input;
  const dt = new Date(y, m - 1, d);
  const currentYear = new Date().getFullYear();
  const base = `${WEEKDAYS[dt.getDay()]}, ${MONTHS[dt.getMonth()]} ${dt.getDate()}`;
  return y === currentYear ? base : `${base}, ${y}`;
}

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

function shortDate(iso: string | null): string | null {
  if (!iso) return null;
  const dt = new Date(iso);
  const currentYear = new Date().getFullYear();
  const base = `${MONTHS[dt.getMonth()]} ${dt.getDate()}`;
  return dt.getFullYear() === currentYear ? base : `${base}, ${dt.getFullYear()}`;
}

/* ---------- freshness pill logic ---------- */

type Freshness =
  | { kind: "new"; label: string }
  | { kind: "today"; label: string }
  | { kind: "deadline-soon"; label: string }
  | null;

function freshness(opp: Opportunity): Freshness {
  // Priority: apply-by deadline (most actionable) > new/today
  if (opp.apply_by) {
    const deadline = new Date(opp.apply_by + "T23:59:59").getTime();
    const hoursUntilDeadline = (deadline - Date.now()) / (1000 * 60 * 60);
    if (hoursUntilDeadline > 0 && hoursUntilDeadline <= 24) {
      return { kind: "deadline-soon", label: "Deadline today" };
    }
  }
  if (opp.posted_at) {
    const posted = new Date(opp.posted_at).getTime();
    const hoursOld = (Date.now() - posted) / (1000 * 60 * 60);
    if (hoursOld <= 6) return { kind: "new", label: "New" };
    if (hoursOld <= 24) return { kind: "today", label: "Today" };
  }
  return null;
}

function freshnessBadge(f: NonNullable<Freshness>) {
  switch (f.kind) {
    // Only a same-day deadline is genuinely urgent; freshness stays neutral gray.
    case "deadline-soon":
      return <Badge color="red">{f.label}</Badge>;
    default:
      return <Badge color="zinc">{f.label}</Badge>;
  }
}

/* ---------- component ---------- */

export default function OpportunityCard({
  opp,
  actions,
  showRawText,
  fit,
  hideAdminMeta = false,
  dense = false,
  onApply,
}: {
  opp: Opportunity;
  actions?: React.ReactNode;
  showRawText?: string | null;
  fit?: GigFitResult | null;
  /** Public feed hides curator-only metadata (status, ai_extracted). */
  hideAdminMeta?: boolean;
  /** Admin uses a compact type scale for faster review. */
  dense?: boolean;
  /** Fired when the user taps Apply — used to auto-mark the gig as applied. */
  onApply?: (kind: "email" | "url") => void;
}) {
  const specs = opp.casting_specs as Record<string, unknown> | null;
  const [lightboxOpen, setLightboxOpen] = useState(false);
  // Portal target — the lightbox must render at document.body so no ancestor
  // (e.g. the location page's sticky/overflow detail column) can clip its
  // position:fixed overlay. Guarded so SSR/first paint don't touch `document`.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const postedAgo = relativeTime(opp.posted_at);
  const postedAbs = shortDate(opp.posted_at);
  const workDate = formatDate(opp.work_date);
  const applyBy = formatDate(opp.apply_by);
  const applyHref = getApplyHref(opp);
  const applyIsEmail = !!applyHref && /^mailto:/i.test(applyHref);
  const fresh = freshness(opp);

  return (
    <div className={`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg ${dense ? "p-4 space-y-3" : "p-4 sm:p-6 space-y-4 sm:space-y-5"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {opp.image_url && (
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              className={`shrink-0 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 ${dense ? "w-14 h-14" : "w-16 h-16"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={opp.image_url}
                alt=""
                className="w-full h-full object-cover"
              />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={`${dense ? "text-lg" : "text-xl sm:text-2xl"} font-bold text-zinc-900 dark:text-zinc-100 leading-snug`}>
                {opp.title || "(No title)"}
              </h3>
              {fit && (
                <Badge color={fitTierColor(fit.tier)}>
                  {fit.tier === "strong" ? "★ " : ""}{fit.label}
                </Badge>
              )}
              {fresh && freshnessBadge(fresh)}
              {!hideAdminMeta && <Badge color={statusColor(opp.status)}>{opp.status}</Badge>}
              {!hideAdminMeta && opp.source_type && (
                <Badge color="zinc">{opp.source_type}</Badge>
              )}
            </div>
            {opp.source && (
              <p className={`${dense ? "text-xs mt-0.5" : "text-sm mt-1"} text-zinc-500 dark:text-zinc-400`}>
                {opp.source}
              </p>
            )}
            {fit && (fit.matched.length > 0 || fit.blockers.length > 0) && (
              <p className={`${dense ? "text-xs mt-0.5" : "text-sm mt-1"} text-zinc-500 dark:text-zinc-400`}>
                {fit.tier === "ineligible"
                  ? `Not eligible — ${fit.blockers.join(" · ")}`
                  : fit.tier === "poor"
                  ? `Poor match — ${fit.blockers.join(" · ")}`
                  : fit.matched.length > 0
                  ? `Matches your ${fit.matched.join(", ")}`
                  : null}
              </p>
            )}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>

      {opp.summary && (
        <p className={`${dense ? "text-sm" : "text-[15px] sm:text-base"} text-zinc-700 dark:text-zinc-300 leading-relaxed`}>{opp.summary}</p>
      )}

      {(opp.pay_rate || opp.location || workDate || applyBy || postedAgo) && (
        <div className={`border-t border-zinc-100 dark:border-zinc-800 ${dense ? "pt-3" : "pt-4"}`}>
          <h4 className={`${dense ? "text-sm mb-2.5" : "text-base mb-3"} font-bold text-zinc-900 dark:text-zinc-100`}>
            Job details
          </h4>
          <div className={`grid grid-cols-1 sm:grid-cols-2 ${dense ? "gap-x-4 gap-y-3" : "gap-x-6 gap-y-4"}`}>
            {opp.pay_rate && (
              <MetaRow icon={<PayIcon />} label="Pay" dense={dense}>{opp.pay_rate}</MetaRow>
            )}
            {opp.location && (
              <MetaRow icon={<PinIcon />} label="Location" dense={dense}>{opp.location}</MetaRow>
            )}
            {workDate && (
              <MetaRow icon={<CalendarIcon />} label="Shoot date" dense={dense}>{workDate}</MetaRow>
            )}
            {applyBy && (
              <MetaRow icon={<BellIcon />} label="Apply by" dense={dense}>{applyBy}</MetaRow>
            )}
            {postedAgo && (
              <MetaRow icon={<ClockIcon />} label="Posted" dense={dense}>
                {postedAgo}
                {postedAbs && (
                  <span className="font-normal text-zinc-400 dark:text-zinc-500"> · {postedAbs}</span>
                )}
              </MetaRow>
            )}
          </div>
        </div>
      )}

      {opp.pay_bumps && <Section title="Bumps" dense={dense}>{opp.pay_bumps}</Section>}

      {opp.requirements && <Section title="Requirements" dense={dense}>{opp.requirements}</Section>}

      {specs && Object.keys(specs).length > 0 && (
        <div className="flex flex-wrap gap-1">
          {joinTags(specs.gender) && (
            <Badge color="zinc">Gender: {joinTags(specs.gender)}</Badge>
          )}
          {(specs.age_min != null || specs.age_max != null) && (
            <Badge color="zinc">
              Age: {specs.age_min != null ? String(specs.age_min) : "any"}
              {"–"}
              {specs.age_max != null ? String(specs.age_max) : "any"}
            </Badge>
          )}
          {joinTags(specs.ethnicity) && (
            <Badge color="zinc">Ethnicity: {joinTags(specs.ethnicity)}</Badge>
          )}
          {joinTags(specs.work_type) && (
            <Badge color="zinc">Type: {joinTags(specs.work_type)}</Badge>
          )}
          {joinTags(specs.union_status) && (
            <Badge color="zinc">Union: {joinTags(specs.union_status)}</Badge>
          )}
          {joinTags(specs.vehicle) && (
            <Badge color="zinc">Vehicle: {joinTags(specs.vehicle)}</Badge>
          )}
          {joinTags(specs.skills) && (
            <Badge color="zinc">Skills: {joinTags(specs.skills)}</Badge>
          )}
        </div>
      )}

      {opp.application_info && (
        <Section title="How to apply" dense={dense}>{opp.application_info}</Section>
      )}

      {/* Primary apply CTA (Indeed-style pill). Label reflects where it goes;
          in-app "Apply on GigDock" comes later. When there's no apply target,
          the original post becomes the primary action. */}
      {applyHref ? (
        <div className="pt-1">
          <a
            href={applyHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              const kind = applyIsEmail ? "email" : "url";
              if (hideAdminMeta) {
                let host: string | undefined;
                try { host = applyIsEmail ? undefined : new URL(applyHref).host; } catch { /* mailto/other */ }
                track("opportunity_applied", {
                  opportunity_id: opp.id,
                  production_name: opp.production_name,
                  market: opp.match_state,
                  source: opp.source,
                  pay_min: opp.pay_min,
                  method: kind,
                  apply_host: host,
                });
              }
              onApply?.(kind);
            }}
            className="block w-full text-center sm:inline-block sm:w-auto rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-6 py-3 transition-colors"
          >
            {applyIsEmail ? "Apply via Email" : "Apply on company site"}
          </a>
          {opp.source_url && (
            <a
              href={opp.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center sm:text-left text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 mt-2.5"
            >
              View original post
            </a>
          )}
        </div>
      ) : (
        opp.source_url && (
          <div className="pt-1">
            <a
              href={opp.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className={`block w-full text-center sm:inline-block sm:w-auto rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 transition-colors ${dense ? "text-sm" : "text-base"}`}
            >
              View original post
            </a>
          </div>
        )
      )}

      {showRawText && (
        <details className="mt-2">
          <summary className="text-xs text-zinc-400 cursor-pointer hover:text-zinc-600 dark:hover:text-zinc-300">
            Show raw text
          </summary>
          <pre className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800 p-3 rounded overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto">
            {showRawText}
          </pre>
        </details>
      )}

      {mounted && lightboxOpen && opp.image_url &&
        createPortal(
          <div
            className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4"
            onClick={() => setLightboxOpen(false)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={opp.image_url}
              alt=""
              className="max-w-full max-h-full rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              className="absolute top-4 right-4 text-white text-3xl leading-none"
            >
              ×
            </button>
          </div>,
          document.body
        )}
    </div>
  );
}
