"use client";

// Cross-gig document library as a file-manager: search + type filters and a
// document list on the left, a preview/details inspector on the right (drawer on
// mobile). Files open via short-lived signed URLs; each doc links back to its gig.

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
  const [selectedId, setSelectedId] = useState<string | null>(null);

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

  const selected = docs.find((d) => d.id === selectedId) ?? null;

  return (
    <div className="max-w-6xl">
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
            <Chip key={t} active={type === t} onClick={() => setType(type === t ? null : t)}>{typeLabel(t)}<span className="ml-1 opacity-70">{n}</span></Chip>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 p-10 text-center text-sm text-zinc-400 dark:text-zinc-500">
          {docs.length === 0 ? "No documents yet. Upload files to your gigs in the GigDock app." : "No documents match."}
        </div>
      ) : (
        <div className="lg:flex lg:gap-4 lg:items-start">
          {/* List / table */}
          <div className="lg:flex-1 min-w-0 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800">
            {visible.map((d) => (
              <button
                key={d.id}
                onClick={() => setSelectedId(d.id)}
                className={`w-full text-left flex items-center gap-3 px-4 py-3 border-l-2 ${
                  selectedId === d.id ? "border-l-blue-600 bg-blue-50/70 dark:bg-blue-950/30" : "border-l-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                }`}
              >
                <FileIcon mime={d.mime_type} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-zinc-900 dark:text-zinc-100">{d.display_name}</div>
                  <div className="truncate text-xs text-zinc-400 dark:text-zinc-500">
                    {typeLabel(d.document_type)}{d.gig?.title ? ` · ${d.gig.title}` : ""}
                  </div>
                </div>
                <div className="shrink-0 text-xs text-zinc-400 dark:text-zinc-500 text-right">
                  <div>{shortDate(d.document_date ?? d.created_at)}</div>
                  {d.file_size ? <div>{bytes(d.file_size)}</div> : null}
                </div>
              </button>
            ))}
          </div>

          {/* Inspector */}
          {selected && (
            <>
              <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setSelectedId(null)} />
              <div className="fixed inset-x-0 bottom-0 z-50 max-h-[80vh] overflow-y-auto rounded-t-2xl border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 lg:static lg:z-auto lg:w-80 lg:shrink-0 lg:max-h-none lg:rounded-2xl lg:border">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100 break-words">{selected.display_name}</div>
                    <div className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">{typeLabel(selected.document_type)}</div>
                  </div>
                  <button onClick={() => setSelectedId(null)} className="shrink-0 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xl leading-none" aria-label="Close">×</button>
                </div>

                <Preview doc={selected} />

                <div className="mt-3 rounded-xl border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800">
                  <Meta label="Type" value={typeLabel(selected.document_type)} />
                  {selected.gig?.title && selected.gig_id && (
                    <div className="flex items-center justify-between gap-3 px-3 py-2">
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">Gig</span>
                      <Link href={`/gigs/${selected.gig_id}`} className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline text-right truncate">{selected.gig.title}</Link>
                    </div>
                  )}
                  <Meta label="Date" value={shortDate(selected.document_date ?? selected.created_at)} />
                  {selected.file_size ? <Meta label="Size" value={bytes(selected.file_size)} /> : null}
                </div>

                {selected.url && (
                  <a href={selected.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Open / download</a>
                )}
              </div>
            </>
          )}
        </div>
      )}
      <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">Links open securely and expire after a few minutes. Uploading from the web is coming soon.</p>
    </div>
  );
}

function Preview({ doc }: { doc: Doc }) {
  if (!doc.url) {
    return <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 py-10 text-center text-xs text-zinc-400 dark:text-zinc-500">Preview unavailable</div>;
  }
  if (doc.mime_type?.startsWith("image/")) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={doc.url} alt="" className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 max-h-72 object-contain bg-zinc-50 dark:bg-zinc-950" />;
  }
  if (doc.mime_type === "application/pdf") {
    return <iframe src={doc.url} title={doc.display_name} className="w-full h-72 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white" />;
  }
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 py-10 flex items-center justify-center text-zinc-300 dark:text-zinc-600">
      <FileIcon mime={doc.mime_type} large />
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2">
      <span className="text-xs text-zinc-500 dark:text-zinc-400">{label}</span>
      <span className="text-xs font-medium text-zinc-700 dark:text-zinc-200 text-right">{value}</span>
    </div>
  );
}

function FileIcon({ mime, large }: { mime: string; large?: boolean }) {
  const s = large ? 40 : 20;
  const isImage = mime?.startsWith("image/");
  return (
    <span className={`shrink-0 inline-flex items-center justify-center rounded-lg ${large ? "" : "h-9 w-9 bg-zinc-100 dark:bg-zinc-800"} text-zinc-500`}>
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        {isImage ? (<><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></>) : (<><path d="M14 3v5h5" /><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /></>)}
      </svg>
    </span>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium border transition-colors ${active ? "bg-blue-600 border-blue-600 text-white" : "bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"}`}>
      {children}
    </button>
  );
}
