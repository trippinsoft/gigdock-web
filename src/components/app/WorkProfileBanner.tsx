"use client";

// One banner on Today for any signed-in user whose universal work profile
// is incomplete. Three contextual states — never blocking:
//
//   both work_roles_set_at and work_markets_set_at NULL
//     → "Finish setting up your work profile" · /profile#work-roles
//   work_roles_set_at NULL, work_markets_set_at set
//     → "Tell GigDock what kind of work you do" · /profile#work-roles
//   work_roles_set_at set, work_markets_set_at NULL
//     → "Where do you want to work?" · /profile#work-markets
//   both set                                → hidden (parent skips render)
//
// The parent renders this component only when at least one of the two
// timestamps is NULL — so this component itself just decides the state
// among the three above.

import Link from "next/link";
import { useState } from "react";

export default function WorkProfileBanner({
  workRolesSet,
  workMarketsSet,
}: {
  workRolesSet: boolean;
  workMarketsSet: boolean;
}) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  if (workRolesSet && workMarketsSet) return null;

  let heading: string;
  let sub: string;
  let href: string;
  let cta: string;
  if (!workRolesSet && !workMarketsSet) {
    heading = "Finish setting up your work profile";
    sub = "Tell GigDock the roles you do and the markets you work in — we use both to surface the opportunities that fit you.";
    href = "/profile#work-roles";
    cta = "Set up work profile";
  } else if (!workRolesSet) {
    heading = "Tell GigDock what kind of work you do";
    sub = "Add your work roles so we can tailor your experience to the work you actually do.";
    href = "/profile#work-roles";
    cta = "Choose work roles";
  } else {
    heading = "Where do you want to work?";
    sub = "Add your work markets so we can surface opportunities near you.";
    href = "/profile#work-markets";
    cta = "Add work markets";
  }

  return (
    <div className="mb-4 rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/60 dark:bg-blue-950/20 px-4 py-3 sm:px-5 sm:py-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {heading}
          </div>
          <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-300">
            {sub}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={href}
            className="inline-flex items-center rounded-full bg-blue-600 hover:bg-blue-700 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-white"
          >
            {cta}
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
