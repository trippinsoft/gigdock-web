"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createDraftGig } from "@/lib/backoffice-actions";

export default function NewGigButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    setBusy(true);
    const res = await createDraftGig();
    if (!res.ok || !res.data) {
      setBusy(false);
      alert(res.ok ? "Could not create gig." : res.error);
      return;
    }
    router.push(`/gigs/${res.data.id}/edit`);
  }

  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <path d="M12 5v14M5 12h14" />
      </svg>
      {busy ? "Creating…" : "New gig"}
    </button>
  );
}
