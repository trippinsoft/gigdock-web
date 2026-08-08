"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Share menu with explicit channels (Copy link · Email · Text · WhatsApp), like
 * Indeed. Deliberately does NOT use navigator.share — on desktop that triggers a
 * clunky OS share-extension window instead of the user's real Messages/Mail app.
 */
export default function ShareButton({
  id,
  title,
}: {
  id: string;
  title?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setOrigin(window.location.origin), []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const url = `${origin}/opportunities/${id}`;
  const label = title || "GigDock opportunity";
  const body = `${title ? title + " — on GigDock\n" : ""}${url}`;
  const email = `mailto:?subject=${encodeURIComponent(label)}&body=${encodeURIComponent(body)}`;
  const sms = `sms:?&body=${encodeURIComponent(body)}`;
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(body)}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* no-op */
    }
    setOpen(false);
  }

  const item =
    "flex items-center gap-3 w-full px-3.5 py-2.5 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
          <path d="M16 6l-4-4-4 4" />
          <path d="M12 2v14" />
        </svg>
        {copied ? "Link copied" : "Share"}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-2 w-52 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xl py-1.5 overflow-hidden"
        >
          <button type="button" role="menuitem" onClick={copy} className={item}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500">
              <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
              <path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
            </svg>
            Copy link
          </button>

          <a role="menuitem" href={email} onClick={() => setOpen(false)} className={item}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="m3 7 9 6 9-6" />
            </svg>
            Email
          </a>

          <a role="menuitem" href={sms} onClick={() => setOpen(false)} className={item}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500">
              <path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.4 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8A8.4 8.4 0 0 1 12.5 3 8.4 8.4 0 0 1 21 11.5Z" />
            </svg>
            Text message
          </a>

          <a role="menuitem" href={whatsapp} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)} className={item}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#25D366" aria-hidden="true">
              <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm5.62 14.11c-.24.66-1.39 1.26-1.9 1.31-.49.05-.94.24-3.18-.66-2.68-1.06-4.38-3.8-4.51-3.98-.13-.18-1.09-1.45-1.09-2.76s.69-1.96.93-2.23c.24-.26.53-.33.71-.33.18 0 .35.002.51.01.16.008.38-.06.6.46.24.55.79 1.9.86 2.03.07.13.11.29.02.46-.09.18-.13.29-.26.44-.13.16-.28.35-.4.47-.13.13-.26.28-.11.53.15.26.66 1.09 1.42 1.76.98.87 1.8 1.14 2.06 1.27.26.13.4.11.55-.07.15-.18.63-.74.8-.99.16-.26.33-.21.55-.13.22.08 1.4.66 1.64.79.24.13.4.19.46.29.06.11.06.62-.18 1.28Z" />
            </svg>
            WhatsApp
          </a>
        </div>
      )}
    </div>
  );
}
