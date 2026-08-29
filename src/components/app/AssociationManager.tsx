"use client";

// Reusable manager for the user's "associations" — Projects, Gig companies and
// Payroll companies. Mirrors the mobile More → Setup screens: a search box, an
// inline "Add" field, and a deletable list. Writes go through the browser
// Supabase client under the user's session (RLS scopes rows to auth.uid()).

import { useMemo, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

export type AssociationItem = { id: string; label: string };

export default function AssociationManager({
  title,
  subtitle,
  table,
  kind,
  userId,
  initialItems,
  addPlaceholder,
  emptyText,
  noun,
  back,
}: {
  title: string;
  subtitle: string;
  /** "projects" (label column = title) or "companies" (label column = name). */
  table: "projects" | "companies";
  /** For the shared companies table: which kind this manager owns. */
  kind?: "gig" | "payroll";
  userId: string;
  initialItems: AssociationItem[];
  addPlaceholder: string;
  emptyText: string;
  /** Singular noun for confirmation copy, e.g. "project", "gig company". */
  noun: string;
  back?: { href: string; label: string };
}) {
  const supabase = createSupabaseBrowser();
  const labelColumn = table === "projects" ? "title" : "name";

  const [items, setItems] = useState<AssociationItem[]>(initialItems);
  const [query, setQuery] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? items.filter((i) => i.label.toLowerCase().includes(q)) : items;
    return [...list].sort((a, b) => a.label.localeCompare(b.label));
  }, [items, query]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const label = newLabel.trim();
    if (!label || saving) return;
    setSaving(true);
    setError(null);
    const row: Record<string, string> = { [labelColumn]: label, user_id: userId };
    if (table === "companies" && kind) row.kind = kind;
    const { data, error: insErr } = await supabase
      .from(table)
      .insert(row)
      .select("id")
      .single();
    setSaving(false);
    if (insErr || !data) {
      setError("Couldn't add that — please try again.");
      return;
    }
    setItems((prev) => [...prev, { id: data.id as string, label }]);
    setNewLabel("");
  }

  async function remove(id: string) {
    const prev = items;
    setItems((cur) => cur.filter((i) => i.id !== id));
    setPendingDelete(null);
    const { error: delErr } = await supabase.from(table).delete().eq("id", id);
    if (delErr) {
      setError("Couldn't delete that — please try again.");
      setItems(prev); // roll back
    }
  }

  return (
    <div className="max-w-3xl">
      <header className="mb-5">
        {back && (
          <Link href={back.href} className="inline-flex items-center gap-1 mb-2 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
            {back.label}
          </Link>
        )}
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{title}</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>
      </header>

      {/* Add */}
      <form onSubmit={add} className="flex gap-2 mb-3">
        <input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder={addPlaceholder}
          className="flex-1 h-10 px-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={!newLabel.trim() || saving}
          className="shrink-0 h-10 px-4 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white transition-colors"
        >
          {saving ? "Adding…" : "Add"}
        </button>
      </form>

      {/* Search (only worth showing once the list is non-trivial) */}
      {items.length > 6 && (
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search…"
          className="w-full h-10 px-3 mb-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      )}

      {error && (
        <div className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</div>
      )}

      {/* List */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        {visible.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
            {query ? "No matches." : emptyText}
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {visible.map((it) => (
              <li key={it.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="min-w-0 truncate text-sm text-zinc-800 dark:text-zinc-200">{it.label}</span>
                {pendingDelete === it.id ? (
                  <span className="shrink-0 flex items-center gap-2">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">Delete {noun}?</span>
                    <button
                      onClick={() => remove(it.id)}
                      className="text-xs font-semibold px-2 py-1 rounded-md bg-red-600 hover:bg-red-700 text-white"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setPendingDelete(null)}
                      className="text-xs font-medium px-2 py-1 rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      Cancel
                    </button>
                  </span>
                ) : (
                  <button
                    onClick={() => setPendingDelete(it.id)}
                    aria-label={`Delete ${it.label}`}
                    className="shrink-0 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                      <path d="M10 11v6M14 11v6" />
                    </svg>
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {visible.length > 0 && (
        <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
          {items.length} {items.length === 1 ? noun : `${noun}s`}
        </p>
      )}
    </div>
  );
}
