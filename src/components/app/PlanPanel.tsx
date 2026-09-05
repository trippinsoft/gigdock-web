"use client";

// Settings → Plan. Renders one of five states from a Subscription summary:
//   • Free                       → GigDock + Upgrade CTA
//   • Pro (active renewing)      → GigDock Pro + price + Renews [date] +
//                                  Manage subscription (provider portal).
//   • Pro (renewal canceled)     → GigDock Pro + Renewal canceled + Pro
//                                  through [date] + Keep GigDock Pro
//                                  (routes to the provider portal so the
//                                  user can reverse without waiting).
//   • Pro (complimentary)        → GigDock Pro + note (Complimentary during
//                                  beta / admin / partner / promo). No
//                                  Cancel or Keep — non-user-managed grants
//                                  don't offer user-managed cancellation.
//   • Pro (unmanaged provider)   → GigDock Pro + support-fallback line. No
//                                  Cancel or Keep — we don't wire portals
//                                  we can't actually route to.
//
// Provider portals (mobile + web share the same normalization):
//   • web    → /account/billing (Stripe customer portal lands here later)
//   • apple  → https://apps.apple.com/account/subscriptions
//   • google → https://play.google.com/store/account/subscriptions
//
// The panel never mutates entitlements. Cancel/resume happens in the provider
// portal; the billing webhook syncs state back to the entitlements row.

import Link from "next/link";
import { trackPro } from "@/lib/monetization";
import {
  isUserManaged,
  providerLabel,
  type Subscription,
  type SubscriptionProvider,
} from "@/lib/subscription-types";

const WEB_BILLING_PATH = "/account/billing";
const APPLE_URL = "https://apps.apple.com/account/subscriptions";
const GOOGLE_URL = "https://play.google.com/store/account/subscriptions";

function longDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function billingHomeLabel(p: SubscriptionProvider): string {
  if (p === "apple") return "Managed through Apple";
  if (p === "google") return "Managed through Google Play";
  if (p === "web") return "Managed on the web";
  return providerLabel(p) ? `Managed by ${providerLabel(p)}` : "";
}

/** Where Manage/Keep buttons should send the user, per provider. */
function providerPortal(p: SubscriptionProvider): { kind: "internal" | "external"; href: string } | null {
  if (p === "web") return { kind: "internal", href: WEB_BILLING_PATH };
  if (p === "apple") return { kind: "external", href: APPLE_URL };
  if (p === "google") return { kind: "external", href: GOOGLE_URL };
  return null;
}

export default function PlanPanel({ subscription }: { subscription: Subscription }) {
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
  const portal = providerPortal(provider);
  const secondary = billingHomeLabel(provider);

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
              {priceLabel ? priceLabel : "Your subscription is active."}
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

        {state === "unmanaged" && (
          <>
            <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">Your subscription is active.</div>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              This subscription isn&rsquo;t managed from within GigDock. If you need to make changes, email{" "}
              <a href="mailto:gigdocksupport@gmail.com" className="text-blue-600 dark:text-blue-400 hover:underline">
                gigdocksupport@gmail.com
              </a>
              .
            </p>
          </>
        )}

        {secondary && state !== "complimentary" && state !== "unmanaged" && (
          <div className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">{secondary}</div>
        )}

        {isUserManaged(provider) && portal && state === "active_renewing" && (
          <div className="mt-3">
            <PortalLink portal={portal} label="Manage subscription" />
          </div>
        )}

        {isUserManaged(provider) && portal && state === "active_canceling" && (
          <div className="mt-3">
            <PortalLink portal={portal} label="Keep GigDock Pro" primary />
          </div>
        )}
      </div>
    </Card>
  );
}

function PortalLink({
  portal,
  label,
  primary,
}: {
  portal: { kind: "internal" | "external"; href: string };
  label: string;
  primary?: boolean;
}) {
  const cls = primary
    ? "inline-flex items-center h-9 px-3 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
    : "inline-flex items-center h-9 px-3 rounded-lg text-sm font-medium border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors";
  if (portal.kind === "external") {
    return (
      <a href={portal.href} target="_blank" rel="noopener noreferrer" className={cls}>
        {label}
      </a>
    );
  }
  return (
    <Link href={portal.href} className={cls}>
      {label}
    </Link>
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
