"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  saveGig,
  deleteGig,
  discardDraftGig,
  createCompany,
  createProject,
  type GigFields,
} from "@/lib/backoffice-actions";
import { GIG_MODES, PAY_TYPES } from "@/lib/gigVocab";
import EntitySelect from "@/components/EntitySelect";
import type { PayType } from "@/lib/pay";
import { track } from "@/lib/analytics";
import { trackProduct } from "@/lib/productEvents";

type Company = { id: string; name: string; kind: string };
type Project = { id: string; title: string };

export type GigEditorInitial = GigFields & { active: boolean };

export default function GigEditor({
  gigId,
  initial,
  companies,
  projects,
}: {
  gigId: string;
  initial: GigEditorInitial;
  companies: Company[];
  projects: Project[];
}) {
  const router = useRouter();
  const isDraft = !initial.active;

  // Companies/projects held in local state so a quick-created one appears in the
  // dropdown and can be selected immediately (no full reload).
  const [companyList, setCompanyList] = useState<Company[]>(companies);
  const [projectList, setProjectList] = useState<Project[]>(projects);
  const prodCompanies = companyList.filter((c) => c.kind === "gig");
  const payrollCompanies = companyList.filter((c) => c.kind === "payroll");

  const [f, setF] = useState<GigEditorInitial>(initial);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedTick, setSavedTick] = useState(false);

  const set = <K extends keyof GigEditorInitial>(k: K, v: GigEditorInitial[K]) =>
    setF((prev) => ({ ...prev, [k]: v }));

  const num = (v: string): number | null => {
    if (v.trim() === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  async function onSave() {
    setError(null);
    if (!f.title.trim()) {
      setError("Give the gig a title before saving.");
      return;
    }
    setSaving(true);
    // Null out pay fields that don't apply to the chosen pay type.
    const cleaned = cleanPayFields(f);
    const wasDraft = isDraft;
    const res = await saveGig(gigId, cleaned);
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    // Funnel: first save from draft → new gig; subsequent saves are edits.
    if (wasDraft) {
      track("gig_created", { gig_id: gigId, pay_type: cleaned.pay_type ?? null });
      trackProduct("gigManagementAction", { gig_id: gigId, action: "gig_created" });
    } else {
      track("gig_updated", { gig_id: gigId });
      trackProduct("gigManagementAction", { gig_id: gigId, action: "gig_updated" });
    }
    setSavedTick(true);
    setTimeout(() => setSavedTick(false), 1800);
    setF((prev) => ({ ...prev, active: true }));
    router.refresh();
  }

  async function onDelete() {
    if (!confirm("Delete this gig? This can't be undone from the web.")) return;
    setDeleting(true);
    const res = await deleteGig(gigId);
    setDeleting(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    track("gig_deleted", { gig_id: gigId });
    trackProduct("gigManagementAction", { gig_id: gigId, action: "gig_deleted" });
    router.push("/gigs");
    router.refresh();
  }

  async function onDiscard() {
    setDeleting(true);
    const res = await discardDraftGig(gigId);
    setDeleting(false);
    if (!res.ok) {
      // If it can't be discarded as a draft (e.g. it now has data), just leave.
      router.push("/gigs");
      return;
    }
    router.push("/gigs");
    router.refresh();
  }

  const pt = f.pay_type;

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Title" className="sm:col-span-2">
          <input
            value={f.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="e.g. Feature film — background"
            className={inputCls}
            autoFocus={isDraft}
          />
        </Field>

        <Field label="Status">
          <select value={f.status_overall} onChange={(e) => set("status_overall", e.target.value)} className={inputCls}>
            {GIG_MODES.map((m) => (
              <option key={m.code} value={m.code}>{m.label}</option>
            ))}
          </select>
        </Field>

        <Field label="Location">
          <input
            value={f.location ?? ""}
            onChange={(e) => set("location", e.target.value || null)}
            placeholder="City / studio"
            className={inputCls}
          />
        </Field>

        <Field label="Production company">
          <EntitySelect
            value={f.gig_company_id}
            onChange={(v) => set("gig_company_id", v)}
            options={prodCompanies.map((c) => ({ id: c.id, name: c.name }))}
            newLabel="New company"
            onCreate={async (name) => {
              const res = await createCompany(name, "gig");
              if (!res.ok || !res.data) return null;
              setCompanyList((prev) => [...prev, res.data!]);
              return res.data;
            }}
          />
        </Field>
        <Field label="Payroll company">
          <EntitySelect
            value={f.payroll_company_id}
            onChange={(v) => set("payroll_company_id", v)}
            options={payrollCompanies.map((c) => ({ id: c.id, name: c.name }))}
            newLabel="New payroll company"
            onCreate={async (name) => {
              const res = await createCompany(name, "payroll");
              if (!res.ok || !res.data) return null;
              setCompanyList((prev) => [...prev, res.data!]);
              return res.data;
            }}
          />
        </Field>

        <Field label="Project" className="sm:col-span-2">
          <EntitySelect
            value={f.project_id}
            onChange={(v) => set("project_id", v)}
            options={projectList.map((p) => ({ id: p.id, name: p.title }))}
            newLabel="New project"
            onCreate={async (title) => {
              const res = await createProject(title);
              if (!res.ok || !res.data) return null;
              setProjectList((prev) => [...prev, res.data!]);
              return { id: res.data.id };
            }}
          />
        </Field>
      </div>

      {/* Pay model */}
      <div className="mt-5 pt-5 border-t border-zinc-100 dark:border-zinc-800">
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">How this gig pays</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Pay type" className="sm:col-span-2">
            <select
              value={pt ?? ""}
              onChange={(e) => set("pay_type", (e.target.value || null) as PayType | null)}
              className={inputCls}
            >
              <option value="">Not set</option>
              {PAY_TYPES.map((p) => (
                <option key={p.code} value={p.code}>{p.label}</option>
              ))}
            </select>
          </Field>

          {pt === "guaranteedMin" && (
            <>
              <Field label="Guaranteed amount ($)">
                <input type="number" step="0.01" value={f.pay_minimum_amount ?? ""} onChange={(e) => set("pay_minimum_amount", num(e.target.value))} className={inputCls} />
              </Field>
              <Field label="Guaranteed hours">
                <input type="number" step="0.25" value={f.pay_minimum_hours ?? ""} onChange={(e) => set("pay_minimum_hours", num(e.target.value))} className={inputCls} />
              </Field>
              <Field label="Overtime multiplier">
                <input type="number" step="0.1" placeholder="1.5" value={f.ot_multiplier ?? ""} onChange={(e) => set("ot_multiplier", num(e.target.value))} className={inputCls} />
              </Field>
              <Field label="Bump rate ($/hr, optional)">
                <input type="number" step="0.01" value={f.bump_rate ?? ""} onChange={(e) => set("bump_rate", num(e.target.value))} className={inputCls} />
              </Field>
            </>
          )}

          {pt === "hourly" && (
            <>
              <Field label="Hourly rate ($)">
                <input type="number" step="0.01" value={f.pay_hourly_rate ?? ""} onChange={(e) => set("pay_hourly_rate", num(e.target.value))} className={inputCls} />
              </Field>
              <Field label="Overtime multiplier">
                <input type="number" step="0.1" placeholder="1.5" value={f.ot_multiplier ?? ""} onChange={(e) => set("ot_multiplier", num(e.target.value))} className={inputCls} />
              </Field>
            </>
          )}

          {(pt === "flatRate" || pt === "dayRate") && (
            <Field label={pt === "dayRate" ? "Day rate ($)" : "Flat amount ($)"}>
              <input type="number" step="0.01" value={f.pay_flat_rate ?? ""} onChange={(e) => set("pay_flat_rate", num(e.target.value))} className={inputCls} />
            </Field>
          )}
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          <input type="checkbox" checked={f.is_unpaid} onChange={(e) => set("is_unpaid", e.target.checked)} className="rounded" />
          This gig is unpaid (exclude from earnings)
        </label>
      </div>

      {/* Notes */}
      <div className="mt-5 pt-5 border-t border-zinc-100 dark:border-zinc-800">
        <Field label="Notes">
          <textarea
            value={f.notes ?? ""}
            onChange={(e) => set("notes", e.target.value || null)}
            rows={3}
            className={inputCls}
            placeholder="Wardrobe, call time, parking…"
          />
        </Field>
      </div>

      {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="mt-5 flex items-center justify-between gap-3">
        <button
          onClick={isDraft ? onDiscard : onDelete}
          disabled={deleting || saving}
          className="text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 disabled:opacity-50"
        >
          {isDraft ? "Discard draft" : deleting ? "Deleting…" : "Delete gig"}
        </button>
        <div className="flex items-center gap-3">
          {savedTick && <span className="text-sm text-green-600 dark:text-green-400">Saved</span>}
          <button
            onClick={onSave}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium"
          >
            {saving ? "Saving…" : isDraft ? "Save gig" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function cleanPayFields(f: GigEditorInitial): GigFields {
  const out: GigFields = { ...f };
  const pt = f.pay_type;
  if (pt !== "guaranteedMin") {
    out.pay_minimum_amount = null;
    out.pay_minimum_hours = null;
  }
  if (pt !== "hourly") out.pay_hourly_rate = null;
  if (pt !== "flatRate" && pt !== "dayRate") out.pay_flat_rate = null;
  if (pt !== "guaranteedMin" && pt !== "hourly") {
    out.ot_multiplier = null;
    out.bump_rate = null;
  }
  return out;
}

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
    <label className={`block ${className}`}>
      <span className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500";
