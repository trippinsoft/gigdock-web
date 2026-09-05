"use client";

// Settings → Plan. Renders one of four states from a Subscription summary:
//   • Free                    → GigDock + Upgrade CTA
//   • Pro (active, renewing)  → GigDock Pro + price + Renews [date] + Manage
//   • Pro (renewal canceled)  → GigDock Pro + Renewal canceled + Pro through
//                               [date] + Keep GigDock Pro (resubscribe path)
//   • Pro (complimentary)     → GigDock Pro + note (Complimentary during beta)
//
// Manage subscription and Keep GigDock Pro route to the correct provider:
//   • web    → Stripe customer portal (server action lands with billing).
//   • apple  → https://apps.apple.com/account/subscriptions
//   • google → https://play.google.com/store/account/subscriptions
//   • other  → read-only info line ("Managed by …").
//
// Real self-service billing is not connected yet (see CLAUDE.md — checkout is
// intentionally off). Until it is, the web-provider Manage/Keep buttons open a
// small in-page notice pointing at support. When billing goes live, only the
// two `onWebManage` / `onWebResubscribe` handlers need to switch from the
// notice to a real portal redirect.

import { useState } from "react";
import Link from "next/link";
import { trackPro } from "@/lib/monetization";
import { providerLabel, type Subscription, type SubscriptionProvider } from "@/lib/subscription-types";

const APPLE_URL = "https://apps.apple.com/account/subscriptions";
const GOOGLE_URL = "https://play.google.com/store/account/subscriptions";

function longDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

/** Provider name in the "Managed by …" line. */
function billedThroughLabel(p: SubscriptionProvider): string {
  if (p === "apple") return "Managed through Apple";
  if (p === "google") return "Managed through Google Play";
  if (p === "web") return "Managed on the web";
  if (p === "beta" || p === "admin" || p === "partner" || p === "promo") return "";
  return providerLabel(p) ? `Managed by ${providerLabel(p)}` : "";
}

export default function PlanPanel({ subscription }: { subscription: Subscription }) {
  const [notice, setNotice] = useState<string | null>(null);

  if (subscription.kind === "free") {
    return (
      <Card>
        <div className="flex items-start justify-between gap-3 px-4 py-4">
          <div className="min-w-0">
            <div className="text-base font-semibold text-zinc-900 dark:text-zinc-100">GigDock</div>
            <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">Upgrade to GigDock Pro for advanced insights, watches, and reports.</p>
          </div>
          <Link
            href="/pro?from=account"
            onClick={() => trackPro("pro_feature_tapped", "account")}
            className="shrink-0 inline-flex items-center gap-1 h-9 px-3 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
          >
            Upgrade to Pro →
          </Link>
        </div>
      </Card>
    );
  }

  const { state, provider, renewsAt, endsAt, priceLabel, note } = subscription;
  const showManage = provider === "web" || provider === "apple" || provider === "google";
  const secondary = billedThroughLabel(provider);

  function openWebPortal(kind: "manage" | "resubscribe") {
    if (kind === "resubscribe") trackPro("subscription_reactivated", "account");
    setNotice(
      "Self-service billing management arrives when GigDock Pro launches with paid subscriptions. In the meantime, email gigdocksupport@gmail.com and we'll take care of it."
    );
  }

  function manageAction() {
    if (provider === "web") return { onClick: () => openWebPortal("manage"), label: "Manage subscription" } as const;
    if (provider === "apple") return { href: APPLE_URL, label: "Manage in Apple" } as const;
    if (provider === "google") return { href: GOOGLE_URL, label: "Manage in Google Play" } as const;
    return null;
  }

  function keepAction() {
    if (provider === "web") return { onClick: () => openWebPortal("resubscribe"), label: "Keep GigDock Pro" } as const;
    if (provider === "apple") return { href: APPLE_URL, label: "Manage in Apple" } as const;
    if (provider === "google") return { href: GOOGLE_URL, label: "Manage in Google Play" } as const;
    return null;
  }

  return (
    <Card>
      <div className="px-4 py-4">
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold text-zinc-900 dark:text-zinc-100">GigDock Pro</span>
          <ProCheck />
        </div>

        {state === "active_renewing" && (
          <>
            <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              {priceLabel ? <>{priceLabel}</> : <>Your subscription is active.</>}
            </div>
            {renewsAt && (
              <div className="text-sm text-zinc-500 dark:text-zinc-400">Renews {longDate(renewsAt)}</div>
            )}
          </>
        )}

        {state === "active_canceling" && (
          <>
            <div className="mt-1 text-sm font-medium text-amber-600 dark:text-amber-400">Renewal canceled</div>
            {endsAt && (
              <div className="text-sm text-zinc-500 dark:text-zinc-400">Pro access through {longDate(endsAt)}</div>
            )}
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
              You won&rsquo;t be charged again. Keep GigDock Pro to continue past that date without a gap.
            </p>
          </>
        )}

        {state === "complimentary" && (
          <>
            {note && <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{note}</div>}
            {endsAt && (
              <div className="text-sm text-zinc-500 dark:text-zinc-400">Through {longDate(endsAt)}</div>
            )}
          </>
        )}

        {secondary && state !== "complimentary" && (
          <div className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">{secondary}</div>
        )}

        {showManage && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {state === "active_canceling" && (
              <ActionButton {...keepAction()!} primary />
            )}
            {state === "active_renewing" && (
              <ActionButton {...manageAction()!} />
            )}
          </div>
        )}

        {notice && (
          <div
            role="status"
            className="mt-3 rounded-lg border border-blue-200 dark:border-blue-900/40 bg-blue-50/70 dark:bg-blue-950/20 px-3 py-2 text-sm text-blue-800 dark:text-blue-200"
          >
            {notice}
          </div>
        )}
      </div>
    </Card>
  );
}

function ActionButton(
  props:
    | { onClick: () => void; label: string; primary?: boolean }
    | { href: string; label: string; primary?: boolean }
) {
  const cls = props.primary
    ? "inline-flex items-center h-9 px-3 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
    : "inline-flex items-center h-9 px-3 rounded-lg text-sm font-medium border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors";
  if ("href" in props) {
    return (
      <a href={props.href} target="_blank" rel="noopener noreferrer" className={cls}>
        {props.label}
      </a>
    );
  }
  return (
    <button onClick={props.onClick} className={cls}>
      {props.label}
    </button>
  );
}

function ProCheck() {
  return (
    <span
      aria-hidden
      className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="m5 12 5 5L20 7" />
      </svg>
    </span>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
      <h2 className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 border-b border-zinc-100 dark:border-zinc-800">
        Plan
      </h2>
      {children}
    </section>
  );
}
