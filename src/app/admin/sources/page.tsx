"use client";

import { useEffect, useState, useCallback } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import type { Source } from "@/lib/types";

export default function SourcesPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newType, setNewType] = useState("rss");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [testResult, setTestResult] = useState<{
    id: string;
    status: string;
    detail?: string;
  } | null>(null);
  const [testing, setTesting] = useState<string | null>(null);

  const supabase = createSupabaseBrowser();

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("sources")
      .select("*")
      .order("created_at", { ascending: false });
    setSources(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addSource() {
    if (!newName.trim() || !newUrl.trim()) return;
    setSaving(true);
    await supabase.from("sources").insert({
      name: newName.trim(),
      url: newUrl.trim(),
      type: newType,
      active: true,
    });
    setNewName("");
    setNewUrl("");
    setShowAdd(false);
    setSaving(false);
    load();
  }

  async function toggleActive(source: Source) {
    await supabase
      .from("sources")
      .update({ active: !source.active })
      .eq("id", source.id);
    setSources((prev) =>
      prev.map((s) => (s.id === source.id ? { ...s, active: !s.active } : s))
    );
  }

  async function saveEdit(id: string) {
    await supabase
      .from("sources")
      .update({ name: editName.trim(), url: editUrl.trim() })
      .eq("id", id);
    setEditingId(null);
    load();
  }

  async function testFeed(source: Source) {
    setTesting(source.id);
    setTestResult(null);
    try {
      const res = await fetch(source.url!);
      if (!res.ok) {
        setTestResult({
          id: source.id,
          status: "error",
          detail: `HTTP ${res.status}`,
        });
      } else {
        const text = await res.text();
        const isJson = text.trim().startsWith("{") || text.trim().startsWith("[");
        const isXml = text.trim().startsWith("<");
        if (isJson || isXml) {
          setTestResult({
            id: source.id,
            status: "ok",
            detail: `Feed reachable (${isJson ? "JSON" : "XML"}, ${text.length} chars)`,
          });
        } else {
          setTestResult({
            id: source.id,
            status: "warning",
            detail: "Response doesn't look like a feed",
          });
        }
      }
    } catch (err) {
      setTestResult({
        id: source.id,
        status: "error",
        detail: `Fetch failed: ${err instanceof Error ? err.message : "unknown"}`,
      });
    }
    setTesting(null);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          Sources
        </h2>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          + Add Source
        </button>
      </div>

      {showAdd && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Source Name
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Rose Locke Casting"
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Type
              </label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="rss">RSS Feed</option>
                <option value="email">Email</option>
                <option value="api">API</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Feed URL
            </label>
            <input
              type="url"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://rss.app/feeds/..."
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowAdd(false)}
              className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400"
            >
              Cancel
            </button>
            <button
              onClick={addSource}
              disabled={saving || !newName.trim() || !newUrl.trim()}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
            >
              {saving ? "Adding..." : "Add Source"}
            </button>
          </div>
        </div>
      )}

      {sources.length === 0 ? (
        <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
          No sources configured yet.
        </div>
      ) : (
        <div className="space-y-3">
          {sources.map((source) => (
            <div
              key={source.id}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4"
            >
              {editingId === source.id ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="url"
                    value={editUrl}
                    onChange={(e) => setEditUrl(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-400"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => saveEdit(source.id)}
                      className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        {source.name}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          source.active
                            ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                            : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                        }`}
                      >
                        {source.active ? "active" : "paused"}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                        {source.type}
                      </span>
                    </div>
                    {source.url && (
                      <p className="text-xs text-zinc-400 mt-1 truncate">
                        {source.url}
                      </p>
                    )}
                    <div className="flex gap-4 mt-1 text-xs text-zinc-400">
                      {source.last_polled_at && (
                        <span>
                          Last polled:{" "}
                          {new Date(source.last_polled_at).toLocaleString()}
                        </span>
                      )}
                      {source.last_item_at && (
                        <span>
                          Latest item:{" "}
                          {new Date(source.last_item_at).toLocaleString()}
                        </span>
                      )}
                    </div>
                    {testResult?.id === source.id && (
                      <p
                        className={`text-xs mt-2 ${
                          testResult.status === "ok"
                            ? "text-green-600 dark:text-green-400"
                            : testResult.status === "warning"
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {testResult.detail}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {source.url && (
                      <button
                        onClick={() => testFeed(source)}
                        disabled={testing === source.id}
                        className="px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                      >
                        {testing === source.id ? "Testing..." : "Test"}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setEditingId(source.id);
                        setEditName(source.name);
                        setEditUrl(source.url ?? "");
                      }}
                      className="px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => toggleActive(source)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        source.active
                          ? "text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-900/30"
                          : "text-green-600 dark:text-green-400 border border-green-300 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-900/30"
                      }`}
                    >
                      {source.active ? "Pause" : "Resume"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
