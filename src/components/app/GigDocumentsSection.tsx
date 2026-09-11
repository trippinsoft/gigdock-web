"use client";

// Client wrapper for the Gig Detail Documents tab: renders the server-rendered
// document rows the parent passes in as children, plus a "+ Add Document"
// button that opens the shared AddDocumentSheet with this gig pre-selected.
// The sheet handles the Free vs Pro gating for gig linking itself.

import { useState } from "react";
import AddDocumentSheet from "@/components/app/AddDocumentSheet";

export default function GigDocumentsSection({
  gigId,
  gigTitle,
  children,
}: {
  gigId: string;
  gigTitle: string;
  children: React.ReactNode;
}) {
  const [adding, setAdding] = useState(false);
  return (
    <div>
      <div className="mb-3 flex items-center justify-end">
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          Add Document
        </button>
      </div>
      {children}
      {adding && (
        <AddDocumentSheet
          gigs={[]}
          gigContext={{ id: gigId, title: gigTitle }}
          onClose={() => setAdding(false)}
        />
      )}
    </div>
  );
}
