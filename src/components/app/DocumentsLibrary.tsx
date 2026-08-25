"use client";

// Cross-gig document library: search + document-type filters, each row showing
// its gig context with an easy path into the full gig. Files open via
// short-lived signed URLs. Upload/preview can be layered on later.

import Link from "next/link";
import { useMemo, useState } from "react";
import type { DocumentRow } from "@/lib/backoffice-types";
import { shortDate } from "@/lib/format";

type Doc = DocumentRow & { gig: { title: string } | null; url?: string };

function bytes(n: number): string {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
function typeLabel(t: string): string {
  return t.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function DocumentsLibrary({ docs }: { docs: Doc[] }) {
  const [q, setQ] = useState("");
  const [type, setType] = useState<string | null>(null);

  const types = useMemo(() => {
    const set = new Map<string, number>();
    for (const d of docs) set.set(d.document_type, (set.get(d.document_type) ?? 0) + 1);
    return [...set.entries()].sort((a, b) => b[1] - a[1]);
  }, [docs]);

  const visible = useMemo(() => {
    let list = docs;
    if (type) list = list.filter((d) => d.document_type === type);
    const s = q.trim().toLowerCase();
    if (s) list = list.filter((d) => [d.display_name, d.gig?.title, d.document_type].filter(Boolean).join(" ").toLowerCase().includes(s));
    return list;
  }, [docs, type, q]);

  return (
    <div className="max-w-5xl">
      <div className="flex items-baseline justify-between gap-4 mb-4">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Documents</h1>
        <span className="text-sm text-zinc-400 dark:text-zinc-500">{docs.length}</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="relative sm:w-72">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search documents & gigs" className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 pl-9 pr-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          <Chip active={type === null} onClick={() => setType(null)}>All</Chip>
          {types.map(([t, n]) => (
            <Chip key={t} active={type === t} onClick={() => setType(type === t ? null : t)}>
              {typeLabel(t)}<span className="ml-1 opacity-70">{n}</span>
            </Chip>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 p-10 text-center text-sm text-zinc-400 dark:text-zinc-500">
          {docs.length === 0 ? "No documents yet. Upload files to your gigs in the GigDock app." : "No documents match."}
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800">
          {visible.map((d) => <DocRow key={d.id} d={d} />)}
        </div>
      )}
      <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">Links open securely and expire after a few minutes. Uploading from the web is coming soon.</p>
    </div>
  );
}

function DocRow({ d }: { d: Doc }) {
  const meta = [typeLabel(d.document_type), shortDate(d.document_date ?? d.created_at), bytes(d.file_size)].filter(Boolean).join(" · ");
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          {d.mime_type?.startsWith("image/") ? (<><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></>) : (<><path d="M14 3v5h5" /><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /></>)}
        </svg>
      </span>
      <div className="min-w-0 flex-1">
        {d.url ? (
          <a href={d.url} target="_blank" rel="noopener noreferrer" className="font-medium text-zinc-900 dark:text-zinc-100 hover:text-blue-600 dark:hover:text-blue-400 truncate block">{d.display_name}</a>
        ) : (
          <span className="font-medium text-zinc-900 dark:text-zinc-100 truncate block opacity-70">{d.display_name}</span>
        )}
        <div className="truncate text-xs text-zinc-400 dark:text-zinc-500">
          {meta}
          {d.gig?.title && d.gig_id && (
            <> · <Link href={`/gigs/${d.gig_id}`} className="text-blue-600 dark:text-blue-400 hover:underline">{d.gig.title}</Link></>
          )}
        </div>
      </div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium border transition-colors ${active ? "bg-blue-600 border-blue-600 text-white" : "bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"}`}>
      {children}
    </button>
  );
}
