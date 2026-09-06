"use client";

// Additional Pay editor for a single gig — web mirror of mobile's
// components/GigBumpsBlock.js. Individual entries are rows in `gig_bumps`
// (bump_type, amount, note, gig_date_id). Each entry attaches to one of the
// gig's booked or worked dates — no other statuses are eligible.
//
// Rules matched from mobile (do not change without also changing mobile):
//   • Type list is fixed: fitting / car / gas / props / other.
//   • Amount must be > $0.
//   • `gig_dates.base_pay_applies` (bool, default true) is the date-level
//     "regular pay" flag. When false, that date's regular guarantee/hourly/
//     day/flat pay does not apply — only the additional-pay entries do
//     (a "bumps-only" or additional-pay-only day). The flag is shared by
//     every entry on that date.
//   • Toggling the flag on a WORKED date requires an earnings-impact
//     confirmation before saving.
//   • Removing the last entry on a bumps-only date — via delete or via
//     moving it to another date — must not silently re-add regular pay.
//     User picks explicitly: "Remove Entry & Date" or "Make Regular Workday".
//   • Delete is soft (patch `deleted_at`), never a hard delete.
//   • All writes go through the browser Supabase client under RLS. No RPC.
//
// The Gig Detail page (server component) mounts this component and calls
// router.refresh() on close so its aggregate figures re-render from the
// server.

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import {
  ADDITIONAL_PAY_TYPES,
  additionalPayTypeLabel,
  additionalPayTypeOptionLabel,
  type AdditionalPayType,
} from "@/lib/additionalPayLabels";
import { money } from "@/lib/format";

type EligibleDate = {
  id: string;
  date: string;
  status_for_day: "booked" | "worked" | null;
  base_pay_applies: boolean | null;
};

type BumpRow = {
  id: string;
  gig_id: string;
  gig_date_id: string;
  bump_type: string;
  amount: number;
  note: string | null;
  created_at: string;
  gig_dates: {
    id: string;
    date: string;
    status_for_day: "booked" | "worked" | null;
    base_pay_applies: boolean | null;
  } | null;
};

type Confirmation = {
  title: string;
  message: string;
  actions: {
    label: string;
    onClick?: () => void;
    kind?: "default" | "primary" | "destructive";
  }[];
} | null;

function longDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function AdditionalPayEditor({
  gigId,
  userId,
  onClose,
}: {
  gigId: string;
  userId: string;
  onClose: () => void;
}) {
  const supabase = useMemo(() => createSupabaseBrowser(), []);
  const router = useRouter();

  const [bumps, setBumps] = useState<BumpRow[]>([]);
  const [dates, setDates] = useState<EligibleDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BumpRow | null>(null);

  const [gigDateId, setGigDateId] = useState("");
  const [type, setType] = useState<AdditionalPayType>("car");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [noRegularPay, setNoRegularPay] = useState(false);

  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<BumpRow | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    // Bumps for this gig, joined to their date row so we know status +
    // base_pay_applies. Filter out any soft-deleted date via the join.
    const bumpsQ = supabase
      .from("gig_bumps")
      .select(
        "id,gig_id,gig_date_id,bump_type,amount,note,created_at,gig_dates!inner(id,date,status_for_day,base_pay_applies,deleted_at)"
      )
      .eq("gig_id", gigId)
      .is("deleted_at", null)
      .is("gig_dates.deleted_at", null)
      .order("created_at", { ascending: true });
    const datesQ = supabase
      .from("gig_dates")
      .select("id,date,status_for_day,base_pay_applies")
      .eq("gig_id", gigId)
      .is("deleted_at", null)
      .in("status_for_day", ["booked", "worked"])
      .order("date", { ascending: true });
    const [bumpsRes, datesRes] = await Promise.all([bumpsQ, datesQ]);
    if (bumpsRes.error) {
      setError("Couldn't load additional pay — please try again.");
    } else {
      setBumps((bumpsRes.data ?? []) as unknown as BumpRow[]);
    }
    if (!datesRes.error) setDates((datesRes.data ?? []) as EligibleDate[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gigId]);

  const close = () => {
    onClose();
    // Refresh the server-rendered Gig Detail so aggregate figures update.
    router.refresh();
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    setError(null);
  };

  const openForm = (bump: BumpRow | null) => {
    const firstDate = dates.length === 1 ? dates[0].id : "";
    setEditing(bump);
    setGigDateId(bump?.gig_date_id ?? firstDate);
    setType((bump?.bump_type as AdditionalPayType) ?? "car");
    setAmount(bump ? String(bump.amount) : "");
    setNote(bump?.note ?? "");
    const selectedDate = dates.find((d) => d.id === (bump?.gig_date_id ?? firstDate));
    setNoRegularPay(selectedDate?.base_pay_applies === false);
    setError(null);
    setFormOpen(true);
  };

  const selectGigDate = (value: string) => {
    setGigDateId(value);
    const selectedDate = dates.find((d) => d.id === value);
    setNoRegularPay(selectedDate?.base_pay_applies === false);
  };

  async function persistPayTreatment(dateId: string, base_pay_applies: boolean) {
    const { error: e } = await supabase
      .from("gig_dates")
      .update({ base_pay_applies })
      .eq("id", dateId);
    if (e) throw e;
  }

  async function runSave(originalDateResolution?: "remove_date" | "regular_day") {
    setSaving(true);
    setError(null);
    try {
      const amountNum = Number(amount);
      if (!gigDateId) throw new Error("Choose a gig date.");
      if (!Number.isFinite(amountNum) || amountNum <= 0)
        throw new Error("Enter an amount greater than $0.");

      const values = {
        gig_date_id: gigDateId,
        bump_type: type,
        amount: amountNum,
        note: note.trim() || null,
      };

      if (editing) {
        const { error: e } = await supabase.from("gig_bumps").update(values).eq("id", editing.id);
        if (e) throw e;
      } else {
        const { error: e } = await supabase
          .from("gig_bumps")
          .insert({ ...values, gig_id: gigId, user_id: userId });
        if (e) throw e;
      }

      const selectedDate = dates.find((d) => d.id === gigDateId);
      if (selectedDate && selectedDate.base_pay_applies !== !noRegularPay) {
        await persistPayTreatment(gigDateId, !noRegularPay);
      }

      if (
        originalDateResolution &&
        editing &&
        editing.gig_date_id !== gigDateId
      ) {
        if (originalDateResolution === "remove_date") {
          const { error: e } = await supabase
            .from("gig_dates")
            .update({ deleted_at: new Date().toISOString() })
            .eq("id", editing.gig_date_id);
          if (e) throw e;
        } else {
          await persistPayTreatment(editing.gig_date_id, true);
        }
      }

      closeForm();
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Additional pay could not be saved.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  function requestSave() {
    const selectedDate = dates.find((d) => d.id === gigDateId);
    const payTreatmentChanged =
      selectedDate && selectedDate.base_pay_applies !== !noRegularPay;

    // Moving a bump off a bumps-only date whose only entry it is: force a
    // pick so the original date doesn't silently re-add regular pay.
    if (editing && editing.gig_date_id !== gigDateId) {
      const originalDateEntries = bumps.filter((b) => b.gig_date_id === editing.gig_date_id);
      const originalDate = dates.find((d) => d.id === editing.gig_date_id);
      if (originalDateEntries.length === 1 && originalDate?.base_pay_applies === false) {
        setConfirmation({
          title: "What should happen to the original date?",
          message:
            "This is the last additional-pay entry on an additional-pay-only date. Choose explicitly so regular earnings aren't added by surprise.",
          actions: [
            { label: "Cancel" },
            {
              label: "Remove entry & date",
              kind: "destructive",
              onClick: () => runSave("remove_date"),
            },
            {
              label: "Make regular workday",
              kind: "primary",
              onClick: () => runSave("regular_day"),
            },
          ],
        });
        return;
      }
    }

    // Toggling pay treatment on a WORKED date changes gross earned.
    if (payTreatmentChanged && selectedDate?.status_for_day === "worked") {
      setConfirmation({
        title: noRegularPay ? "Remove regular pay?" : "Make this a regular workday?",
        message: noRegularPay
          ? "Gross earned will decrease. Only additional pay on this worked date will count as earnings."
          : "Gross earned will increase because regular gig pay will apply to this worked date.",
        actions: [
          { label: "Cancel" },
          {
            label: noRegularPay ? "Remove regular pay" : "Apply regular pay",
            kind: "primary",
            onClick: () => runSave(),
          },
        ],
      });
      return;
    }

    runSave();
  }

  async function runDelete(bump: BumpRow, resolution?: "remove_date" | "regular_day") {
    setSaving(true);
    setError(null);
    try {
      if (resolution === "remove_date") {
        const { error: e } = await supabase
          .from("gig_dates")
          .update({ deleted_at: new Date().toISOString() })
          .eq("id", bump.gig_date_id);
        if (e) throw e;
      } else {
        const { error: e } = await supabase
          .from("gig_bumps")
          .update({ deleted_at: new Date().toISOString() })
          .eq("id", bump.id);
        if (e) throw e;
        if (resolution === "regular_day") {
          await persistPayTreatment(bump.gig_date_id, true);
        }
      }
      setPendingDelete(null);
      closeForm();
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Additional pay could not be removed.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  function requestDelete(bump: BumpRow) {
    const dateEntries = bumps.filter((b) => b.gig_date_id === bump.gig_date_id);
    const bumpDate = dates.find((d) => d.id === bump.gig_date_id);
    if (dateEntries.length === 1 && bumpDate?.base_pay_applies === false) {
      setPendingDelete(null);
      setConfirmation({
        title: "Remove the last entry?",
        message:
          "This is an additional-pay-only date. Choose explicitly so deleting the entry doesn't unexpectedly add regular earnings.",
        actions: [
          { label: "Cancel" },
          {
            label: "Remove entry & date",
            kind: "destructive",
            onClick: () => runDelete(bump, "remove_date"),
          },
          {
            label: "Make regular workday",
            kind: "primary",
            onClick: () => runDelete(bump, "regular_day"),
          },
        ],
      });
      return;
    }
    runDelete(bump);
  }

  const earned = bumps
    .filter((b) => b.gig_dates?.status_for_day === "worked")
    .reduce((s, b) => s + Number(b.amount || 0), 0);
  const upcoming = bumps
    .filter((b) => b.gig_dates?.status_for_day === "booked")
    .reduce((s, b) => s + Number(b.amount || 0), 0);

  // Group entries by date for the list view.
  const grouped = useMemo(() => {
    const g = new Map<string, BumpRow[]>();
    for (const b of bumps) {
      const key = b.gig_dates?.date ?? "";
      const list = g.get(key) ?? [];
      list.push(b);
      g.set(key, list);
    }
    return [...g.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [bumps]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={close}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl"
      >
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 px-4 py-3">
          {formOpen ? (
            <button
              type="button"
              onClick={closeForm}
              aria-label="Back to list"
              className="grid h-8 w-8 place-items-center rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
          ) : (
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="grid h-8 w-8 place-items-center rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          )}
          <h2 className="flex-1 text-center text-base font-bold text-zinc-900 dark:text-zinc-100">
            {formOpen ? (editing ? "Edit Additional Pay" : "Add Additional Pay") : "Additional Pay"}
          </h2>
          <span className="w-8" />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {loading ? (
            <p className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
          ) : formOpen ? (
            dates.length ? (
              <FormBody
                dates={dates}
                gigDateId={gigDateId}
                onSelectGigDate={selectGigDate}
                type={type}
                onType={setType}
                amount={amount}
                onAmount={setAmount}
                note={note}
                onNote={setNote}
                noRegularPay={noRegularPay}
                onNoRegularPay={setNoRegularPay}
                error={error}
                saving={saving}
                editing={editing}
                onSave={requestSave}
                onDelete={editing ? () => setPendingDelete(editing) : undefined}
              />
            ) : (
              <EmptyEligibleDates />
            )
          ) : (
            <ListBody
              bumps={bumps}
              grouped={grouped}
              dates={dates}
              earned={earned}
              upcoming={upcoming}
              onOpen={openForm}
            />
          )}
        </div>

        {/* Footer add button — only shown on list view */}
        {!formOpen && !loading && dates.length > 0 && (
          <div className="border-t border-zinc-100 dark:border-zinc-800 px-4 py-3">
            <button
              type="button"
              onClick={() => openForm(null)}
              className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors"
            >
              + Add Additional Pay
            </button>
          </div>
        )}
      </div>

      {/* Delete confirm */}
      {pendingDelete && (
        <ConfirmDialog
          title="Delete additional pay?"
          message={`This removes ${additionalPayTypeLabel(pendingDelete.bump_type)} · ${money(Number(pendingDelete.amount))} from this gig date.`}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => requestDelete(pendingDelete)}
          confirmLabel="Delete"
          confirmKind="destructive"
          busy={saving}
        />
      )}

      {/* Impact confirmations */}
      {confirmation && (
        <ConfirmDialog
          title={confirmation.title}
          message={confirmation.message}
          actions={confirmation.actions}
          onDismiss={() => setConfirmation(null)}
        />
      )}
    </div>
  );
}

function FormBody({
  dates, gigDateId, onSelectGigDate,
  type, onType, amount, onAmount, note, onNote,
  noRegularPay, onNoRegularPay,
  error, saving, editing, onSave, onDelete,
}: {
  dates: EligibleDate[];
  gigDateId: string;
  onSelectGigDate: (v: string) => void;
  type: AdditionalPayType;
  onType: (v: AdditionalPayType) => void;
  amount: string;
  onAmount: (v: string) => void;
  note: string;
  onNote: (v: string) => void;
  noRegularPay: boolean;
  onNoRegularPay: (v: boolean) => void;
  error: string | null;
  saving: boolean;
  editing: BumpRow | null;
  onSave: () => void;
  onDelete?: () => void;
}) {
  const selectedDate = dates.find((d) => d.id === gigDateId);
  const showBumpsOnlyHint = selectedDate?.base_pay_applies === false;
  const inputCls =
    "w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500";
  const labelCls = "block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5";

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="ap-date" className={labelCls}>Gig Date</label>
        <select id="ap-date" value={gigDateId} onChange={(e) => onSelectGigDate(e.target.value)} className={inputCls}>
          <option value="">Choose a gig date</option>
          {dates.map((d) => (
            <option key={d.id} value={d.id}>
              {longDate(d.date)} — {d.status_for_day === "worked" ? "Worked" : "Booked"}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="ap-type" className={labelCls}>Type</label>
        <select
          id="ap-type"
          value={type}
          onChange={(e) => onType(e.target.value as AdditionalPayType)}
          className={inputCls}
        >
          {ADDITIONAL_PAY_TYPES.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="ap-amount" className={labelCls}>Amount</label>
        <div className="flex items-center">
          <span className="mr-2 text-sm text-zinc-500 dark:text-zinc-400">$</span>
          <input
            id="ap-amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => onAmount(e.target.value)}
            className={inputCls}
          />
        </div>
      </div>
      <div>
        <label htmlFor="ap-note" className={labelCls}>
          Note <span className="font-normal text-zinc-400 dark:text-zinc-500">(optional)</span>
        </label>
        <input
          id="ap-note"
          type="text"
          maxLength={200}
          placeholder="Add a detail"
          value={note}
          onChange={(e) => onNote(e.target.value)}
          className={inputCls}
        />
      </div>

      <button
        type="button"
        onClick={() => onNoRegularPay(!noRegularPay)}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-3 text-left"
        role="switch"
        aria-checked={noRegularPay}
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-zinc-800 dark:text-zinc-100">No regular pay for this date</span>
          <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
            Use this for fittings or other dates where you&rsquo;re only paid the additional-pay amount.
          </span>
        </span>
        <span
          className={`shrink-0 h-6 w-11 rounded-full transition-colors ${
            noRegularPay ? "bg-blue-600" : "bg-zinc-300 dark:bg-zinc-700"
          } relative`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
              noRegularPay ? "left-[calc(100%-1.375rem)]" : "left-0.5"
            }`}
          />
        </span>
      </button>

      {showBumpsOnlyHint && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Additional-pay-only date — regular gig pay does not apply.
        </p>
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 px-4 py-2.5 text-sm font-semibold text-white transition-colors"
      >
        {saving ? "Saving…" : editing ? "Save Changes" : "Add Additional Pay"}
      </button>

      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          disabled={saving}
          className="w-full py-2 text-sm font-semibold text-red-600 dark:text-red-400 hover:underline disabled:opacity-60"
        >
          Delete Additional Pay
        </button>
      )}
    </div>
  );
}

function ListBody({
  bumps, grouped, dates, earned, upcoming, onOpen,
}: {
  bumps: BumpRow[];
  grouped: [string, BumpRow[]][];
  dates: EligibleDate[];
  earned: number;
  upcoming: number;
  onOpen: (bump: BumpRow | null) => void;
}) {
  if (bumps.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-base font-semibold text-zinc-800 dark:text-zinc-100">No additional pay yet</p>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {dates.length === 0
            ? "Book or work a day for this gig first, then add extra pay to it."
            : "Add extra pay to a booked or worked gig date."}
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 divide-x divide-zinc-100 dark:divide-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
        <div className="px-4 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Earned</div>
          <div className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-100">{money(earned)}</div>
        </div>
        <div className="px-4 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Upcoming</div>
          <div className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-100">{money(upcoming)}</div>
        </div>
      </div>
      {grouped.map(([date, entries]) => {
        const bumpsOnly = entries[0]?.gig_dates?.base_pay_applies === false;
        return (
          <div key={date}>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{longDate(date)}</span>
              {bumpsOnly && (
                <span className="rounded bg-blue-100 dark:bg-blue-900/40 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                  Additional pay only
                </span>
              )}
            </div>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
              {entries.map((b) => (
                <button
                  key={b.id}
                  onClick={() => onOpen(b)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {additionalPayTypeOptionLabel(b.bump_type)}
                    </div>
                    {b.note && (
                      <div className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">{b.note}</div>
                    )}
                  </div>
                  <div className="shrink-0 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{money(Number(b.amount))}</div>
                  <svg className="text-zinc-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EmptyEligibleDates() {
  return (
    <div className="py-8 text-center">
      <p className="text-base font-semibold text-zinc-800 dark:text-zinc-100">No booked or worked days to choose</p>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Additional pay attaches to a booked or worked date for this gig. Add a date first.
      </p>
    </div>
  );
}

function ConfirmDialog(props: {
  title: string;
  message: string;
  busy?: boolean;
  onDismiss?: () => void;
} & (
  | { actions: NonNullable<Confirmation>["actions"]; onCancel?: never; onConfirm?: never; confirmLabel?: never; confirmKind?: never }
  | { actions?: never; onCancel: () => void; onConfirm: () => void; confirmLabel: string; confirmKind: "primary" | "destructive" }
)) {
  const buttons =
    "actions" in props && props.actions
      ? props.actions
      : [
          { label: "Cancel", onClick: props.onCancel, kind: "default" as const },
          { label: props.confirmLabel!, onClick: props.onConfirm, kind: props.confirmKind! },
        ];
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onClick={props.onDismiss ?? props.onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xl"
      >
        <h3 className="text-center text-base font-bold text-zinc-900 dark:text-zinc-100">{props.title}</h3>
        <p className="mt-2 text-center text-sm text-zinc-600 dark:text-zinc-300">{props.message}</p>
        <div className="mt-4 flex flex-col gap-2">
          {buttons.map((b, i) => {
            const kind = b.kind ?? "default";
            const cls =
              kind === "primary"
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : kind === "destructive"
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800";
            return (
              <button
                key={i}
                type="button"
                disabled={props.busy}
                onClick={b.onClick}
                className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 ${cls}`}
              >
                {b.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
