"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  LAUNCH_OFFER,
  PAYWALL_CONTEXT,
  PRICING,
  PRO_HEADLINE,
  PRO_PILLARS,
  PRO_SUBHEAD,
} from "@/lib/pricing";
import { trackPro, type ProContextTag } from "@/lib/monetization";
import { ProBadge, useIsPro } from "@/components/app/pro";

// GigDock Pro landing / paywall.
//
// The launch design is Founding-Member-primary + Monthly-secondary. The
// regular $99/year rate is shown ONLY as the strike-through anchor above
// the $49/year Founding price; it is not a competing selectable plan while
// LAUNCH_OFFER === "founding" (see src/lib/pricing.ts). The primary CTA is
// labeled "Upgrade to GigDock Pro" and fires the shared `checkout_start`
// monetization event; when the Stripe checkout URLs (see PLAN_TARGET
// below) are populated the button routes there, otherwise it fires
// analytics only. This mirrors the mobile launch state.

type PlanTier = "founding" | "monthly" | "annual";

/** Optional Stripe Payment Link URLs. Set these env vars when purchasing is
 *  wired; leave unset and the button remains labeled Upgrade to GigDock Pro
 *  but only fires analytics. See the handoff report for the full checklist
 *  of what remains to enable real purchasing. */
const PLAN_TARGET: Record<PlanTier, string | undefined> = {
  founding: process.env.NEXT_PUBLIC_STRIPE_CHECKOUT_FOUNDING_URL,
  monthly: process.env.NEXT_PUBLIC_STRIPE_CHECKOUT_MONTHLY_URL,
  annual: process.env.NEXT_PUBLIC_STRIPE_CHECKOUT_ANNUAL_URL,
};

export default function ProPage() {
  return (
    <Suspense>
      <ProLanding />
    </Suspense>
  );
}

function ProLanding() {
  const params = useSearchParams();
  const from = (params.get("from") ?? "account") as ProContextTag;
  const isPro = useIsPro();
  const story = PAYWALL_CONTEXT[from];
  const emphasize = story?.emphasize;

  useEffect(() => {
    trackPro("paywall_open", from);
    trackPro("pricing_view", from);
  }, [from]);

  if (isPro) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <ProBadge />
        <h1 className="mt-3 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          You&rsquo;re on GigDock Pro
        </h1>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400">
          Complete history, advanced insights, alerts, documents, expenses,
          reports and tax organization are all unlocked — on web and in the
          app.
        </p>
      </div>
    );
  }

  const pillars = [...PRO_PILLARS].sort((a, b) =>
    a.key === emphasize ? -1 : b.key === emphasize ? 1 : 0,
  );

  function upgrade(tier: PlanTier) {
    trackPro("checkout_start", from, { tier });
    if (tier === "founding") trackPro("founding_offer_selected", from);
    const target = PLAN_TARGET[tier];
    if (target) {
      window.location.assign(target);
    }
    // No fallback banner. When Stripe URLs aren't configured the click only
    // records the intent so we can measure demand; the design does not
    // apologize for missing plumbing.
  }

  return (
    <div className="max-w-4xl mx-auto py-6">
      <div className="text-center mb-8">
        <ProBadge />
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
          {story?.headline ?? PRO_HEADLINE}
        </h1>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto">
          {PRO_SUBHEAD}
        </p>
      </div>

      {/* Pillars */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
        {pillars.map((p) => (
          <div
            key={p.key}
            className={`rounded-2xl border p-4 ${
              p.key === emphasize
                ? "border-blue-300 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20"
                : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-blue-600 dark:text-blue-400">
                <PillarIcon icon={p.icon} />
              </span>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                {p.title}
              </h3>
            </div>
            <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
              {p.blurb}
            </p>
          </div>
        ))}
      </div>

      {/* Pricing — Founding-primary + Monthly-secondary during the launch
          window. LAUNCH_OFFER === null → collapses to the annual/monthly
          pair using the same components. */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 sm:p-7">
        {LAUNCH_OFFER === "founding" ? (
          <FoundingHero onUpgrade={() => upgrade("founding")} />
        ) : (
          <AnnualHero onUpgrade={() => upgrade("annual")} />
        )}

        <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-800">
          <MonthlyOption onUpgrade={() => upgrade("monthly")} />
        </div>

        <p className="mt-5 text-center text-xs text-zinc-500 dark:text-zinc-400">
          Pro works everywhere — buy on web or in the app, you&rsquo;re Pro on
          both.
        </p>
      </div>
    </div>
  );
}

function FoundingHero({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <div className="text-center">
      <div className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-3 py-1 text-[11px] font-bold uppercase tracking-wide">
        Founding Member
      </div>
      <div className="mt-4 flex items-baseline justify-center gap-3 flex-wrap">
        <span className="text-lg text-zinc-400 dark:text-zinc-500 line-through tabular-nums">
          {PRICING.annual.label}
          {PRICING.annual.period}
        </span>
        <span className="text-4xl sm:text-5xl font-extrabold text-zinc-900 dark:text-zinc-100 tabular-nums">
          {PRICING.founding.label}
          <span className="text-xl font-semibold text-zinc-500 dark:text-zinc-400">
            {PRICING.founding.period}
          </span>
        </span>
      </div>
      <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300 max-w-md mx-auto">
        {PRICING.founding.note}
      </p>
      <button
        onClick={onUpgrade}
        className="mt-5 inline-flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-700 px-6 py-3 text-sm font-semibold text-white"
      >
        Upgrade to GigDock Pro
      </button>
    </div>
  );
}

function AnnualHero({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <div className="text-center">
      <div className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-3 py-1 text-[11px] font-bold uppercase tracking-wide">
        Annual
      </div>
      <div className="mt-4 flex items-baseline justify-center gap-1">
        <span className="text-4xl sm:text-5xl font-extrabold text-zinc-900 dark:text-zinc-100 tabular-nums">
          {PRICING.annual.label}
        </span>
        <span className="text-xl font-semibold text-zinc-500 dark:text-zinc-400">
          {PRICING.annual.period}
        </span>
      </div>
      <button
        onClick={onUpgrade}
        className="mt-5 inline-flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-700 px-6 py-3 text-sm font-semibold text-white"
      >
        Upgrade to GigDock Pro
      </button>
    </div>
  );
}

function MonthlyOption({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
          Monthly
        </div>
        <div className="mt-1 flex items-baseline gap-1">
          <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
            {PRICING.monthly.label}
          </span>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            {PRICING.monthly.period}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          {PRICING.monthly.cta}
        </p>
      </div>
      <button
        onClick={onUpgrade}
        className="inline-flex items-center justify-center rounded-xl border border-blue-500 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/30 px-4 py-2 text-sm font-semibold"
      >
        Choose Monthly
      </button>
    </div>
  );
}

function PillarIcon({ icon }: { icon: string }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (icon) {
    case "history":
      return (
        <svg {...common}>
          <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
          <path d="M3 3v5h5" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
    case "chart":
      return (
        <svg {...common}>
          <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
        </svg>
      );
    case "bell":
      return (
        <svg {...common}>
          <path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
      );
    case "doc":
      return (
        <svg {...common}>
          <path d="M14 3v5h5" />
          <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        </svg>
      );
    case "receipt":
      return (
        <svg {...common}>
          <path d="M4 3v18l3-2 3 2 3-2 3 2 3-2V3l-3 2-3-2-3 2-3-2-3 2Z" />
          <path d="M8 8h8M8 12h6" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path d="M14 3v5h5" />
          <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M9 13h6M9 17h4" />
        </svg>
      );
  }
}
