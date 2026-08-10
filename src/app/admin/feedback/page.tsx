"use client";

import { useCallback, useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

type FeedbackRow = {
  id: string;
  created_at: string;
  status: string;
  message: string;
  email: string | null;
  gig_url: string | null;
  user_id: string | null;
  page: string | null;
  user_agent: string | null;
};

const STATUSES = ["new", "reviewed", "actioned", "dismissed"] as const;
type Status = (typeof STATUSES)[number];

const STATUS_STYLE: Record<Status, string> = {
  new: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800",
  reviewed: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800",
  actioned: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-300 dark:border-green-800",
  dismissed: "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700",
};

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function AdminFeedbackPage() {
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | Status>("all");
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const supabase = createSupabaseBrowser();
    const { data, error: err } = await supabase
      .from("feedback")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (err) setError(err.message);
    setRows((data as FeedbackRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function setStatus(id: string, status: Status) {
    setSavingId(id);
    const supabase = createSupabaseBrowser();
    const { error: err } = await supabase.from("feedback").update({ status }).eq("id", id);
    if (!err) {
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    } else {
      setError(err.message);
    }
    setSavingId(null);
  }

  const counts = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});
  const visible = filter === "all" ? rows : rows.filter((r) => r.status === filter);

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Feedback</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Beta feedback and missing-gig reports submitted from the site.
          </p>
        </div>
        <button
          onClick={load}
          className="text-sm px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          Refresh
        </button>
      </div>

      {/* Status filters */}
      <div className="flex gap-1.5 flex-wrap mt-4">
        {(["all", ...STATUSES] as const).map((s) => {
          const n = s === "all" ? rows.length : counts[s] ?? 0;
          const active = filter === s;
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                active
                  ? "bg-blue-600 border-blue-600 text-white"
                  : "border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)} <span className="opacity-70">{n}</span>
            </button>
          );
        })}
      </div>

      {error && (
        <div className="mt-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          {error}
        </div>
      )}

      {loading ? (
        <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
      ) : visible.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400">
          {rows.length === 0 ? "No feedback yet." : "Nothing in this view."}
        </p>
      ) : (
        <div className="mt-5 space-y-3">
          {visible.map((r) => (
            <div
              key={r.id}
              className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap text-xs text-zinc-500 dark:text-zinc-400">
                  <span
                    className={`px-2 py-0.5 rounded-full border font-medium ${STATUS_STYLE[r.status as Status] ?? STATUS_STYLE.new}`}
                  >
                    {r.status}
                  </span>
                  <span>{timeAgo(r.created_at)}</span>
                  {r.user_id && <span className="text-green-600 dark:text-green-400">signed-in user</span>}
                  {r.page && <span>· {r.page}</span>}
                </div>
                <select
                  value={STATUSES.includes(r.status as Status) ? r.status : "new"}
                  onChange={(e) => setStatus(r.id, e.target.value as Status)}
                  disabled={savingId === r.id}
                  className="text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 px-2 py-1 disabled:opacity-50"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <p className="mt-2.5 text-sm text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap break-words">
                {r.message}
              </p>

              <div className="mt-2.5 flex flex-col gap-1 text-xs">
                {r.gig_url && (
                  <a
                    href={r.gig_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 underline break-all"
                  >
                    {r.gig_url}
                  </a>
                )}
                {r.email && (
                  <a href={`mailto:${r.email}`} className="text-blue-600 dark:text-blue-400 underline">
                    {r.email}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
