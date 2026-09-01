"use client";

// Real tabs for the gig workspace. The gig header + financial summary live above
// this (in the server page) and stay put; these tabs swap only the lower content
// panel, so the gig context is never lost. Server-rendered panel content is
// passed in as nodes.

import { useState } from "react";

export type GigTab = { id: string; label: string; count?: number; content: React.ReactNode };

export default function GigTabs({ tabs }: { tabs: GigTab[] }) {
  const [active, setActive] = useState(tabs[0]?.id);
  const current = tabs.find((t) => t.id === active) ?? tabs[0];

  return (
    <div>
      <div className="sticky top-14 lg:top-0 z-10 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/90 dark:bg-zinc-950/90 backdrop-blur">
        <div className="flex gap-1 overflow-x-auto" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={active === t.id}
              onClick={() => setActive(t.id)}
              className={`shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                active === t.id
                  ? "border-blue-600 text-blue-700 dark:text-blue-300"
                  : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100"
              }`}
            >
              {t.label}
              {t.count != null && t.count > 0 && (
                <span className="ml-1.5 text-xs text-zinc-400 dark:text-zinc-500">{t.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>
      <div className="pt-5">{current?.content}</div>
    </div>
  );
}
