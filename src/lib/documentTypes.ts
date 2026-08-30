// Canonical document types — matches public.documents.document_type CHECK.
// Classification is not a Pro feature. Do not copy the shorter mobile picker.

export const DOCUMENT_TYPES = [
  { id: "voucher", label: "Voucher" },
  { id: "pay_stub", label: "Pay Stub" },
  { id: "call_sheet", label: "Call Sheet" },
  { id: "contract", label: "Contract" },
  { id: "w2", label: "W-2" },
  { id: "1099", label: "1099" },
  { id: "receipt", label: "Receipt" },
  { id: "other_tax_document", label: "Other Tax Document" },
  { id: "other", label: "Other" },
] as const;

export type DocumentTypeId = (typeof DOCUMENT_TYPES)[number]["id"];

/** W-2, 1099, and Other Tax Document only. Receipts, pay stubs, vouchers, etc. are not tax documents. */
export const TAX_DOCUMENT_TYPES = ["w2", "1099", "other_tax_document"] as const;
export type TaxDocumentTypeId = (typeof TAX_DOCUMENT_TYPES)[number];

const DOCUMENT_TYPE_IDS = new Set<string>(DOCUMENT_TYPES.map((t) => t.id));
const TAX_TYPE_SET = new Set<string>(TAX_DOCUMENT_TYPES);
const LABEL_BY_ID: Record<string, string> = Object.fromEntries(
  DOCUMENT_TYPES.map((t) => [t.id, t.label])
);

export function isDocumentType(id: string): id is DocumentTypeId {
  return DOCUMENT_TYPE_IDS.has(id);
}

export function isTaxDocumentType(id: string): id is TaxDocumentTypeId {
  return TAX_TYPE_SET.has(id);
}

export function documentTypeLabel(id: string): string {
  return LABEL_BY_ID[id] ?? id.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Year of a document: document_date when set, otherwise created_at (upload time). */
export function documentYearKey(d: { document_date: string | null; created_at: string }): string {
  return (d.document_date || d.created_at || "").slice(0, 4);
}

export function filterTaxDocuments<T extends { document_type: string }>(docs: T[]): T[] {
  return docs.filter((d) => isTaxDocumentType(d.document_type));
}

export function taxDocumentsForYear<T extends { document_type: string; document_date: string | null; created_at: string }>(
  docs: T[],
  year: number | string
): T[] {
  const y = String(year);
  return docs.filter((d) => isTaxDocumentType(d.document_type) && documentYearKey(d) === y);
}

/** Ordered "1 W-2, 2 1099" style counts. Empty string when there are no matching types. */
export function documentTypeBreakdown(docs: { document_type: string }[]): string {
  const counts = new Map<string, number>();
  for (const d of docs) counts.set(d.document_type, (counts.get(d.document_type) ?? 0) + 1);
  const parts: string[] = [];
  for (const { id, label } of DOCUMENT_TYPES) {
    const n = counts.get(id);
    if (n) parts.push(`${n} ${label}`);
  }
  for (const [id, n] of counts) {
    if (!DOCUMENT_TYPE_IDS.has(id)) parts.push(`${n} ${documentTypeLabel(id)}`);
  }
  return parts.join(", ");
}

export function parseTypesQuery(raw: string | undefined): DocumentTypeId[] | null {
  if (!raw) return null;
  const ids = raw.split(",").map((s) => s.trim()).filter(isDocumentType);
  return ids.length ? ids : null;
}

export function parseYearQuery(raw: string | undefined): string | null {
  return raw && /^\d{4}$/.test(raw) ? raw : null;
}

export function taxDocumentsLibraryHref(year: number | string): string {
  return `/documents?types=${TAX_DOCUMENT_TYPES.join(",")}&year=${year}`;
}
