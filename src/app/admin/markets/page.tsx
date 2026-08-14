"use client";

import { useCallback, useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import type { Market } from "@/lib/types";
import { stateName } from "@/lib/markets";

// Admin-managed "markets we serve" list. Editing here updates the GigFit profile
// Regions picker (and any other reader) live — no website redeploy needed.
export default function AdminMarketsPage() {
  const supabase = createSupabaseBrowser();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data, error: err } = await supabase
      .from("markets")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (err) setError(err.message);
    setMarkets((data as Market[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addMarket(e: React.FormEvent) {
    e.preventDefault();
    const code = newCode.trim().toUpperCase();
    if (!code) return;
    const name = newName.trim() || stateName(code) || code;
    setBusy("new");
    const nextOrder = (markets.reduce((m, x) => Math.max(m, x.sort_order), 0) || 0) + 1;
    const { error: err } = await supabase
      .from("markets")
      .upsert({ code, name, active: true, sort_order: nextOrder }, { onConflict: "code" });
    if (err) setError(err.message);
    setNewCode("");
    setNewName("");
    setBusy(null);
    load();
  }

  async function patch(code: string, fields: Partial<Market>) {
    setBusy(code);
    setMarkets((prev) => prev.map((m) => (m.code === code ? { ...m, ...fields } : m)));
    const { error: err } = await supabase.from("markets").update(fields).eq("code", code);
    if (err) { setError(err.message); load(); }
    setBusy(null);
  }

  async function remove(code: string) {
    setBusy(code);
    const { error: err } = await supabase.from("markets").delete().eq("code", code);
    if (err) setError(err.message);
    setMarkets((prev) => prev.filter((m) => m.code !== code));
    setBusy(null);
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Markets we serve</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Drives the GigFit profile Regions picker live — no redeploy needed. Lower sort numbers
            appear first; only <span className="font-medium">active</span> markets are shown to users.
          </p>
        </div>
        <button
          onClick={load}
          className="text-sm px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          Refresh
        </button>
      </div>

      {/* Add a market */}
      <form onSubmit={addMarket} className="mt-5 flex flex-wrap items-end gap-2">
        <div>
          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Code</label>
          <input
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
            placeholder="GA"
            maxLength={3}
            className="w-20 uppercase px-2.5 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
            Name <span className="font-normal">(auto-fills from code if blank)</span>
          </label>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={newCode ? stateName(newCode.trim().toUpperCase()) || "Market name" : "Market name"}
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          type="submit"
          disabled={busy === "new" || !newCode.trim()}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium"
        >
          Add market
        </button>
      </form>

      {error && (
        <div className="mt-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          {error}
        </div>
      )}

      {loading ? (
        <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
      ) : markets.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400">
          No markets yet. Run <code>sql/markets.sql</code> to seed the table, or add one above.
        </p>
      ) : (
        <div className="mt-5 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          {markets.map((m) => (
            <div
              key={m.code}
              className="flex items-center gap-3 px-3 py-2.5 border-b last:border-b-0 border-zinc-100 dark:border-zinc-800"
            >
              <input
                type="number"
                value={m.sort_order}
                onChange={(e) => patch(m.code, { sort_order: Number(e.target.value) })}
                className="w-14 px-2 py-1 border border-zinc-200 dark:border-zinc-700 rounded bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 text-sm"
                title="Sort order"
              />
              <span className="w-10 font-mono text-sm text-zinc-500 dark:text-zinc-400">{m.code}</span>
              <span className="flex-1 text-sm text-zinc-900 dark:text-zinc-100 truncate">{m.name}</span>
              <button
                onClick={() => patch(m.code, { active: !m.active })}
                disabled={busy === m.code}
                className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
                  m.active
                    ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-300 dark:border-green-800"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700"
                }`}
              >
                {m.active ? "Active" : "Hidden"}
              </button>
              <button
                onClick={() => remove(m.code)}
                disabled={busy === m.code}
                className="text-zinc-400 hover:text-red-600 dark:hover:text-red-400 text-lg leading-none px-1"
                title="Delete market"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
