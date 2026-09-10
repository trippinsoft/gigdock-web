"use client";

// Web adaptation of mobile's OpportunityToGigBottomSheetBlock. Workflow parity
// is the contract: same RPC (add_opportunity_to_my_gigs), same argument
// shape, same association mechanism (gigs.opportunity_id), same analytics
// signal points. The visual is a centered modal on desktop and a bottom
// sheet on narrow viewports; the DATA sent is identical to what mobile sends.
//
// Not a redesign of the mobile calendar picker — the web variant lets the
// user manage the advertised work_date and add extra dates with a per-date
// status override, which produces the same p_dates jsonb payload the RPC
// consumes.

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { track } from "@/lib/analytics";
import { parseOpportunityRate } from "@/lib/parseOpportunityRate";
import type { Opportunity } from "@/lib/types";

type DateStatus = "availability_checked" | "booked";
type SelectedDate = { date: string; status: DateStatus };

function fmt(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function AddToMyGigsSheet({
  opportunity,
  onClose,
  onComplete,
  fitTier,
}: {
  opportunity: Opportunity;
  onClose: () => void;
  /** Called with the created gig id + first selected date on success. Parent
   *  can navigate to the new gig / refresh feed state. */
  onComplete: (result: { gigId: string; gigTitle: string; firstDate: string }) => void;
  /** Optional GigFit tier for the started analytics event. */
  fitTier?: string | null;
}) {
  const supabase = useMemo(() => createSupabaseBrowser(), []);
  const router = useRouter();

  const parsedRate = useMemo(() => parseOpportunityRate(opportunity.pay_rate), [opportunity.pay_rate]);
  const advertisedDate = opportunity.work_date?.slice(0, 10) ?? null;

  // Preselect the advertised date if present. Users can remove it or add
  // additional dates below. New dates start as availability_checked and can
  // be toggled to Booked per row.
  const [dates, setDates] = useState<SelectedDate[]>(() =>
    advertisedDate ? [{ date: advertisedDate, status: "availability_checked" }] : []
  );

  const [newDate, setNewDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Fire the Started event once when the sheet mounts.
  useEffect(() => {
    track("opportunity_add_to_gigs_started", {
      opportunity_id: opportunity.id,
      fit_tier: fitTier ?? "unavailable",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setStatusForRow(i: number, status: DateStatus) {
    setDates((prev) => prev.map((d, idx) => (idx === i ? { ...d, status } : d)));
  }

  function removeRow(i: number) {
    setDates((prev) => prev.filter((_, idx) => idx !== i));
  }

  function addDate() {
    const iso = newDate.slice(0, 10);
    if (!iso) return;
    if (dates.some((d) => d.date === iso)) {
      setError("That date is already in the list.");
      return;
    }
    setError(null);
    setDates((prev) =>
      [...prev, { date: iso, status: "availability_checked" as DateStatus }].sort((a, b) =>
        a.date.localeCompare(b.date)
      )
    );
    setNewDate("");
  }

  async function submit() {
    if (dates.length === 0) {
      setError("Select at least one date to continue.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      // Matches mobile's addOpportunityToMyGigsPOST argument shape exactly.
      // Do NOT reshape p_dates — the RPC reads {date, status} per element.
      const { data, error: rpcErr } = await supabase.rpc("add_opportunity_to_my_gigs", {
        p_opportunity_id: opportunity.id,
        p_dates: dates,
        p_pay_type: parsedRate.payType ?? null,
        p_pay_minimum_amount: parsedRate.payMinimumAmount ?? null,
        p_pay_minimum_hours: parsedRate.payMinimumHours ?? null,
        p_pay_hourly_rate: parsedRate.payHourlyRate ?? null,
        p_pay_flat_rate: parsedRate.payFlatRate ?? null,
      });
      if (rpcErr) throw rpcErr;
      const row = Array.isArray(data) ? data[0] : data;
      const gigId: string | undefined = row?.gig_id;
      if (!gigId) throw new Error("The gig could not be created.");

      const hasBookedDate = dates.some((d) => d.status === "booked");
      track("opportunity_added_to_gigs", {
        opportunity_id: opportunity.id,
        gig_id: gigId,
        booking_status: hasBookedDate ? "booked" : "availability_checked",
        date_count: dates.length,
        rate_type: parsedRate.payType ?? "unrecognized",
      });
      if (hasBookedDate) {
        track("opportunity_booked", {
          opportunity_id: opportunity.id,
          gig_id: gigId,
          booking_source: "opportunity_conversion",
          date_count: dates.length,
        });
      }

      // Refresh any server-rendered views (My Gigs, Calendar, Today) that
      // read the shared gigs table.
      router.refresh();

      onComplete({
        gigId,
        gigTitle: opportunity.title,
        firstDate: dates[0].date,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "The gig could not be added. Please try again.";
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Add to My Gigs"
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg max-h-[92vh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-start gap-2 border-b border-zinc-100 dark:border-zinc-800 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 grid h-8 w-8 place-items-center rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
          <div className="flex-1 min-w-0 text-center">
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Add to My Gigs</h2>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 truncate">{opportunity.title || "Untitled opportunity"}</p>
          </div>
          <span className="w-8 shrink-0" />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <p className="text-sm text-zinc-700 dark:text-zinc-200 leading-relaxed">
            Which dates are you being considered or booked for?
          </p>

          {/* Selected dates + per-date override */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-1.5">
              Selected dates
            </div>
            {dates.length === 0 ? (
              <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 px-3 py-3 text-sm text-zinc-500 dark:text-zinc-400">
                No dates selected yet.
              </div>
            ) : (
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                {dates.map((d, i) => (
                  <li key={d.date} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 px-3 py-2.5">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-zinc-800 dark:text-zinc-100">{fmt(d.date)}</div>
                      {advertisedDate === d.date && (
                        <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                          Advertised
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <MiniStatus
                        label="Avail Ck"
                        active={d.status === "availability_checked"}
                        onClick={() => setStatusForRow(i, "availability_checked")}
                        variant="outline"
                      />
                      <MiniStatus
                        label="Booked"
                        active={d.status === "booked"}
                        onClick={() => setStatusForRow(i, "booked")}
                        variant="filled"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      aria-label={`Remove ${fmt(d.date)}`}
                      className="grid h-8 w-8 place-items-center rounded-md text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M18 6 6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Add-a-date row */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-1.5">
              Add another date
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={newDate}
                min={todayISO()}
                onChange={(e) => setNewDate(e.target.value)}
                className="flex-1 h-10 px-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={addDate}
                disabled={!newDate}
                className="shrink-0 h-10 px-4 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white transition-colors"
              >
                Add date
              </button>
            </div>
          </div>

          {/* Advertised rate (read-only) — if we recognized a structure, the
              RPC will use it to shape the new Gig's pay fields. */}
          {parsedRate.original && (
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-2.5">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Advertised rate
              </div>
              <div className="mt-0.5 text-sm text-zinc-800 dark:text-zinc-100">{parsedRate.original}</div>
              {parsedRate.payType && (
                <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  Recognized details will be prefilled and remain editable.
                </div>
              )}
            </div>
          )}

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2 border-t border-zinc-100 dark:border-zinc-800 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2 rounded-full text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy || dates.length === 0}
            className="px-5 py-2 rounded-full text-sm font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white transition-colors"
          >
            {busy ? "Adding…" : "Add to My Gigs"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Amber cue matches the shared day-status color language used across the app.
// Outline = availability check, filled = booked.
function MiniStatus({
  label,
  active,
  onClick,
  variant,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  variant: "outline" | "filled";
}) {
  const activeCls =
    variant === "filled"
      ? "bg-[#fcd34d] text-zinc-900 dark:bg-[#c99b3b] dark:text-zinc-950 border border-transparent"
      : "bg-white dark:bg-zinc-900 border border-[#fcd34d] text-[#a26200] dark:border-[#c99b3b] dark:text-[#f5c66a]";
  const idleCls =
    "border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wide ${active ? activeCls : idleCls}`}
    >
      {label}
    </button>
  );
}
