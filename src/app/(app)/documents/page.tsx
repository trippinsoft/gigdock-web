import type { Metadata } from "next";
import { getDocuments, getSignedDocUrls } from "@/lib/backoffice";
import type { DocumentRow } from "@/lib/backoffice-types";
import { shortDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "Documents",
  robots: { index: false, follow: false },
};

function bytes(n: number): string {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function typeLabel(t: string): string {
  return t.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function DocumentsPage() {
  const docs = await getDocuments();
  const urls = await getSignedDocUrls(docs.map((d) => d.storage_path));

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-1">Documents</h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
        Vouchers, call sheets, pay stubs and other files from your gigs.
      </p>

      {docs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 p-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
          No documents yet. Upload files to your gigs in the GigDock app.
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800">
          {docs.map((d) => (
            <DocRow key={d.id} d={d} url={urls[d.storage_path]} />
          ))}
        </div>
      )}
      <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">
        Links open securely and expire after a few minutes. Uploading from the web is coming soon.
      </p>
    </div>
  );
}

function DocRow({ d, url }: { d: DocumentRow; url?: string }) {
  const meta = [typeLabel(d.document_type), shortDate(d.document_date ?? d.created_at), bytes(d.file_size)]
    .filter(Boolean)
    .join(" · ");
  const inner = (
    <div className="flex items-center gap-3 px-4 py-3">
      <FileIcon mime={d.mime_type} />
      <div className="min-w-0 flex-1">
        <div className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{d.display_name}</div>
        <div className="text-xs text-zinc-400 dark:text-zinc-500 truncate">{meta}</div>
      </div>
      {url && (
        <svg className="shrink-0 text-zinc-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 17 17 7M7 7h10v10" />
        </svg>
      )}
    </div>
  );
  if (!url) {
    return <div className="opacity-60">{inner}</div>;
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="block hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
      {inner}
    </a>
  );
}

function FileIcon({ mime }: { mime: string }) {
  const isImage = mime?.startsWith("image/");
  return (
    <span className="shrink-0 inline-flex items-center justify-center h-9 w-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {isImage ? (
          <>
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="m21 15-5-5L5 21" />
          </>
        ) : (
          <>
            <path d="M14 3v5h5" />
            <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          </>
        )}
      </svg>
    </span>
  );
}
