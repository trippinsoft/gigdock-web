"use client";

import { useState } from "react";

/**
 * Shares the public per-opportunity URL. Uses the native share sheet where
 * available (mobile), otherwise copies the link to the clipboard.
 */
export default function ShareButton({
  id,
  title,
}: {
  id: string;
  title?: string | null;
}) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}/opportunities/${id}`;
    const data = {
      title: title || "GigDock opportunity",
      text: title ? `${title} — on GigDock` : "Check out this opportunity on GigDock",
      url,
    };
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(data);
        return;
      } catch {
        return; // user cancelled
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable — no-op */
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
      aria-label="Share this opportunity"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
        <path d="M16 6l-4-4-4 4" />
        <path d="M12 2v14" />
      </svg>
      {copied ? "Link copied" : "Share"}
    </button>
  );
}
