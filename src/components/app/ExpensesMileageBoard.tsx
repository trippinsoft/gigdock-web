"use client";

// Inline expand-in-place editor for Expenses and Mileage. Same interaction
// idiom as PaymentsEditor: each row toggles into an edit form on click, and a
// top-right "+ Add …" button opens a blank form at the bottom of the list.
//
// This component owns the two side-by-side (stacked on mobile) sections. The
// parent server page provides the raw rows and the resolved rate table; every
// derived number (totals, net, potential deduction) is computed here via the
// shared `summarizeWorkFinancials` so mobile and web stay lockstep.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  saveWorkExpense,
  deleteWorkExpense,
  saveWorkMileage,
  deleteWorkMileage,
  type WorkExpenseFields,
  type WorkMileageFields,
} from "@/lib/backoffice-actions";
import {
  EXPENSE_CATEGORIES,
  categoryLabel,
  money,
  milesLabel,
  summarizeWorkFinancials,
  potentialMileageDeduction,
  type BusinessMileageRate,
} from "@/lib/workFinancials";
import type { WorkExpense, WorkMileage } from "@/lib/backoffice-types";
import { track } from "@/lib/analytics";
import { trackPro } from "@/lib/monetization";
import { shortDate } from "@/lib/format";

const todayStr = () => new Date().toISOString().slice(0, 10);

type GigOption = { id: string; title: string };
type ReceiptOption = {
  id: string;
  display_name: string;
  gig_id: string | null;
};

type ExpenseDraft = {
  id?: string;
  gig_id: string | null;
  receipt_document_id: string | null;
  amount: string;
  category_key: string;
  expense_date: string;
  merchant: string;
  notes: string;
};

type MileageDraft = {
  id?: string;
  gig_id: string | null;
  miles: string;
  trip_date: string;
  purpose: string;
  start_location: string;
  end_location: string;
  notes: string;
};

function toExpenseDraft(e: WorkExpense): ExpenseDraft {
  return {
    id: e.id,
    gig_id: e.gig_id,
    receipt_document_id: e.receipt_document_id,
    amount: String(e.amount),
    category_key: e.category_key,
    expense_date: e.expense_date.slice(0, 10),
    merchant: e.merchant ?? "",
    notes: e.notes ?? "",
  };
}

function toMileageDraft(m: WorkMileage): MileageDraft {
  return {
    id: m.id,
    gig_id: m.gig_id,
    miles: String(m.miles),
    trip_date: m.trip_date.slice(0, 10),
    purpose: m.purpose ?? "",
    start_location: m.start_location ?? "",
    end_location: m.end_location ?? "",
    notes: m.notes ?? "",
  };
}

const blankExpense = (gigId: string | null): ExpenseDraft => ({
  gig_id: gigId,
  receipt_document_id: null,
  amount: "",
  category_key: "other",
  expense_date: todayStr(),
  merchant: "",
  notes: "",
});

const blankMileage = (gigId: string | null): MileageDraft => ({
  gig_id: gigId,
  miles: "",
  trip_date: todayStr(),
  purpose: "",
  start_location: "",
  end_location: "",
  notes: "",
});

export default function ExpensesMileageBoard({
  expenses,
  mileage,
  rates,
  gigs,
  receipts,
  scopedGigId,
  scopedGigTitle,
  scopedGross,
  periodLabel,
}: {
  expenses: WorkExpense[];
  mileage: WorkMileage[];
  rates: BusinessMileageRate[];
  gigs: GigOption[];
  receipts: ReceiptOption[];
  scopedGigId: string | null;
  scopedGigTitle: string | null;
  scopedGross: number | null;
  periodLabel: string;
}) {
  const router = useRouter();
  const summary = useMemo(
    () =>
      summarizeWorkFinancials(
        expenses,
        mileage,
        rates,
        scopedGigId ? scopedGross : null,
      ),
    [expenses, mileage, rates, scopedGigId, scopedGross],
  );

  return (
    <div className="space-y-6">
      <TotalsHeader
        summary={summary}
        periodLabel={periodLabel}
        scopedGigTitle={scopedGigTitle}
        scopedGross={scopedGross}
      />
      <ExpensesSection
        expenses={expenses}
        gigs={gigs}
        receipts={receipts}
        scopedGigId={scopedGigId}
        onChanged={() => router.refresh()}
      />
      <MileageSection
        mileage={mileage}
        gigs={gigs}
        rates={rates}
        scopedGigId={scopedGigId}
        onChanged={() => router.refresh()}
      />
    </div>
  );
}

function TotalsHeader({
  summary,
  periodLabel,
  scopedGigTitle,
  scopedGross,
}: {
  summary: ReturnType<typeof summarizeWorkFinancials>;
  periodLabel: string;
  scopedGigTitle: string | null;
  scopedGross: number | null;
}) {
  const showNet = summary.netBeforeTaxes !== null;
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
            {scopedGigTitle ? `Scoped to ${scopedGigTitle}` : periodLabel}
          </div>
          <h1 className="mt-0.5 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Expenses &amp; Mileage
          </h1>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        <Tile
          label="Expenses"
          value={money(summary.actualExpenses)}
          tone="default"
        />
        <Tile
          label="Business mileage"
          value={milesLabel(summary.businessMiles)}
          tone="default"
        />
        <Tile
          label="Potential mileage deduction"
          value={
            summary.potentialDeduction === null
              ? "Rate unavailable"
              : money(summary.potentialDeduction)
          }
          hint="Miles × applicable IRS rate"
          tone="default"
        />
        {showNet ? (
          <Tile
            label="Net earnings"
            value={money(summary.netBeforeTaxes ?? 0)}
            hint={
              scopedGross !== null
                ? `${money(scopedGross)} gross − ${money(summary.actualExpenses)} expenses`
                : undefined
            }
            tone="blue"
          />
        ) : (
          <Tile label="Net earnings" value="—" hint="Scope to a gig to see net" tone="muted" />
        )}
      </div>
      <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
        Net earnings = gross earnings − actual expenses. Business mileage is
        recorded separately and never reduces net earnings; the potential
        mileage deduction is tax-oriented information for Tax Ready.
      </p>
    </div>
  );
}

function Tile({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone: "default" | "blue" | "muted";
}) {
  const valueColor =
    tone === "blue"
      ? "text-blue-600 dark:text-blue-400"
      : tone === "muted"
        ? "text-zinc-400 dark:text-zinc-500"
        : "text-zinc-900 dark:text-zinc-100";
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-extrabold ${valueColor} tabular-nums`}>
        {value}
      </div>
      {hint && (
        <div className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">
          {hint}
        </div>
      )}
    </div>
  );
}

/* ── Expenses ────────────────────────────────────────────────────────────── */

function ExpensesSection({
  expenses,
  gigs,
  receipts,
  scopedGigId,
  onChanged,
}: {
  expenses: WorkExpense[];
  gigs: GigOption[];
  receipts: ReceiptOption[];
  scopedGigId: string | null;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState<ExpenseDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(draft: ExpenseDraft) {
    setError(null);
    const amount = Number(draft.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter an expense amount greater than $0.");
      return;
    }
    setBusy(true);
    const fields: WorkExpenseFields = {
      id: draft.id,
      gig_id: draft.gig_id,
      receipt_document_id: draft.receipt_document_id,
      amount,
      category_key: draft.category_key,
      expense_date: draft.expense_date,
      merchant: draft.merchant.trim() || null,
      notes: draft.notes.trim() || null,
    };
    const isEdit = Boolean(draft.id);
    const res = await saveWorkExpense(fields);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    track(isEdit ? "expense_updated" : "expense_added", {
      gig_id: fields.gig_id,
      category: fields.category_key,
    });
    if (!isEdit) trackPro("pro_feature_impression", "expense_tracking");
    setEditing(null);
    onChanged();
  }

  async function remove(id: string) {
    if (!confirm("Remove this expense? The receipt is not deleted.")) return;
    setBusy(true);
    const res = await deleteWorkExpense(id);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    track("expense_deleted", { expense_id: id });
    setEditing(null);
    onChanged();
  }

  return (
    <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Expenses</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            {expenses.length} {expenses.length === 1 ? "record" : "records"}
          </p>
        </div>
        {!editing && (
          <button
            onClick={() => setEditing(blankExpense(scopedGigId))}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-sm font-semibold text-white"
          >
            + Add expense
          </button>
        )}
      </div>

      {error && (
        <p className="px-5 pt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {expenses.length === 0 && !editing && (
          <p className="px-5 py-6 text-sm text-zinc-400 dark:text-zinc-500">
            No expenses yet. Add one when you have a business cost to track.
          </p>
        )}
        {expenses.map((e) =>
          editing?.id === e.id ? (
            <ExpenseForm
              key={e.id}
              draft={editing}
              setDraft={setEditing}
              onSave={save}
              onCancel={() => setEditing(null)}
              onDelete={() => remove(e.id)}
              busy={busy}
              gigs={gigs}
              receipts={receipts}
              scopedGigId={scopedGigId}
            />
          ) : (
            <button
              key={e.id}
              onClick={() => setEditing(toExpenseDraft(e))}
              className="w-full text-left flex items-center justify-between gap-4 px-5 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
            >
              <div className="min-w-0">
                <div className="font-medium text-zinc-800 dark:text-zinc-200 truncate">
                  {e.merchant || categoryLabel(e.category_key)}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {shortDate(e.expense_date)} · {categoryLabel(e.category_key)}
                  {e.receipt_document_id ? " · Receipt attached" : ""}
                  {e.gig_id ? "" : " · General business"}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
                  {money(e.amount)}
                </div>
              </div>
            </button>
          ),
        )}
        {editing && !editing.id && (
          <div className="border-t border-zinc-100 dark:border-zinc-800">
            <ExpenseForm
              draft={editing}
              setDraft={setEditing}
              onSave={save}
              onCancel={() => setEditing(null)}
              busy={busy}
              gigs={gigs}
              receipts={receipts}
              scopedGigId={scopedGigId}
            />
          </div>
        )}
      </div>
    </section>
  );
}

function ExpenseForm({
  draft,
  setDraft,
  onSave,
  onCancel,
  onDelete,
  busy,
  gigs,
  receipts,
  scopedGigId,
}: {
  draft: ExpenseDraft;
  setDraft: (d: ExpenseDraft) => void;
  onSave: (d: ExpenseDraft) => void;
  onCancel: () => void;
  onDelete?: () => void;
  busy: boolean;
  gigs: GigOption[];
  receipts: ReceiptOption[];
  scopedGigId: string | null;
}) {
  const set = <K extends keyof ExpenseDraft>(k: K, v: ExpenseDraft[K]) =>
    setDraft({ ...draft, [k]: v });

  // Eligible receipts: same Gig association as the expense, OR both general.
  const eligibleReceipts = receipts.filter((r) =>
    draft.gig_id ? r.gig_id === draft.gig_id : r.gig_id === null,
  );

  return (
    <div className="px-5 py-4 bg-zinc-50/60 dark:bg-zinc-950/40">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Field label="Date">
          <input
            type="date"
            value={draft.expense_date}
            onChange={(e) => set("expense_date", e.target.value)}
            className={inp}
          />
        </Field>
        <Field label="Amount ($)">
          <input
            type="number"
            step="0.01"
            min="0"
            value={draft.amount}
            onChange={(e) => set("amount", e.target.value)}
            className={inp}
          />
        </Field>
        <Field label="Category">
          <select
            value={draft.category_key}
            onChange={(e) => set("category_key", e.target.value)}
            className={inp}
          >
            {EXPENSE_CATEGORIES.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Gig association">
          {scopedGigId ? (
            <input value="Scoped to this gig" readOnly className={inp + " text-zinc-500"} />
          ) : (
            <select
              value={draft.gig_id ?? ""}
              onChange={(e) => set("gig_id", e.target.value || null)}
              className={inp}
            >
              <option value="">General business</option>
              {gigs.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title || "Untitled gig"}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Merchant" className="sm:col-span-2">
          <input
            value={draft.merchant}
            onChange={(e) => set("merchant", e.target.value)}
            className={inp}
            placeholder="Optional"
          />
        </Field>
        <Field label="Receipt" className="sm:col-span-2">
          <div className="flex items-center gap-2">
            <select
              value={draft.receipt_document_id ?? ""}
              onChange={(e) => set("receipt_document_id", e.target.value || null)}
              className={inp}
            >
              <option value="">No receipt</option>
              {eligibleReceipts.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.display_name}
                </option>
              ))}
            </select>
            <Link
              href={`/documents`}
              className="shrink-0 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
              title="Upload a new receipt in Documents"
            >
              Add new →
            </Link>
          </div>
        </Field>
        <Field label="Notes" className="sm:col-span-4">
          <textarea
            value={draft.notes}
            onChange={(e) => set("notes", e.target.value)}
            className={inp + " min-h-[72px]"}
            placeholder="Optional"
          />
        </Field>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button
          disabled={busy}
          onClick={() => onSave(draft)}
          className="inline-flex items-center rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 px-3.5 py-2 text-sm font-semibold text-white"
        >
          {draft.id ? "Save changes" : "Add expense"}
        </button>
        <button
          disabled={busy}
          onClick={onCancel}
          className="inline-flex items-center rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3.5 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-200"
        >
          Cancel
        </button>
        {onDelete && (
          <button
            disabled={busy}
            onClick={onDelete}
            className="ml-auto inline-flex items-center rounded-lg border border-red-200 dark:border-red-800/60 bg-white dark:bg-zinc-900 px-3.5 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Mileage ─────────────────────────────────────────────────────────────── */

function MileageSection({
  mileage,
  gigs,
  rates,
  scopedGigId,
  onChanged,
}: {
  mileage: WorkMileage[];
  gigs: GigOption[];
  rates: BusinessMileageRate[];
  scopedGigId: string | null;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState<MileageDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(draft: MileageDraft) {
    setError(null);
    const miles = Number(draft.miles);
    if (!Number.isFinite(miles) || miles <= 0) {
      setError("Enter miles greater than 0.");
      return;
    }
    setBusy(true);
    const fields: WorkMileageFields = {
      id: draft.id,
      gig_id: draft.gig_id,
      miles,
      trip_date: draft.trip_date,
      purpose: draft.purpose.trim(),
      start_location: draft.start_location.trim() || null,
      end_location: draft.end_location.trim() || null,
      notes: draft.notes.trim() || null,
    };
    const isEdit = Boolean(draft.id);
    const res = await saveWorkMileage(fields);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    track(isEdit ? "mileage_updated" : "mileage_added", {
      gig_id: fields.gig_id,
    });
    setEditing(null);
    onChanged();
  }

  async function remove(id: string) {
    if (!confirm("Remove this mileage record?")) return;
    setBusy(true);
    const res = await deleteWorkMileage(id);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    track("mileage_deleted", { mileage_id: id });
    setEditing(null);
    onChanged();
  }

  return (
    <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Mileage</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            {mileage.length} {mileage.length === 1 ? "trip" : "trips"}
          </p>
        </div>
        {!editing && (
          <button
            onClick={() => setEditing(blankMileage(scopedGigId))}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-sm font-semibold text-white"
          >
            + Add mileage
          </button>
        )}
      </div>

      {error && (
        <p className="px-5 pt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {mileage.length === 0 && !editing && (
          <p className="px-5 py-6 text-sm text-zinc-400 dark:text-zinc-500">
            No mileage recorded. Add a trip when you drive for business.
          </p>
        )}
        {mileage.map((m) => {
          const deduction = potentialMileageDeduction(m.miles, m.trip_date, rates);
          return editing?.id === m.id ? (
            <MileageForm
              key={m.id}
              draft={editing}
              setDraft={setEditing}
              onSave={save}
              onCancel={() => setEditing(null)}
              onDelete={() => remove(m.id)}
              busy={busy}
              gigs={gigs}
              scopedGigId={scopedGigId}
            />
          ) : (
            <button
              key={m.id}
              onClick={() => setEditing(toMileageDraft(m))}
              className="w-full text-left flex items-center justify-between gap-4 px-5 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
            >
              <div className="min-w-0">
                <div className="font-medium text-zinc-800 dark:text-zinc-200 truncate">
                  {m.purpose}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                  {shortDate(m.trip_date)}
                  {m.gig_id ? "" : " · General business"}
                  {m.start_location || m.end_location
                    ? ` · ${[m.start_location, m.end_location].filter(Boolean).join(" → ")}`
                    : ""}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
                  {milesLabel(m.miles)}
                </div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  {deduction === null ? "Rate unavailable" : `${money(deduction)} deduction`}
                </div>
              </div>
            </button>
          );
        })}
        {editing && !editing.id && (
          <div className="border-t border-zinc-100 dark:border-zinc-800">
            <MileageForm
              draft={editing}
              setDraft={setEditing}
              onSave={save}
              onCancel={() => setEditing(null)}
              busy={busy}
              gigs={gigs}
              scopedGigId={scopedGigId}
            />
          </div>
        )}
      </div>
    </section>
  );
}

function MileageForm({
  draft,
  setDraft,
  onSave,
  onCancel,
  onDelete,
  busy,
  gigs,
  scopedGigId,
}: {
  draft: MileageDraft;
  setDraft: (d: MileageDraft) => void;
  onSave: (d: MileageDraft) => void;
  onCancel: () => void;
  onDelete?: () => void;
  busy: boolean;
  gigs: GigOption[];
  scopedGigId: string | null;
}) {
  const set = <K extends keyof MileageDraft>(k: K, v: MileageDraft[K]) =>
    setDraft({ ...draft, [k]: v });
  return (
    <div className="px-5 py-4 bg-zinc-50/60 dark:bg-zinc-950/40">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Field label="Trip date">
          <input
            type="date"
            value={draft.trip_date}
            onChange={(e) => set("trip_date", e.target.value)}
            className={inp}
          />
        </Field>
        <Field label="Miles">
          <input
            type="number"
            step="0.1"
            min="0"
            value={draft.miles}
            onChange={(e) => set("miles", e.target.value)}
            className={inp}
          />
        </Field>
        <Field label="Purpose" className="sm:col-span-2">
          <input
            value={draft.purpose}
            onChange={(e) => set("purpose", e.target.value)}
            className={inp}
            placeholder="e.g. Drive to set"
          />
        </Field>
        <Field label="Gig association" className="sm:col-span-2">
          {scopedGigId ? (
            <input value="Scoped to this gig" readOnly className={inp + " text-zinc-500"} />
          ) : (
            <select
              value={draft.gig_id ?? ""}
              onChange={(e) => set("gig_id", e.target.value || null)}
              className={inp}
            >
              <option value="">General business</option>
              {gigs.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title || "Untitled gig"}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Start location">
          <input
            value={draft.start_location}
            onChange={(e) => set("start_location", e.target.value)}
            className={inp}
            placeholder="Optional"
          />
        </Field>
        <Field label="End location">
          <input
            value={draft.end_location}
            onChange={(e) => set("end_location", e.target.value)}
            className={inp}
            placeholder="Optional"
          />
        </Field>
        <Field label="Notes" className="sm:col-span-4">
          <textarea
            value={draft.notes}
            onChange={(e) => set("notes", e.target.value)}
            className={inp + " min-h-[72px]"}
            placeholder="Optional"
          />
        </Field>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button
          disabled={busy}
          onClick={() => onSave(draft)}
          className="inline-flex items-center rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 px-3.5 py-2 text-sm font-semibold text-white"
        >
          {draft.id ? "Save changes" : "Add mileage"}
        </button>
        <button
          disabled={busy}
          onClick={onCancel}
          className="inline-flex items-center rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3.5 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-200"
        >
          Cancel
        </button>
        {onDelete && (
          <button
            disabled={busy}
            onClick={onDelete}
            className="ml-auto inline-flex items-center rounded-lg border border-red-200 dark:border-red-800/60 bg-white dark:bg-zinc-900 px-3.5 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

/* ── shared field primitives (same shape as PaymentsEditor) ─────────────── */

const inp =
  "w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-1.5 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500";

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </span>
      {children}
    </label>
  );
}
