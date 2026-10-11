"use client";

import { Suspense, useEffect } from "react";
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
// During launch, show the $49/year founding offer with the $99/year regular
// price as the crossed-out anchor. No competing plan selector.
// Purchasing is offered only when the matching checkout URL is configured.

type PlanTier = "founding" | "annual";

const PLAN_TARGET: Record<PlanTier, string | undefined> = {
  founding: process.env.NEXT_PUBLIC_STRIPE_CHECKOUT_FOUNDING_URL,
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
    const target = PLAN_TARGET[tier];
    if (!target) return; // Never imply checkout began when none exists.
    trackPro("checkout_start", from, { tier });
    if (tier === "founding") trackPro("founding_offer_selected", from);
    window.location.assign(target);
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

      {/* Benefit cards — equal visual weight for all six. The six cards sell
          the complete Pro bundle; the contextual headline (above) is what
          conveys WHY Pro is valuable from where the user came. Do not
          re-introduce a selected/emphasized card treatment — that would
          undercut the bundle framing and read as "the other five are less
          important". Icons stay blue; the emphasize ordering (below) keeps
          the contextually-relevant benefit visible without altering its
          weight. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-10">
        {pillars.map((p) => (
          <div
            key={p.key}
            className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4"
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

      {/* Pricing — narrowed and centered on desktop so it reads as one
          deliberate block rather than stretching across the six-card grid.
          Founding-primary + Monthly-secondary during the launch window;
          LAUNCH_OFFER === null → collapses to annual-primary using the same
          components without any downstream change. */}
      <div className="mx-auto max-w-[640px]">
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-7 sm:px-8">
          {LAUNCH_OFFER === "founding" ? (
            <FoundingHero onUpgrade={() => upgrade("founding")} canCheckout={!!PLAN_TARGET.founding} />
          ) : (
            <AnnualHero onUpgrade={() => upgrade("annual")} canCheckout={!!PLAN_TARGET.annual} />
          )}

        </div>

        <p className="mt-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
          Pro access works on web and in the GigDock app.
        </p>
      </div>
    </div>
  );
}

function FoundingHero({ onUpgrade, canCheckout }: { onUpgrade: () => void; canCheckout: boolean }) {
  return (
    <div className="text-center">
      <div className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-3 py-1 text-[11px] font-bold uppercase tracking-wide">
        Founding Member
      </div>

      {/* Price stack — the regular annual anchor sits on its own line above
          the founding price so the $99 → $49 relationship reads clearly.
          The $49 is intentionally the visually dominant number; the $99 is
          recognizable as the strike-through regular annual rate without
          competing for attention. */}
      <div className="mt-5 flex flex-col items-center gap-1">
        <div className="flex items-baseline gap-1 text-zinc-400 dark:text-zinc-500">
          <span className="text-xl line-through tabular-nums">
            {PRICING.annual.label}
          </span>
          <span className="text-sm line-through">
            {PRICING.annual.period}
          </span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-5xl sm:text-6xl font-extrabold text-zinc-900 dark:text-zinc-100 tabular-nums leading-none">
            {PRICING.founding.label}
          </span>
          <span className="text-lg font-semibold text-zinc-500 dark:text-zinc-400">
            {PRICING.founding.period}
          </span>
        </div>
      </div>

      <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-300 max-w-sm mx-auto leading-relaxed">
        {PRICING.founding.note}
      </p>
      <button
        onClick={onUpgrade}
        disabled={!canCheckout}
        className="mt-5 inline-flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400 px-8 py-3 text-sm font-semibold text-white"
      >
        Upgrade to GigDock Pro
      </button>
      {!canCheckout && <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">Checkout is not available yet. This is the planned founding offer.</p>}
    </div>
  );
}

function AnnualHero({ onUpgrade, canCheckout }: { onUpgrade: () => void; canCheckout: boolean }) {
  return (
    <div className="text-center">
      <div className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-3 py-1 text-[11px] font-bold uppercase tracking-wide">
        Annual
      </div>
      <div className="mt-5 flex items-baseline justify-center gap-1">
        <span className="text-5xl sm:text-6xl font-extrabold text-zinc-900 dark:text-zinc-100 tabular-nums leading-none">
          {PRICING.annual.label}
        </span>
        <span className="text-lg font-semibold text-zinc-500 dark:text-zinc-400">
          {PRICING.annual.period}
        </span>
      </div>
      <button
        onClick={onUpgrade}
        disabled={!canCheckout}
        className="mt-6 inline-flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400 px-8 py-3 text-sm font-semibold text-white"
      >
        Upgrade to GigDock Pro
      </button>
      {!canCheckout && <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">Checkout is not available yet.</p>}
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
