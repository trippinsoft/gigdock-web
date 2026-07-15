"use client";

import { useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import type { Opportunity } from "@/lib/types";

const FIELDS: {
  key: keyof Opportunity;
  label: string;
  type: "text" | "textarea" | "date";
}[] = [
  { key: "title", label: "Title", type: "text" },
  { key: "summary", label: "Summary", type: "textarea" },
  { key: "location", label: "Location", type: "text" },
  { key: "work_date", label: "Work Date", type: "text" },
  { key: "pay_rate", label: "Pay Rate", type: "text" },
  { key: "pay_bumps", label: "Pay Bumps", type: "text" },
  { key: "requirements", label: "Requirements", type: "textarea" },
  { key: "apply_by", label: "Apply By", type: "date" },
  { key: "application_info", label: "Application Info", type: "textarea" },
  { key: "link", label: "Link", type: "text" },
  { key: "source", label: "Source Company", type: "text" },
  { key: "notes", label: "Notes", type: "textarea" },
];

export default function EditOpportunityModal({
  opportunity,
  onClose,
  onSaved,
}: {
  opportunity: Opportunity;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Record<string, string | null>>(
    Object.fromEntries(FIELDS.map((f) => [f.key, (opportunity[f.key] as string) ?? ""]))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setSaving(true);
    setError("");

    const supabase = createSupabaseBrowser();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const before: Record<string, unknown> = {};
    const after: Record<string, unknown> = {};
    for (const field of FIELDS) {
      const oldVal = (opportunity[field.key] as string) ?? "";
      const newVal = form[field.key] ?? "";
      if (oldVal !== newVal) {
        before[field.key] = oldVal || null;
        after[field.key] = newVal || null;
      }
    }

    if (Object.keys(after).length === 0) {
      onClose();
      return;
    }

    const { error: updateErr } = await supabase
      .from("opportunities")
      .update(after)
      .eq("id", opportunity.id);

    if (updateErr) {
      setError(updateErr.message);
      setSaving(false);
      return;
    }

    await supabase.from("opportunity_edits").insert({
      opportunity_id: opportunity.id,
      edited_by: user?.id,
      before,
      after,
    });

    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-12 px-4 overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl w-full max-w-2xl mb-12">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Edit Opportunity
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {FIELDS.map((field) => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                {field.label}
              </label>
              {field.type === "textarea" ? (
                <textarea
                  rows={3}
                  value={form[field.key] ?? ""}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, [field.key]: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                />
              ) : (
                <input
                  type={field.type}
                  value={form[field.key] ?? ""}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, [field.key]: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>
          ))}
        </div>

        {error && (
          <p className="px-6 text-red-600 dark:text-red-400 text-sm">{error}</p>
        )}

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-zinc-200 dark:border-zinc-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
