"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveGigDate, deleteGigDate, type GigDateFields } from "@/lib/backoffice-actions";
import { DAY_STATUSES } from "@/lib/gigVocab";
import { dayGrossEarned, type PayType } from "@/lib/pay";
import { money, shortDate } from "@/lib/format";

export type RawDay = {
  id: string;
  date: string;
  status_for_day: string | null;
  hours_total: number | null;
  hours_lunch: number | null;
  overtime_hours: number | null;
  bumps: number | null;
  base_pay_applies: boolean | null;
  notes: string | null;
};

export type PayModel = {
  pay_type: PayType | null;
  pay_minimum_amount: number | null;
  pay_minimum_hours: number | null;
  pay_hourly_rate: number | null;
  ot_starts_after_hours: number | null;
  ot_multiplier: number | null;
};

type Draft = {
  id?: string;
  date: string;
  status_for_day: string;
  hours_total: string;
  hours_lunch: string;
  overtime_hours: string;
  bumps: string;
  base_pay_applies: boolean;
  notes: string;
};

const todayStr = () => new Date().toISOString().slice(0, 10);

function toDraft(d: RawDay): Draft {
  return {
    id: d.id,
    date: d.date.slice(0, 10),
    status_for_day: d.status_for_day ?? "worked",
    hours_total: d.hours_total != null ? String(d.hours_total) : "",
    hours_lunch: d.hours_lunch != null ? String(d.hours_lunch) : "",
    overtime_hours: d.overtime_hours != null ? String(d.overtime_hours) : "",
    bumps: d.bumps != null ? String(d.bumps) : "",
    base_pay_applies: d.base_pay_applies ?? true,
    notes: d.notes ?? "",
  };
}

const blank = (): Draft => ({
  date: todayStr(),
  status_for_day: "worked",
  hours_total: "",
  hours_lunch: "",
  overtime_hours: "",
  bumps: "",
  base_pay_applies: true,
  notes: "",
});

export default function GigDatesEditor({
  gigId,
  initial,
  payModel,
}: {
  gigId: string;
  initial: RawDay[];
  payModel: PayModel;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(draft: Draft) {
    setError(null);
    if (!draft.date) {
      setError("Pick a date.");
      return;
    }
    setBusy(true);
    const fields: GigDateFields = {
      id: draft.id,
      gig_id: gigId,
      date: draft.date,
      status_for_day: draft.status_for_day,
      hours_total: numOr0(draft.hours_total),
      hours_lunch: numOr0(draft.hours_lunch),
      overtime_hours: numOr0(draft.overtime_hours),
      bumps: numOr0(draft.bumps),
      base_pay_applies: draft.base_pay_applies,
      notes: draft.notes.trim() || null,
    };
    const res = await saveGigDate(fields);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setEditing(null);
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Remove this day?")) return;
    setBusy(true);
    const res = await deleteGigDate(id, gigId);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setEditing(null);
    router.refresh();
  }

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Worked days</h2>
        {!editing && (
          <button
            onClick={() => setEditing(blank())}
            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700"
          >
            + Add day
          </button>
        )}
      </div>

      {error && <p className="mb-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        {initial.length === 0 && !editing && (
          <p className="text-sm text-zinc-400 dark:text-zinc-500 px-4 py-4">No days yet.</p>
        )}

        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {initial.map((d) =>
            editing?.id === d.id ? (
              <DayForm key={d.id} draft={editing} setDraft={setEditing} onSave={save} onCancel={() => setEditing(null)} onDelete={() => remove(d.id)} busy={busy} payModel={payModel} />
            ) : (
              <DayRow key={d.id} d={d} payModel={payModel} onEdit={() => setEditing(toDraft(d))} />
            )
          )}
        </div>

        {editing && !editing.id && (
          <div className="border-t border-zinc-100 dark:border-zinc-800">
            <DayForm draft={editing} setDraft={setEditing} onSave={save} onCancel={() => setEditing(null)} busy={busy} payModel={payModel} />
          </div>
        )}
      </div>
    </section>
  );
}

function DayRow({ d, payModel, onEdit }: { d: RawDay; payModel: PayModel; onEdit: () => void }) {
  const gross = previewGross(payModel, d.hours_total ?? 0, d.bumps ?? 0, d.base_pay_applies ?? true);
  return (
    <button onClick={onEdit} className="w-full text-left flex items-center justify-between gap-4 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
      <div className="min-w-0">
        <div className="font-medium text-zinc-800 dark:text-zinc-200">{shortDate(d.date)}</div>
        <div className="text-xs text-zinc-400 dark:text-zinc-500">
          {d.status_for_day ?? "worked"}
          {d.hours_total != null && <> · {Number(d.hours_total)} hrs</>}
          {d.bumps ? <> · {money(Number(d.bumps))} bumps</> : null}
        </div>
      </div>
      {gross != null && <div className="shrink-0 text-sm font-medium text-zinc-700 dark:text-zinc-300">{money(gross)}</div>}
    </button>
  );
}

function DayForm({
  draft,
  setDraft,
  onSave,
  onCancel,
  onDelete,
  busy,
  payModel,
}: {
  draft: Draft;
  setDraft: (d: Draft) => void;
  onSave: (d: Draft) => void;
  onCancel: () => void;
  onDelete?: () => void;
  busy: boolean;
  payModel: PayModel;
}) {
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft({ ...draft, [k]: v });
  const preview = previewGross(payModel, numOr0(draft.hours_total), numOr0(draft.bumps), draft.base_pay_applies);

  return (
    <div className="px-4 py-4 bg-zinc-50/60 dark:bg-zinc-950/40">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Field label="Date">
          <input type="date" value={draft.date} onChange={(e) => set("date", e.target.value)} className={inp} />
        </Field>
        <Field label="Status">
          <select value={draft.status_for_day} onChange={(e) => set("status_for_day", e.target.value)} className={inp}>
            {DAY_STATUSES.map((s) => (
              <option key={s.code} value={s.code}>{s.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Hours worked">
          <input type="number" step="0.25" value={draft.hours_total} onChange={(e) => set("hours_total", e.target.value)} className={inp} />
        </Field>
        <Field label="Lunch (hrs)">
          <input type="number" step="0.25" value={draft.hours_lunch} onChange={(e) => set("hours_lunch", e.target.value)} className={inp} />
        </Field>
        <Field label="Overtime (hrs)">
          <input type="number" step="0.25" value={draft.overtime_hours} onChange={(e) => set("overtime_hours", e.target.value)} className={inp} />
        </Field>
        <Field label="Bumps ($)">
          <input type="number" step="0.01" value={draft.bumps} onChange={(e) => set("bumps", e.target.value)} className={inp} />
        </Field>
      </div>

      <label className="mt-3 flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
        <input type="checkbox" checked={draft.base_pay_applies} onChange={(e) => set("base_pay_applies", e.target.checked)} className="rounded" />
        Base pay applies to this day
      </label>

      <Field label="Notes" className="mt-3">
        <input value={draft.notes} onChange={(e) => set("notes", e.target.value)} className={inp} placeholder="Optional" />
      </Field>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onDelete && (
            <button onClick={onDelete} disabled={busy} className="text-sm font-medium text-red-600 dark:text-red-400 disabled:opacity-50">Remove</button>
          )}
          {preview != null && (
            <span className="text-sm text-zinc-500 dark:text-zinc-400">Est. {money(preview)}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onCancel} disabled={busy} className="px-3 py-1.5 rounded-lg text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800">Cancel</button>
          <button onClick={() => onSave(draft)} disabled={busy} className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium">
            {busy ? "Saving…" : "Save day"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Live preview only for pay types where a per-day figure is meaningful
 * (hourly / guaranteed minimum). Flat/day rates apply at the gig level. */
function previewGross(pm: PayModel, hours: number, bumps: number, applies: boolean): number | null {
  if (pm.pay_type !== "hourly" && pm.pay_type !== "guaranteedMin") {
    return bumps > 0 ? bumps : null;
  }
  const base = applies
    ? dayGrossEarned({
        payType: pm.pay_type,
        hoursTotal: hours,
        payMinimumAmount: Number(pm.pay_minimum_amount ?? 0),
        payMinimumHours: Number(pm.pay_minimum_hours ?? 0),
        payHourlyRate: Number(pm.pay_hourly_rate ?? 0),
        otStartsAfterHours: Number(pm.ot_starts_after_hours ?? 0),
        otMultiplier: Number(pm.ot_multiplier ?? 1),
        bumps: 0,
      })
    : 0;
  return base + bumps;
}

function numOr0(s: string): number {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">{label}</span>
      {children}
    </label>
  );
}

const inp =
  "w-full px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500";
