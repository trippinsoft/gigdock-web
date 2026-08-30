// Run: npx tsx src/lib/documentTypes.test.ts

import assert from "node:assert/strict";
import {
  DOCUMENT_TYPES,
  TAX_DOCUMENT_TYPES,
  documentTypeBreakdown,
  documentTypeLabel,
  documentYearKey,
  filterTaxDocuments,
  isDocumentType,
  isTaxDocumentType,
  parseTypesQuery,
  parseYearQuery,
  taxDocumentsForYear,
  taxDocumentsLibraryHref,
} from "./documentTypes";

assert.equal(DOCUMENT_TYPES.length, 9);
assert.deepEqual(
  DOCUMENT_TYPES.map((t) => t.id),
  ["voucher", "pay_stub", "call_sheet", "contract", "w2", "1099", "receipt", "other_tax_document", "other"]
);
assert.deepEqual([...TAX_DOCUMENT_TYPES], ["w2", "1099", "other_tax_document"]);

assert.equal(documentTypeLabel("w2"), "W-2");
assert.equal(documentTypeLabel("1099"), "1099");
assert.equal(documentTypeLabel("other_tax_document"), "Other Tax Document");
assert.equal(documentTypeLabel("pay_stub"), "Pay Stub");
assert.equal(isDocumentType("w2"), true);
assert.equal(isDocumentType("W2"), false);
assert.equal(isTaxDocumentType("w2"), true);
assert.equal(isTaxDocumentType("pay_stub"), false);
assert.equal(isTaxDocumentType("receipt"), false);
assert.equal(isTaxDocumentType("voucher"), false);
assert.equal(isTaxDocumentType("call_sheet"), false);
assert.equal(isTaxDocumentType("contract"), false);
assert.equal(isTaxDocumentType("other"), false);

const docs = [
  { document_type: "pay_stub", document_date: "2026-08-21", created_at: "2026-01-01T00:00:00Z" },
  { document_type: "w2", document_date: "2026-01-31", created_at: "2026-02-01T00:00:00Z" },
  { document_type: "1099", document_date: null, created_at: "2025-12-15T00:00:00Z" },
  { document_type: "receipt", document_date: "2026-03-01", created_at: "2026-03-02T00:00:00Z" },
];

assert.equal(documentYearKey(docs[2]), "2025");
assert.equal(filterTaxDocuments(docs).length, 2);
assert.equal(taxDocumentsForYear(docs, 2026).length, 1);
assert.equal(taxDocumentsForYear(docs, 2026)[0].document_type, "w2");
assert.equal(documentTypeBreakdown(taxDocumentsForYear(docs, 2026)), "1 W-2");
assert.equal(
  documentTypeBreakdown(filterTaxDocuments(docs)),
  "1 W-2, 1 1099"
);

assert.deepEqual(parseTypesQuery("w2,1099,other_tax_document"), ["w2", "1099", "other_tax_document"]);
assert.equal(parseTypesQuery("nope"), null);
assert.equal(parseYearQuery("2026"), "2026");
assert.equal(parseYearQuery("26"), null);
assert.equal(
  taxDocumentsLibraryHref(2026),
  "/documents?types=w2,1099,other_tax_document&year=2026"
);

console.log("documentTypes: labels, tax subset, and year key match the DB contract");
