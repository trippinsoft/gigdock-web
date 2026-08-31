"use client";

// Connected assistants — mint / revoke GigDock MCP access tokens.
// A token lets an MCP client (Claude, ChatGPT Developer Mode, Cursor, …) read
// this user's gigs, earnings and outstanding payments through the `mcp` Edge
// Function. Plaintext is shown ONCE at creation; only a hash is stored.

import { useCallback, useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

// Served by a next.config rewrite that proxies to the Supabase Edge Function.
export const MCP_ENDPOINT = "https://www.gigdock.co/mcp";

type TokenRow = {
  id: string;
  name: string;
  token_prefix: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

function shortDate(iso: string | null): string {
  if (!iso) return "never";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function McpTokens() {
  const supabase = createSupabaseBrowser();
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [fresh, setFresh] = useState<{ token: string; name: string } | null>(null);
  const [copied, setCopied] = useState<"token" | "url" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("mcp_tokens")
      .select("id, name, token_prefix, created_at, last_used_at, revoked_at")
      .is("revoked_at", null)
      .order("created_at", { ascending: false });
    setTokens((data ?? []) as TokenRow[]);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(); }, [load]);

  async function createToken() {
    setCreating(true);
    setError(null);
    const { data, error: err } = await supabase.rpc("mcp_create_token", {
      p_name: name.trim() || "Assistant",
    });
    setCreating(false);
    if (err) { setError(err.message); return; }
    const row = Array.isArray(data) ? data[0] : data;
    if (row?.token) {
      setFresh({ token: row.token as string, name: name.trim() || "Assistant" });
      setName("");
      load();
    }
  }

  async function revoke(id: string) {
    await supabase.rpc("mcp_revoke_token", { p_id: id });
    load();
  }

  async function copy(text: string, which: "token" | "url") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 1500);
    } catch { /* clipboard unavailable; user can select manually */ }
  }

  return (
    <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
      <div className="px-4 py-3">
        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
          Connect GigDock to an AI assistant (Claude, ChatGPT, Cursor) so you can ask things like
          {" "}<em>&ldquo;how much did I make last month?&rdquo;</em> Tokens are <strong>read-only</strong>:
          earnings, gigs and outstanding payments. Revoke one any time.
        </p>
        <div className="mt-3 flex items-center gap-2 text-xs">
          <span className="shrink-0 text-zinc-500 dark:text-zinc-400">Server URL</span>
          <code className="min-w-0 truncate rounded bg-zinc-100 dark:bg-zinc-800 px-2 py-1 text-zinc-800 dark:text-zinc-200">{MCP_ENDPOINT}</code>
          <button type="button" onClick={() => copy(MCP_ENDPOINT, "url")}
            className="shrink-0 font-medium text-blue-600 dark:text-blue-400 hover:underline">
            {copied === "url" ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      {fresh && (
        <div className="px-4 py-3 bg-green-50 dark:bg-green-950/30">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Token for &ldquo;{fresh.name}&rdquo; created — copy it now, it won&rsquo;t be shown again.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded bg-white dark:bg-zinc-900 border border-green-200 dark:border-green-900 px-2 py-1.5 text-xs text-zinc-800 dark:text-zinc-200">{fresh.token}</code>
            <button type="button" onClick={() => copy(fresh.token, "token")}
              className="shrink-0 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-1.5">
              {copied === "token" ? "Copied ✓" : "Copy token"}
            </button>
          </div>
          <button type="button" onClick={() => setFresh(null)}
            className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 hover:underline">
            Done — hide this
          </button>
        </div>
      )}

      <div className="px-4 py-3">
        {loading ? (
          <p className="text-sm text-zinc-400 dark:text-zinc-500">Loading…</p>
        ) : tokens.length === 0 ? (
          <p className="text-sm text-zinc-400 dark:text-zinc-500">No active tokens.</p>
        ) : (
          <ul className="space-y-2">
            {tokens.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{t.name}</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    <code>{t.token_prefix}…</code> · created {shortDate(t.created_at)} · last used {shortDate(t.last_used_at)}
                  </div>
                </div>
                <button type="button" onClick={() => revoke(t.id)}
                  className="shrink-0 text-sm font-medium text-red-600 dark:text-red-400 hover:underline">
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="px-4 py-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name (e.g. Claude, ChatGPT)"
            maxLength={60}
            className="min-w-0 flex-1 h-9 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={createToken}
            disabled={creating}
            className="shrink-0 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold px-3 py-2"
          >
            {creating ? "Creating…" : "Create token"}
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
        <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
          In Claude: Settings → Connectors → Add custom connector, paste the server URL, choose Bearer token.
          In ChatGPT: Settings → enable Developer Mode → add connector → Authentication: Token.
        </p>
      </div>
    </div>
  );
}
