"use client";

// Web equivalent of the mobile AddDocumentScreen. Business rules match mobile:
//   • max 20 MB
//   • PDFs and images only (audit: application/pdf + image/*)
//   • storage path = `${user_id}/${Date.now()}-${random8}.${ext}` (private
//     documents bucket)
//   • row insert mirrors mobile columns exactly, via createDocument server
//     action (which double-checks path ownership + Pro-gates gig_id)
//   • Free users may upload; connecting the document to a gig is Pro
//   • Free upload from a gig context still saves (with gig_id: null) and the
//     result surfaces a contextual Pro upsell — same as mobile
//
// The file itself is uploaded client-direct with the browser supabase client
// (its session cookie authorizes RLS). A failed row insert removes the just-
// uploaded object so the private bucket does not accumulate orphans.

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { DOCUMENT_TYPES, documentTypeLabel } from "@/lib/documentTypes";
import { createDocument } from "@/lib/backoffice-actions";
import { useIsPro, ProBadge } from "@/components/app/pro";
import { trackPro } from "@/lib/monetization";
import { trackDoc } from "@/lib/documentEvents";
import GigPickerSheet, { type PickerGig } from "@/components/app/GigPickerSheet";

const MAX_BYTES = 20 * 1024 * 1024;
const ACCEPTED_MIME = ["application/pdf", "image/*"] as const;
const EXT_WHITELIST = new Set(["pdf", "jpg", "jpeg", "png", "heic", "heif", "webp"]);

function safeExt(name: string, mime: string): string {
  const fromName = name.split(".").pop()?.toLowerCase();
  if (fromName && EXT_WHITELIST.has(fromName)) return fromName === "jpeg" ? "jpg" : fromName;
  if (mime === "application/pdf") return "pdf";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/heic") return "heic";
  if (mime === "image/heif") return "heif";
  if (mime.startsWith("image/")) return "jpg";
  return "bin";
}

function random8() {
  const arr = new Uint8Array(4);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

function inferDocType(name: string): string {
  const n = name.toLowerCase();
  if (/\b(w-?2)\b/.test(n)) return "w2";
  if (/\b1099\b/.test(n)) return "1099";
  if (/pay.?stub|paystub/.test(n)) return "pay_stub";
  if (/voucher/.test(n)) return "voucher";
  if (/call.?sheet/.test(n)) return "call_sheet";
  if (/receipt/.test(n)) return "receipt";
  if (/contract/.test(n)) return "contract";
  return "other";
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function AddDocumentSheet({
  gigs,
  gigContext = null,
  onClose,
  onCreated,
}: {
  gigs: PickerGig[];
  /** When provided (Gig Detail entry), the sheet skips the picker and pre-attaches to this gig for Pro users. */
  gigContext?: { id: string; title: string } | null;
  onClose: () => void;
  onCreated?: (result: { id: string; gigId: string | null; wasProUpsellRequested: boolean }) => void;
}) {
  const supabase = useMemo(() => createSupabaseBrowser(), []);
  const isPro = useIsPro();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [docType, setDocType] = useState<string>("other");
  const [docDate, setDocDate] = useState<string>(todayIso());
  const [notes, setNotes] = useState("");
  const [gigChoice, setGigChoice] = useState<{ id: string | null; title: string } | null>(
    gigContext ? { id: gigContext.id, title: gigContext.title } : null
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proUpsell, setProUpsell] = useState<{ savedTitle: string; sourceGig: string | null } | null>(null);
  const initiated = useRef(false);

  function pickFile(f: File | null) {
    if (!f) return;
    if (f.size > MAX_BYTES) {
      setError("Files must be 20 MB or smaller.");
      return;
    }
    if (!(f.type === "application/pdf" || f.type.startsWith("image/"))) {
      setError("Only PDFs and images are supported.");
      return;
    }
    setError(null);
    setFile(f);
    if (!displayName.trim()) {
      // Strip extension for the default display name (matches mobile).
      setDisplayName(f.name.replace(/\.[^.]+$/, ""));
      setDocType(inferDocType(f.name));
    }
    if (!initiated.current) {
      initiated.current = true;
      trackDoc("document_upload_initiated", {
        surface: gigContext ? "gig_detail" : "documents",
      });
    }
  }

  async function submit() {
    if (!file) {
      setError("Choose a file to upload.");
      return;
    }
    if (!displayName.trim()) {
      setError("Give the document a name.");
      return;
    }
    setBusy(true);
    setError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setBusy(false);
      setError("You need to be signed in.");
      return;
    }
    const ext = safeExt(file.name, file.type);
    const storagePath = `${user.id}/${Date.now()}-${random8()}.${ext}`;
    try {
      const { error: upErr } = await supabase.storage
        .from("documents")
        .upload(storagePath, file, {
          contentType: file.type,
          upsert: false,
          cacheControl: "3600",
        });
      if (upErr) throw upErr;

      const wantsGigLink = Boolean(gigChoice?.id);
      const res = await createDocument({
        storage_path: storagePath,
        original_file_name: file.name,
        mime_type: file.type,
        file_size: file.size,
        display_name: displayName,
        document_type: docType,
        document_date: docDate || null,
        notes: notes || null,
        gig_id: gigChoice?.id ?? null,
      });
      if (!res.ok) {
        // Roll back the just-uploaded object.
        await supabase.storage.from("documents").remove([storagePath]).catch(() => undefined);
        throw new Error(res.error);
      }
      trackDoc("document_uploaded", {
        document_id: res.data!.id,
        document_type: docType,
        mime_type: file.type,
        file_size: file.size,
        gig_id: res.data!.gig_id,
        connected_to_gig: res.data!.gig_id != null,
        surface: gigContext ? "gig_detail" : "documents",
      });
      if (res.data!.gig_id) {
        trackDoc("document_connected_to_gig", {
          document_id: res.data!.id,
          gig_id: res.data!.gig_id,
          source: "upload",
        });
      }
      // Free + wanted a gig link: mobile shows a contextual upsell modal after
      // save. Do the same instead of quietly dropping the association.
      if (wantsGigLink && res.data!.gig_id == null && !isPro) {
        trackPro("pro_feature_impression", "document_gig_association", {
          from: gigContext ? "gig_detail_upload" : "documents_upload",
        });
        setProUpsell({ savedTitle: displayName.trim(), sourceGig: gigContext?.title ?? gigChoice?.title ?? null });
        router.refresh();
        onCreated?.({ id: res.data!.id, gigId: null, wasProUpsellRequested: true });
        return;
      }
      router.refresh();
      onCreated?.({ id: res.data!.id, gigId: res.data!.gig_id, wasProUpsellRequested: false });
      onClose();
    } catch (e) {
      trackDoc("document_upload_failed", {
        surface: gigContext ? "gig_detail" : "documents",
      });
      setError(e instanceof Error ? e.message : "The document could not be uploaded.");
    } finally {
      setBusy(false);
    }
  }

  function openGigPicker() {
    if (!isPro) {
      trackPro("locked_feature_attempt", "document_gig_association", {
        from: "documents_upload",
      });
      trackPro("pro_feature_tapped", "document_gig_association", {
        from: "documents_upload",
      });
      // For non-Pro, still let them "select" the gig in-context so we can show
      // the upsell after upload — mobile behavior. But route to the Pro page
      // is more informative here since there's no in-line paywall sheet.
      router.push("/pro?from=document_gig_association");
      return;
    }
    setPickerOpen(true);
  }

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add document"
        className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4"
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full sm:max-w-lg max-h-[92vh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden"
        >
          <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 px-4 py-3">
            <h2 className="flex-1 text-base font-semibold text-zinc-900 dark:text-zinc-100">Add document</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="grid h-8 w-8 place-items-center rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {proUpsell ? (
            <FreeUpsell
              savedTitle={proUpsell.savedTitle}
              sourceGig={proUpsell.sourceGig}
              onClose={onClose}
            />
          ) : (
            <>
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                <FileField
                  file={file}
                  onChange={pickFile}
                  inputRef={fileInputRef}
                />

                <label className="block">
                  <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Name</span>
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={160}
                    placeholder="Voucher, pay stub, W-2…"
                    className="mt-1 w-full h-10 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Type</span>
                    <select
                      value={docType}
                      onChange={(e) => setDocType(e.target.value)}
                      className="mt-1 w-full h-10 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {DOCUMENT_TYPES.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Date</span>
                    <input
                      type="date"
                      value={docDate}
                      onChange={(e) => setDocDate(e.target.value)}
                      className="mt-1 w-full h-10 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </label>
                </div>

                {/* Gig connection. Skipped when the sheet opens from Gig Detail. */}
                {gigContext ? (
                  <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-2.5">
                    <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                      Connect to gig {!isPro && <ProBadge className="ml-1" />}
                    </div>
                    <div className="mt-0.5 text-sm text-zinc-800 dark:text-zinc-100 truncate">{gigContext.title}</div>
                    {!isPro && (
                      <div className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                        We&apos;ll save the document to your library. Upgrade to keep it connected to this gig.
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1">
                      Connect to gig {!isPro && <ProBadge className="ml-1" />}
                    </div>
                    {gigChoice?.id ? (
                      <button
                        type="button"
                        onClick={openGigPicker}
                        className="w-full text-left rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-800 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                      >
                        <span className="truncate">{gigChoice.title}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={openGigPicker}
                        className="w-full text-left rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                      >
                        Search or choose a gig…
                      </button>
                    )}
                  </div>
                )}

                <label className="block">
                  <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Notes</span>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Optional"
                  />
                </label>

                {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-zinc-100 dark:border-zinc-800 px-4 py-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={busy}
                  className="px-4 py-2 rounded-full text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submit}
                  disabled={busy || !file}
                  className="px-5 py-2 rounded-full text-sm font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white transition-colors"
                >
                  {busy ? "Uploading…" : "Add document"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {pickerOpen && (
        <GigPickerSheet
          gigs={gigs}
          currentGigId={gigChoice?.id ?? null}
          allowDetach
          title="Connect to a gig"
          onClose={() => setPickerOpen(false)}
          onPick={(c) => {
            setGigChoice(c.id ? { id: c.id, title: c.title } : null);
            setPickerOpen(false);
          }}
        />
      )}
    </>
  );
}

function FileField({ file, onChange, inputRef }: { file: File | null; onChange: (f: File | null) => void; inputRef: React.RefObject<HTMLInputElement | null> }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">File</span>
      <div className="mt-1 flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_MIME.join(",")}
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="shrink-0 h-10 px-4 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
        >
          Choose file
        </button>
        <div className="min-w-0 flex-1 truncate text-sm text-zinc-500 dark:text-zinc-400">
          {file ? file.name : "PDF or image, up to 20 MB"}
        </div>
      </div>
    </label>
  );
}

function FreeUpsell({ savedTitle, sourceGig, onClose }: { savedTitle: string; sourceGig: string | null; onClose: () => void }) {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
      <div>
        <div className="text-xs font-bold uppercase tracking-wide text-green-700 dark:text-green-300 mb-1">Saved to your library</div>
        <div className="text-base font-semibold text-zinc-900 dark:text-zinc-100 truncate">{savedTitle}</div>
      </div>
      <div className="rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/60 dark:bg-blue-950/20 px-4 py-3">
        <div className="flex items-center gap-2 mb-1">
          <ProBadge />
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Keep records with the work they belong to</span>
        </div>
        <p className="text-xs text-zinc-600 dark:text-zinc-300">
          {sourceGig
            ? `Connect this document to ${sourceGig} so it lives with that gig.`
            : "Connect documents to gigs so call sheets, vouchers, and pay stubs stay organized with the work they belong to."}
        </p>
        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-full text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Not now
          </button>
          <Link
            href="/pro?from=document_gig_association"
            onClick={() => trackPro("pro_feature_tapped", "document_gig_association", { from: "documents_upsell" })}
            className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white"
          >
            Explore Pro →
          </Link>
        </div>
      </div>
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={onClose}
          className="text-sm text-zinc-500 dark:text-zinc-400 hover:underline"
        >
          Done
        </button>
      </div>
    </div>
  );
}
