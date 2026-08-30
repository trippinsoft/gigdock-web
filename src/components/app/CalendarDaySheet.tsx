"use client";

// Calendar day inspector — feature-matched to the mobile CalendarNav
// DayActionSheetBlock. Empty day / gig picker / day sheet. Writes status and
// hours on gig_dates; financials come from load_gig_earnings_summary.

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  loadCalendarDaySheet,
  patchCalendarDay,
} from "@/lib/backoffice-actions";
import { track } from "@/lib/analytics";
import { money, shortDate } from "@/lib/format";
import type { CalendarDate } from "@/lib/backoffice-types";

const DAY_CHIPS: { code: string; label: string }[] = [
  { code: "availability_checked", label: "Avail Ck" },
  { code: "booked", label: "Booked" },
  { code: "worked", label: "Worked" },
];

function mapsUrl(location: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

export default function CalendarDaySheet({
  date,
  flag,
  gigs,
  onClose,
  onNewGig,
  creating,
}: {
  date: string;
  flag?: string;
  gigs: CalendarDate[];
  onClose: () => void;
  onNewGig: () => void;
  creating: boolean;
}) {
  const [pickedId, setPickedId] = useState<string | null>(
    gigs.length === 1 ? gigs[0].id : null
  );

  useEffect(() => {
    setPickedId(gigs.length === 1 ? gigs[0].id : null);
  }, [date, gigs]);

  const picked = gigs.find((g) => g.id === pickedId) ?? null;
  const showPicker = gigs.length > 1 && !picked;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 lg:static lg:z-auto lg:w-[22.5rem] lg:shrink-0 lg:max-h-[calc(100vh-8rem)] lg:rounded-2xl lg:border">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100">{shortDate(date)}</h3>
            {flag && (
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400 mt-0.5">
                {flag === "unavailable" ? "Unavailable" : flag}
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-2xl leading-none" aria-label="Close">×</button>
        </div>

        {gigs.length === 0 && <EmptyDay />}
        {showPicker && <GigPicker gigs={gigs} onPick={setPickedId} />}
        {picked && picked.gig_id && (
          <GigDaySheet
            row={picked}
            showBack={gigs.length > 1}
            onBack={() => setPickedId(null)}
          />
        )}

        <div className="mt-3 flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800 border-t border-zinc-100 dark:border-zinc-800">
          <ActionRow icon={<IconPlus />} label="New gig" onClick={onNewGig} busy={creating} />
          <ActionRow icon={<IconDoc />} label="Add document" hint="Soon on web" disabled />
          <ActionRow icon={<IconReceipt />} label="Add expense" hint="Soon on web" disabled />
        </div>
      </div>
    </>
  );
}

function EmptyDay() {
  return <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Nothing scheduled this day.</p>;
}

function GigPicker({ gigs, onPick }: { gigs: CalendarDate[]; onPick: (id: string) => void }) {
  return (
    <div className="mb-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500 mb-1.5">Choose a gig</div>
      <div className="flex flex-col gap-1.5">
        {gigs.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => onPick(g.id)}
            className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
          >
            <div className="font-medium text-zinc-900 dark:text-zinc-100">{g.gig?.title || "Untitled gig"}</div>
            <div className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">{chipLabel(g.status_for_day)}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function GigDaySheet({
  row,
  showBack,
  onBack,
}: {
  row: CalendarDate;
  showBack: boolean;
  onBack: () => void;
}) {
  const gigId = row.gig_id!;
  const location = row.gig?.location?.trim() || "";
  const router = useRouter();
  const [status, setStatus] = useState(row.status_for_day ?? "worked");
  const [hours, setHours] = useState(row.hours_total != null ? String(row.hours_total) : "");
  const [dayEarned, setDayEarned] = useState<number | null>(null);
  const [gross, setGross] = useState(Number(row.gross_earned ?? 0));
  const [paid, setPaid] = useState(Number(row.total_paid ?? 0));
  const [outstanding, setOutstanding] = useState(Math.max(Number(row.remaining ?? 0), 0));
  const [pct, setPct] = useState(Number(row.received_percent ?? 0));
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setStatus(row.status_for_day ?? "worked");
    setHours(row.hours_total != null ? String(row.hours_total) : "");
    setGross(Number(row.gross_earned ?? 0));
    setPaid(Number(row.total_paid ?? 0));
    setOutstanding(Math.max(Number(row.remaining ?? 0), 0));
    setPct(Number(row.received_percent ?? 0));
    setDayEarned(null);
    setError(null);
    let cancelled = false;
    loadCalendarDaySheet({ gigDateId: row.id, gigId }).then((res) => {
      if (cancelled || !res.ok || !res.data) return;
      applyPatch(res.data);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row.id, gigId]);

  function applyPatch(d: {
    status_for_day: string | null;
    hours_total: number | null;
    day_earned: number | null;
    gross_earned: number | null;
    total_paid: number | null;
    remaining: number | null;
    received_percent: number | null;
  }) {
    if (d.status_for_day != null) setStatus(d.status_for_day);
    if (d.hours_total != null) setHours(String(d.hours_total));
    setDayEarned(d.day_earned);
    if (d.gross_earned != null) setGross(Number(d.gross_earned));
    if (d.total_paid != null) setPaid(Number(d.total_paid));
    if (d.remaining != null) setOutstanding(Math.max(Number(d.remaining), 0));
    if (d.received_percent != null) setPct(Number(d.received_percent));
  }

  async function saveStatus(next: string) {
    if (next === status || busy) return;
    setBusy(true);
    setError(null);
    const res = await patchCalendarDay({ gigDateId: row.id, gigId, status_for_day: next });
    setBusy(false);
    if (!res.ok || !res.data) {
      setError(res.ok ? "Could not update status." : res.error);
      return;
    }
    applyPatch(res.data);
    router.refresh();
  }

  async function saveHours() {
    const n = Number(hours);
    const value = Number.isFinite(n) ? n : 0;
    setBusy(true);
    setError(null);
    const res = await patchCalendarDay({ gigDateId: row.id, gigId, hours_total: value });
    setBusy(false);
    if (!res.ok || !res.data) {
      setError(res.ok ? "Could not save hours." : res.error);
      return;
    }
    applyPatch(res.data);
    track("hours_entered_on_day", { gig_id: gigId, gig_date_id: row.id, hours_total: value });
    router.refresh();
  }

  async function copyLocation() {
    try {
      await navigator.clipboard.writeText(location);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be denied */
    }
  }

  const showHours = status !== "availability_checked" && status !== "booked";
  const bumps = Number(row.bumps ?? 0);

  return (
    <div className="mb-2">
      {showBack && (
        <button type="button" onClick={onBack} className="mb-2 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">
          ← Choose a gig
        </button>
      )}

      <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100 leading-snug">{row.gig?.title || "Untitled gig"}</h4>

      <div className="mt-3 rounded-xl border border-zinc-200 dark:border-zinc-800 p-3">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Gross earned</div>
        <div className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-100">{money(gross)}</div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-green-600 dark:text-green-400">{money(paid)}</div>
            <div className="text-[11px] text-zinc-400 dark:text-zinc-500">Received</div>
          </div>
          <PayRing pct={pct} />
          <div className="min-w-0 text-right">
            <div className={`text-sm font-semibold ${outstanding > 0 ? "text-amber-600 dark:text-amber-400" : "text-zinc-800 dark:text-zinc-200"}`}>{money(outstanding)}</div>
            <div className="text-[11px] text-zinc-400 dark:text-zinc-500">Outstanding</div>
          </div>
        </div>
      </div>

      <div className="mt-3">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500 mb-1.5">Day options</div>
        <div className="flex gap-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 p-0.5">
          {DAY_CHIPS.map((c) => (
            <button
              key={c.code}
              type="button"
              disabled={busy}
              onClick={() => saveStatus(c.code)}
              className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium ${
                status === c.code
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                  : "text-zinc-500 dark:text-zinc-400"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {showHours && (
          <label className="mt-3 block">
            <span className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Hours</span>
            <input
              type="number"
              step="0.25"
              min="0"
              value={hours}
              disabled={busy}
              onChange={(e) => setHours(e.target.value)}
              onBlur={saveHours}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              }}
              className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {dayEarned != null && (
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Earned: {money(dayEarned)}</p>
            )}
          </label>
        )}

        {bumps > 0 && (
          <Link href={`/gigs/${gigId}/edit`} className="mt-2 flex items-center justify-between rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
            <span className="text-zinc-700 dark:text-zinc-200">Bumps</span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">{money(bumps)}</span>
          </Link>
        )}
      </div>

      {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}

      <div className="mt-3 flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
        <Link href={`/gigs/${gigId}`} className="flex items-center justify-between px-3 py-2.5 text-sm font-medium text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
          Gig Details <span className="text-zinc-400">→</span>
        </Link>
        {location ? (
          <div className="px-3 py-2.5">
            <a
              href={mapsUrl(location)}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-sm font-medium text-blue-600 dark:text-blue-400 underline underline-offset-2"
            >
              {location}
            </a>
            <button type="button" onClick={copyLocation} className="mt-1 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:underline">
              {copied ? "Copied" : "Copy address"}
            </button>
          </div>
        ) : null}
        <Link href={`/gigs/${gigId}/edit`} className="flex items-center justify-between px-3 py-2.5 text-sm font-medium text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
          Payment Details <span className="text-zinc-400">→</span>
        </Link>
      </div>
    </div>
  );
}

function PayRing({ pct }: { pct: number }) {
  const p = Math.min(Math.max(Math.round(pct), 0), 100);
  const r = 16;
  const c = 2 * Math.PI * r;
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" className="shrink-0" aria-label={`${p}% received`}>
      <circle cx="24" cy="24" r={r} fill="none" stroke="currentColor" className="text-zinc-200 dark:text-zinc-700" strokeWidth="4" />
      <circle
        cx="24"
        cy="24"
        r={r}
        fill="none"
        stroke="currentColor"
        className={p >= 100 ? "text-green-500" : "text-blue-600 dark:text-blue-400"}
        strokeWidth="4"
        strokeDasharray={`${(p / 100) * c} ${c}`}
        strokeLinecap="round"
        transform="rotate(-90 24 24)"
      />
      <text x="24" y="24" textAnchor="middle" dominantBaseline="central" className="fill-zinc-700 dark:fill-zinc-200" fontSize="10" fontWeight="700">
        {p}%
      </text>
    </svg>
  );
}

function chipLabel(code: string | null | undefined) {
  return DAY_CHIPS.find((c) => c.code === code)?.label ?? code ?? "—";
}

function ActionRow({
  icon,
  label,
  href,
  onClick,
  busy,
  disabled,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
  busy?: boolean;
  disabled?: boolean;
  hint?: string;
}) {
  const inner = (
    <div className="flex items-center gap-3 py-3">
      <span className={`shrink-0 ${disabled ? "text-zinc-300 dark:text-zinc-700" : "text-blue-600 dark:text-blue-400"}`}>{icon}</span>
      <span className={`flex-1 text-sm font-medium ${disabled ? "text-zinc-400 dark:text-zinc-600" : "text-zinc-800 dark:text-zinc-200"}`}>{busy ? "Working…" : label}</span>
      {hint && <span className="text-[11px] uppercase tracking-wide text-zinc-300 dark:text-zinc-700 border border-zinc-200 dark:border-zinc-800 rounded px-1 py-0.5">{hint}</span>}
    </div>
  );
  if (disabled) return <div aria-disabled className="cursor-default">{inner}</div>;
  if (href) return <Link href={href} className="block hover:opacity-80">{inner}</Link>;
  return (
    <button type="button" onClick={onClick} disabled={busy} className="block w-full text-left hover:opacity-80 disabled:opacity-50">
      {inner}
    </button>
  );
}

function IconPlus() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function IconDoc() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3v5h5" />
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    </svg>
  );
}
function IconReceipt() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 3v18l3-2 3 2 3-2 3 2 3-2V3l-3 2-3-2-3 2-3-2-3 2Z" />
      <path d="M8 8h8M8 12h6" />
    </svg>
  );
}
