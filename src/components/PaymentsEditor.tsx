"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { savePayment, deletePayment, type PaymentFields } from "@/lib/backoffice-actions";
import { PAYMENT_METHODS } from "@/lib/gigVocab";
import { money, shortDate } from "@/lib/format";

export type RawPayment = {
  id: string;
  pay_date: string;
  gross_pay: number | null;
  net_pay: number | null;
  hours_paid: number | null;
  payment_method: string | null;
  notes: string | null;
};

type Draft = {
  id?: string;
  pay_date: string;
  gross_pay: string;
  net_pay: string;
  hours_paid: string;
  payment_method: string;
  notes: string;
};

const todayStr = () => new Date().toISOString().slice(0, 10);

function toDraft(p: RawPayment): Draft {
  return {
    id: p.id,
    pay_date: p.pay_date.slice(0, 10),
    gross_pay: p.gross_pay != null ? String(p.gross_pay) : "",
    net_pay: p.net_pay != null ? String(p.net_pay) : "",
    hours_paid: p.hours_paid != null ? String(p.hours_paid) : "",
    payment_method: p.payment_method ?? "",
    notes: p.notes ?? "",
  };
}

const blank = (): Draft => ({
  pay_date: todayStr(),
  gross_pay: "",
  net_pay: "",
  hours_paid: "",
  payment_method: "",
  notes: "",
});

export default function PaymentsEditor({ gigId, initial }: { gigId: string; initial: RawPayment[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(draft: Draft) {
    setError(null);
    if (!draft.pay_date) {
      setError("Pick a payment date.");
      return;
    }
    setBusy(true);
    const fields: PaymentFields = {
      id: draft.id,
      gig_id: gigId,
      pay_date: draft.pay_date,
      gross_pay: numOrNull(draft.gross_pay),
      net_pay: numOrNull(draft.net_pay),
      hours_paid: numOrNull(draft.hours_paid),
      payment_method: draft.payment_method || null,
      notes: draft.notes.trim() || null,
    };
    const res = await savePayment(fields);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setEditing(null);
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Remove this payment?")) return;
    setBusy(true);
    const res = await deletePayment(id, gigId);
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
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Payments</h2>
        {!editing && (
          <button onClick={() => setEditing(blank())} className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700">
            + Add payment
          </button>
        )}
      </div>

      {error && <p className="mb-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        {initial.length === 0 && !editing && (
          <p className="text-sm text-zinc-400 dark:text-zinc-500 px-4 py-4">No payments yet.</p>
        )}
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {initial.map((p) =>
            editing?.id === p.id ? (
              <PaymentForm key={p.id} draft={editing} setDraft={setEditing} onSave={save} onCancel={() => setEditing(null)} onDelete={() => remove(p.id)} busy={busy} />
            ) : (
              <button key={p.id} onClick={() => setEditing(toDraft(p))} className="w-full text-left flex items-center justify-between gap-4 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                <div className="min-w-0">
                  <div className="font-medium text-zinc-800 dark:text-zinc-200">{shortDate(p.pay_date)}</div>
                  <div className="text-xs text-zinc-400 dark:text-zinc-500">
                    {p.payment_method ?? "Payment"}
                    {p.hours_paid != null && <> · {Number(p.hours_paid)} hrs</>}
                  </div>
                </div>
                <div className="shrink-0 font-medium text-green-600 dark:text-green-400">{money(p.gross_pay)}</div>
              </button>
            )
          )}
        </div>
        {editing && !editing.id && (
          <div className="border-t border-zinc-100 dark:border-zinc-800">
            <PaymentForm draft={editing} setDraft={setEditing} onSave={save} onCancel={() => setEditing(null)} busy={busy} />
          </div>
        )}
      </div>
    </section>
  );
}

function PaymentForm({
  draft,
  setDraft,
  onSave,
  onCancel,
  onDelete,
  busy,
}: {
  draft: Draft;
  setDraft: (d: Draft) => void;
  onSave: (d: Draft) => void;
  onCancel: () => void;
  onDelete?: () => void;
  busy: boolean;
}) {
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft({ ...draft, [k]: v });
  return (
    <div className="px-4 py-4 bg-zinc-50/60 dark:bg-zinc-950/40">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Field label="Paid on">
          <input type="date" value={draft.pay_date} onChange={(e) => set("pay_date", e.target.value)} className={inp} />
        </Field>
        <Field label="Gross ($)">
          <input type="number" step="0.01" value={draft.gross_pay} onChange={(e) => set("gross_pay", e.target.value)} className={inp} />
        </Field>
        <Field label="Net ($)">
          <input type="number" step="0.01" value={draft.net_pay} onChange={(e) => set("net_pay", e.target.value)} className={inp} />
        </Field>
        <Field label="Hours paid">
          <input type="number" step="0.25" value={draft.hours_paid} onChange={(e) => set("hours_paid", e.target.value)} className={inp} />
        </Field>
        <Field label="Method">
          <select value={draft.payment_method} onChange={(e) => set("payment_method", e.target.value)} className={inp}>
            <option value="">—</option>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Notes" className="mt-3">
        <input value={draft.notes} onChange={(e) => set("notes", e.target.value)} className={inp} placeholder="Optional" />
      </Field>
      <div className="mt-3 flex items-center justify-between">
        {onDelete ? (
          <button onClick={onDelete} disabled={busy} className="text-sm font-medium text-red-600 dark:text-red-400 disabled:opacity-50">Remove</button>
        ) : <span />}
        <div className="flex items-center gap-2">
          <button onClick={onCancel} disabled={busy} className="px-3 py-1.5 rounded-lg text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800">Cancel</button>
          <button onClick={() => onSave(draft)} disabled={busy} className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium">
            {busy ? "Saving…" : "Save payment"}
          </button>
        </div>
      </div>
    </div>
  );
}

function numOrNull(s: string): number | null {
  if (s.trim() === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
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
