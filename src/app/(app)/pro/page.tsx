"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PRICING, PRO_PILLARS, PAYWALL_CONTEXT } from "@/lib/pricing";
import { trackPro, type ProContextTag } from "@/lib/monetization";
import { ProBadge, useIsPro } from "@/components/app/pro";

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
  const [selected, setSelected] = useState<"annual" | "monthly" | "founding">("annual");
  const [notified, setNotified] = useState(false);

  useEffect(() => {
    trackPro("paywall_opened", from);
    trackPro("pricing_viewed", from);
  }, [from]);

  if (isPro) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <ProBadge />
        <h1 className="mt-3 text-2xl font-bold text-zinc-900 dark:text-zinc-100">You&rsquo;re on GigDock Pro</h1>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400">Complete history, advanced insights, watches, documents, expenses, reports and tax organization are all unlocked — on web and in the app.</p>
      </div>
    );
  }

  function upgrade() {
    trackPro("checkout_initiated", from, { tier: selected });
    if (selected === "founding") trackPro("founding_offer_selected", from);
    setNotified(true);
  }

  // Order pillars so the one that sent the user leads.
  const pillars = [...PRO_PILLARS].sort((a, b) => (a.key === emphasize ? -1 : b.key === emphasize ? 1 : 0));

  return (
    <div className="max-w-4xl mx-auto py-6">
      <div className="text-center mb-8">
        <ProBadge />
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">{story?.headline ?? "GigDock Pro"}</h1>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto">
          Advanced tools to organize, automate, understand and manage your entire gig career. Everything in Free stays free.
        </p>
      </div>

      {/* Pillars */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
        {pillars.map((p) => (
          <div key={p.key} className={`rounded-2xl border p-4 ${p.key === emphasize ? "border-violet-300 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/20" : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"}`}>
            <div className="flex items-center gap-2">
              <span className="text-violet-600 dark:text-violet-400"><PillarIcon icon={p.icon} /></span>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{p.title}</h3>
            </div>
            <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{p.blurb}</p>
          </div>
        ))}
      </div>

      {/* Pricing */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-4">Choose your plan</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <PlanCard tier="annual" selected={selected === "annual"} onSelect={() => setSelected("annual")} title="Annual" price={PRICING.annual.label} period={PRICING.annual.period} sub={PRICING.annual.perMonth} badge="Best value" />
          <PlanCard tier="monthly" selected={selected === "monthly"} onSelect={() => setSelected("monthly")} title="Monthly" price={PRICING.monthly.label} period={PRICING.monthly.period} />
          <PlanCard tier="founding" selected={selected === "founding"} onSelect={() => setSelected("founding")} title="Founding member" price={PRICING.founding.label} period={PRICING.founding.period} sub="Locked in while active" badge="Launch offer" />
        </div>

        {notified ? (
          <div className="mt-5 rounded-xl border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/30 px-4 py-3 text-sm text-green-700 dark:text-green-300">
            Thanks! GigDock Pro checkout is not live yet — we&rsquo;ll let you know the moment you can upgrade at this price.
          </div>
        ) : (
          <>
            <p className="mt-5 text-center text-sm text-zinc-500 dark:text-zinc-400">
              Checkout is not open yet. Prices above are the planned launch rates — no charge today.
            </p>
            <button onClick={upgrade} className="mt-3 w-full rounded-xl bg-violet-600 hover:bg-violet-700 px-5 py-3 text-sm font-semibold text-white">
              Notify me when I can upgrade
            </button>
          </>
        )}
        <p className="mt-3 text-center text-xs text-zinc-400 dark:text-zinc-500">
          Pro will work everywhere — buy on web or in the app, you&rsquo;re Pro on both. Cancel anytime.
        </p>
      </div>
    </div>
  );
}

function PlanCard({
  selected, onSelect, title, price, period, sub, badge,
}: {
  tier: string; selected: boolean; onSelect: () => void; title: string; price: string; period: string; sub?: string; badge?: string;
}) {
  return (
    <button onClick={onSelect} className={`text-left rounded-xl border p-4 transition-colors ${selected ? "border-violet-500 dark:border-violet-500 bg-violet-50/60 dark:bg-violet-950/20 ring-1 ring-violet-500" : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{title}</span>
        {badge && <span className="text-[10px] font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-400">{badge}</span>}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{price}</span>
        <span className="text-sm text-zinc-400 dark:text-zinc-500">{period}</span>
      </div>
      {sub && <div className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">{sub}</div>}
    </button>
  );
}

function PillarIcon({ icon }: { icon: string }) {
  const common = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (icon) {
    case "history": return <svg {...common}><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l3 2" /></svg>;
    case "chart": return <svg {...common}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>;
    case "bell": return <svg {...common}><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>;
    case "doc": return <svg {...common}><path d="M14 3v5h5" /><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /></svg>;
    case "receipt": return <svg {...common}><path d="M4 3v18l3-2 3 2 3-2 3 2 3-2V3l-3 2-3-2-3 2-3-2-3 2Z" /><path d="M8 8h8M8 12h6" /></svg>;
    default: return <svg {...common}><path d="M14 3v5h5" /><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M9 13h6M9 17h4" /></svg>;
  }
}
