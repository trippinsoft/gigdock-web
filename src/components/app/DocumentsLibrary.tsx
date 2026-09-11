"use client";

// Cross-gig document library: search + type filters and a document list on the
// left, a preview/details inspector on the right (drawer on mobile). Files
// open via short-lived signed URLs. Uploading and connecting to gigs are
// available in-page — parity with the mobile Documents workflow.

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { DocumentRow } from "@/lib/backoffice-types";
import { shortDate } from "@/lib/format";
import {
  updateDocumentMeta,
  updateDocumentGig,
  deleteDocument,
} from "@/lib/backoffice-actions";
import {
  DOCUMENT_TYPES,
  documentTypeLabel,
  documentYearKey,
  isDocumentType,
} from "@/lib/documentTypes";
import type { DocumentTypeId } from "@/lib/documentTypes";
import AddDocumentSheet from "@/components/app/AddDocumentSheet";
import GigPickerSheet, { type PickerGig } from "@/components/app/GigPickerSheet";
import { ProBadge, useIsPro } from "@/components/app/pro";
import { trackPro } from "@/lib/monetization";
import { trackDoc } from "@/lib/documentEvents";

type Doc = DocumentRow & { gig: { title: string } | null; url?: string };

function bytes(n: number): string {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentsLibrary({
  docs,
  gigs,
  initialTypes = null,
  initialYear = null,
}: {
  docs: Doc[];
  gigs: PickerGig[];
  initialTypes?: DocumentTypeId[] | null;
  initialYear?: string | null;
}) {
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<string[] | null>(initialTypes);
  const [year, setYear] = useState<string | null>(initialYear);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const yearScoped = useMemo(() => {
    if (!year) return docs;
    return docs.filter((d) => documentYearKey(d) === year);
  }, [docs, year]);

  const types = useMemo(() => {
    const set = new Map<string, number>();
    for (const d of yearScoped) set.set(d.document_type, (set.get(d.document_type) ?? 0) + 1);
    return [...set.entries()].sort((a, b) => b[1] - a[1]);
  }, [yearScoped]);

  const visible = useMemo(() => {
    let list = yearScoped;
    if (typeFilter?.length) list = list.filter((d) => typeFilter.includes(d.document_type));
    const s = q.trim().toLowerCase();
    if (s) list = list.filter((d) => [d.display_name, d.gig?.title, documentTypeLabel(d.document_type)].filter(Boolean).join(" ").toLowerCase().includes(s));
    return list;
  }, [yearScoped, typeFilter, q]);

  const selected = docs.find((d) => d.id === selectedId) ?? null;

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Documents</h1>
          <span className="text-sm text-zinc-400 dark:text-zinc-500">{visible.length}{visible.length !== docs.length ? ` of ${docs.length}` : ""}</span>
        </div>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          Add Document
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="relative sm:w-72">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search documents & gigs" className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 pl-9 pr-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          <Chip active={typeFilter === null && year === null} onClick={() => { setTypeFilter(null); setYear(null); }}>All</Chip>
          {year && (
            <Chip active onClick={() => setYear(null)}>{year}</Chip>
          )}
          {types.map(([t, n]) => (
            <Chip
              key={t}
              active={typeFilter?.includes(t) ?? false}
              onClick={() => setTypeFilter(typeFilter?.length === 1 && typeFilter[0] === t ? null : [t])}
            >
              {documentTypeLabel(t)}<span className="ml-1 opacity-70">{n}</span>
            </Chip>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 p-10 text-center">
          {docs.length === 0 ? (
            <>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">No documents yet.</p>
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-semibold text-white"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                Add your first document
              </button>
            </>
          ) : (
            <p className="text-sm text-zinc-400 dark:text-zinc-500">No documents match.</p>
          )}
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
                    {documentTypeLabel(d.document_type)}
                    {` · ${documentYearKey(d) || "—"}`}
                    {d.gig?.title ? ` · ${d.gig.title}` : ""}
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
              <Inspector doc={selected} gigs={gigs} onClose={() => setSelectedId(null)} />
            </>
          )}
        </div>
      )}
      <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">Links open securely and expire after a few minutes.</p>

      {adding && (
        <AddDocumentSheet
          gigs={gigs}
          onClose={() => setAdding(false)}
        />
      )}
    </div>
  );
}

function Inspector({ doc, gigs, onClose }: { doc: Doc; gigs: PickerGig[]; onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState(doc.display_name);
  const [docType, setDocType] = useState(doc.document_type);
  const [docDate, setDocDate] = useState<string>(doc.document_date ?? "");
  const [notes, setNotes] = useState<string>(doc.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [gigBusy, setGigBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(doc.display_name);
    setDocType(doc.document_type);
    setDocDate(doc.document_date ?? "");
    setNotes(doc.notes ?? "");
    setError(null);
    setConfirmDelete(false);
  }, [doc.id, doc.display_name, doc.document_type, doc.document_date, doc.notes]);

  const dirty =
    name.trim() !== doc.display_name ||
    docType !== doc.document_type ||
    (docDate || null) !== (doc.document_date ?? null) ||
    (notes.trim() || null) !== (doc.notes ?? null);

  const typeOptions = DOCUMENT_TYPES.some((t) => t.id === docType)
    ? DOCUMENT_TYPES
    : [{ id: docType, label: documentTypeLabel(docType) }, ...DOCUMENT_TYPES];

  const isPro = useIsPro();

  async function save() {
    setError(null);
    if (!isDocumentType(docType)) {
      setError("Choose a valid document type.");
      return;
    }
    setBusy(true);
    const res = await updateDocumentMeta(doc.id, {
      display_name: name,
      document_type: docType,
      document_date: docDate || null,
      notes: notes || null,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    trackDoc("document_metadata_updated", { document_id: doc.id });
    router.refresh();
  }

  function openGigPicker() {
    setError(null);
    if (!isPro) {
      trackPro("locked_feature_attempt", "document_gig_association", { from: "documents_inspector" });
      trackPro("pro_feature_tapped", "document_gig_association", { from: "documents_inspector" });
      router.push("/pro?from=document_gig_association");
      return;
    }
    setPickerOpen(true);
  }

  async function pickGig(choice: { id: string | null; title: string }) {
    setPickerOpen(false);
    if (choice.id === (doc.gig_id ?? null)) return;
    setGigBusy(true);
    const res = await updateDocumentGig(doc.id, choice.id);
    setGigBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    const prev = res.data?.previous_gig_id ?? null;
    if (prev == null && choice.id != null) {
      trackDoc("document_connected_to_gig", { document_id: doc.id, gig_id: choice.id, source: "inspector" });
    } else if (prev != null && choice.id == null) {
      trackDoc("document_disconnected_from_gig", { document_id: doc.id, previous_gig_id: prev });
    } else if (prev != null && choice.id != null) {
      trackDoc("document_gig_association_changed", { document_id: doc.id, gig_id: choice.id, previous_gig_id: prev });
    }
    router.refresh();
  }

  async function remove() {
    setDeleteBusy(true);
    const res = await deleteDocument(doc.id);
    setDeleteBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    trackDoc("document_deleted", { document_id: doc.id, gig_id: res.data?.gig_id ?? null });
    router.refresh();
    onClose();
  }

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-50 max-h-[80vh] overflow-y-auto rounded-t-2xl border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 lg:static lg:z-auto lg:w-80 lg:shrink-0 lg:max-h-none lg:rounded-2xl lg:border">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0">
            <div className="font-semibold text-zinc-900 dark:text-zinc-100 break-words">{doc.display_name}</div>
            <div className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">{documentTypeLabel(doc.document_type)}</div>
          </div>
          <button onClick={onClose} className="shrink-0 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xl leading-none" aria-label="Close">×</button>
        </div>

        <Preview doc={doc} />

        <div className="mt-3 space-y-2">
          <label className="block">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={160}
              className="mt-1 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Type</span>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {typeOptions.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Date</span>
              <input
                type="date"
                value={docDate}
                onChange={(e) => setDocDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
          </div>
          <label className="block">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Notes</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Optional"
              className="mt-1 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
          <button
            type="button"
            disabled={!dirty || busy}
            onClick={save}
            className="w-full rounded-lg bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white disabled:opacity-40 px-4 py-2 text-sm font-semibold text-white dark:text-zinc-900"
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </div>

        {/* Connected gig — with change / remove controls. Pro-gated: Free
            users still see the current state but the Connect / Change action
            routes them to the Pro landing. */}
        <div className="mt-3 rounded-xl border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800">
          <div className="px-3 py-2.5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                Connected gig {!isPro && <ProBadge className="ml-1" />}
              </span>
              <div className="flex items-center gap-2">
                {doc.gig_id ? (
                  <>
                    <button
                      type="button"
                      onClick={openGigPicker}
                      disabled={gigBusy}
                      className="text-xs font-semibold text-blue-700 dark:text-blue-300 hover:underline disabled:opacity-50"
                    >
                      {isPro ? "Change" : "Change · Pro"}
                    </button>
                    {isPro && (
                      <button
                        type="button"
                        onClick={() => pickGig({ id: null, title: "Personal Documents" })}
                        disabled={gigBusy}
                        className="text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50"
                      >
                        Remove
                      </button>
                    )}
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={openGigPicker}
                    disabled={gigBusy}
                    className="text-xs font-semibold text-blue-700 dark:text-blue-300 hover:underline disabled:opacity-50"
                  >
                    {isPro ? "Connect" : "Connect · Pro"}
                  </button>
                )}
              </div>
            </div>
            <div className="mt-1 text-sm text-zinc-800 dark:text-zinc-100 min-w-0">
              {doc.gig_id && doc.gig?.title ? (
                <Link href={`/gigs/${doc.gig_id}`} className="font-medium text-blue-600 dark:text-blue-400 hover:underline break-words">
                  {doc.gig.title}
                </Link>
              ) : (
                <span className="text-zinc-500 dark:text-zinc-400">Not connected</span>
              )}
            </div>
          </div>
          <Meta label="Year" value={documentYearKey(doc) || "—"} />
          {doc.file_size ? <Meta label="Size" value={bytes(doc.file_size)} /> : null}
        </div>

        {doc.url && (
          <a href={doc.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Open / download</a>
        )}

        <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          {confirmDelete ? (
            <div className="rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50/70 dark:bg-red-950/30 px-3 py-2.5">
              <p className="text-xs text-zinc-700 dark:text-zinc-200">
                Delete this document? The file will be removed from your library and cannot be undone.
              </p>
              <div className="mt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleteBusy}
                  className="px-3 py-1 rounded-md text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={remove}
                  disabled={deleteBusy}
                  className="px-3 py-1 rounded-md text-xs font-semibold bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
                >
                  {deleteBusy ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="text-xs font-medium text-red-600 dark:text-red-400 hover:underline"
            >
              Delete document
            </button>
          )}
        </div>
      </div>

      {pickerOpen && (
        <GigPickerSheet
          gigs={gigs}
          currentGigId={doc.gig_id ?? null}
          allowDetach
          title="Connect to a gig"
          onPick={pickGig}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </>
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
