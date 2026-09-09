"use client";

// "More from GigDock" — a compact, clearly-branded acquisition card that sits
// inside the anonymous Opportunities feed to teach that GigDock is broader than
// discovery. Deliberately NOT styled to resemble an opportunity: distinct
// eyebrow, no image thumb, no freshness/status badges, no chevron. Rendered
// exactly once per list, for signed-out visitors on the main feed only.
//
// CTAs use the shared broader-product signup intent (manage), which lands
// successful signups on /today.

import Link from "next/link";
import { track } from "@/lib/analytics";

export default function OpportunitiesPromoCard() {
  return (
    <div className="rounded-lg border border-blue-200 dark:border-blue-900/50 bg-blue-50/70 dark:bg-blue-950/30 p-4 sm:p-5">
      <div className="flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/gigdock-logo.png" alt="" aria-hidden className="h-5 w-5 shrink-0" />
        <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.12em] text-blue-700 dark:text-blue-300">
          More from GigDock
        </span>
      </div>
      <h3 className="mt-2 text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
        Finding the work is just the beginning.
      </h3>
      <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
        Keep your gigs, dates, earnings, payments and records together after you get booked.
      </p>
      {/* Vertical hierarchy inside the narrow feed column: primary CTA
          takes the full width on its own row, secondary text link sits
          centered underneath. Prevents the previous side-by-side layout
          from wrapping awkwardly at feed widths. */}
      <div className="mt-4 flex flex-col items-center gap-3">
        <Link
          href="/signup?intent=manage"
          onClick={() =>
            track("opportunities_product_promo_clicked", { surface: "feed", action: "signup" })
          }
          className="w-full inline-flex items-center justify-center px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors"
        >
          Get Started Free
        </Link>
        <Link
          href="/features"
          onClick={() =>
            track("opportunities_product_promo_clicked", { surface: "feed", action: "features" })
          }
          className="text-sm font-semibold text-blue-700 dark:text-blue-300 hover:underline"
        >
          See everything GigDock does →
        </Link>
      </div>
    </div>
  );
}
