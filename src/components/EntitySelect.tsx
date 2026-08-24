"use client";

// A <select> over existing options with an inline "+ Add new…" affordance.
// Creation is delegated to the parent via onCreate (which persists it, appends
// it to the shared options, and returns the new row); this component then
// selects it. Used for production company, payroll company, and project.

import { useState } from "react";

export default function EntitySelect({
  value,
  onChange,
  options,
  onCreate,
  newLabel,
  placeholder = "None",
}: {
  value: string | null;
  onChange: (id: string | null) => void;
  options: { id: string; name: string }[];
  onCreate: (name: string) => Promise<{ id: string } | null>;
  newLabel: string;
  placeholder?: string;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Enter a name.");
      return;
    }
    setBusy(true);
    setError(null);
    const created = await onCreate(trimmed);
    setBusy(false);
    if (!created) {
      setError("Could not create.");
      return;
    }
    onChange(created.id);
    setName("");
    setAdding(false);
  }

  if (adding) {
    return (
      <div>
        <div className="flex items-center gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={newLabel}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                create();
              }
            }}
            className={inp}
          />
          <button
            type="button"
            onClick={create}
            disabled={busy}
            className="shrink-0 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium"
          >
            {busy ? "…" : "Add"}
          </button>
          <button
            type="button"
            onClick={() => {
              setAdding(false);
              setName("");
              setError(null);
            }}
            disabled={busy}
            className="shrink-0 px-2 py-2 rounded-lg text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          >
            Cancel
          </button>
        </div>
        {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    );
  }

  return (
    <select
      value={value ?? ""}
      onChange={(e) => {
        if (e.target.value === "__new__") {
          setAdding(true);
          return;
        }
        onChange(e.target.value || null);
      }}
      className={inp}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>{o.name}</option>
      ))}
      <option value="__new__">+ {newLabel}…</option>
    </select>
  );
}

const inp =
  "w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500";
