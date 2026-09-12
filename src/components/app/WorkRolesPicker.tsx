"use client";

// Reusable Work Roles multi-select. Renders the public.work_roles_catalog
// rows grouped by category (performing / crew / other), tracks selection
// as a Set of role_keys, and reveals a bounded free-text field when the
// user selects the catalog row keyed 'other'. This component is purely
// controlled — the parent owns the persisted state and the "Save" action.

import { useMemo } from "react";
import type { WorkRoleCatalogRow, WorkRoleCategory } from "@/lib/workRoles";

const CATEGORY_ORDER: WorkRoleCategory[] = ["performing", "crew", "other"];
const CATEGORY_LABELS: Record<WorkRoleCategory, string> = {
  performing: "Performing",
  crew: "Production & Crew",
  other: "Other",
};

const OTHER_MAX = 60;

export interface WorkRolesPickerProps {
  catalog: WorkRoleCatalogRow[];
  selected: Set<string>;
  onToggle: (roleKey: string) => void;
  otherDetail: string;
  onOtherDetailChange: (value: string) => void;
}

export default function WorkRolesPicker({
  catalog,
  selected,
  onToggle,
  otherDetail,
  onOtherDetailChange,
}: WorkRolesPickerProps) {
  const groups = useMemo(() => {
    const byCategory = new Map<WorkRoleCategory, WorkRoleCatalogRow[]>();
    for (const c of CATEGORY_ORDER) byCategory.set(c, []);
    for (const row of catalog) {
      const bucket = byCategory.get(row.category as WorkRoleCategory);
      if (bucket) bucket.push(row);
    }
    for (const rows of byCategory.values()) rows.sort((a, b) => a.sort_order - b.sort_order);
    return byCategory;
  }, [catalog]);

  const otherSelected = selected.has("other");

  return (
    <div className="space-y-6">
      {CATEGORY_ORDER.map((cat) => {
        const rows = groups.get(cat) ?? [];
        if (rows.length === 0) return null;
        return (
          <div key={cat}>
            <div className="text-xs font-bold uppercase tracking-[0.14em] text-blue-600 dark:text-blue-400">
              {CATEGORY_LABELS[cat]}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {rows.map((row) => (
                <Chip
                  key={row.role_key}
                  selected={selected.has(row.role_key)}
                  onClick={() => onToggle(row.role_key)}
                >
                  {row.label}
                </Chip>
              ))}
            </div>
          </div>
        );
      })}

      {otherSelected && (
        <label className="block">
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
            Other — tell us what
          </span>
          <input
            type="text"
            value={otherDetail}
            maxLength={OTHER_MAX}
            placeholder="e.g. Set Decorator"
            onChange={(e) => onOtherDetailChange(e.target.value)}
            className="mt-1 w-full h-10 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="mt-1 block text-[11px] text-zinc-500 dark:text-zinc-400">
            Optional · up to {OTHER_MAX} characters
          </span>
        </label>
      )}
    </div>
  );
}

function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`inline-flex items-center rounded-full px-3.5 py-1.5 text-sm font-medium border transition-colors ${
        selected
          ? "bg-blue-600 border-blue-600 text-white"
          : "bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:border-zinc-400 dark:hover:border-zinc-500"
      }`}
    >
      {children}
    </button>
  );
}
