"use client";

// Modest, dismissible-per-session banner rendered on Today for
// grandfathered users (created before WORK_ROLES_LAUNCH_DATE with
// work_roles_set_at IS NULL). Once they answer via /onboarding, the
// server-rendered gate stops emitting the banner permanently because
// work_roles_set_at is populated.

import Link from "next/link";
import { useState } from "react";

export default function WorkRolesBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="mb-4 rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/60 dark:bg-blue-950/20 px-4 py-3 sm:px-5 sm:py-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Tell GigDock what kind of work you do
          </div>
          <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-300">
            Help GigDock tailor your experience to the work you do.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/onboarding?next=/today"
            className="inline-flex items-center rounded-full bg-blue-600 hover:bg-blue-700 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-white"
          >
            Choose work roles
          </Link>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss"
            className="grid h-8 w-8 place-items-center rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
