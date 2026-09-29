// Central GigDock Pro configuration. Prices and the customer-facing Pro
// pillar copy live here so nothing is hard-coded across the app. Entitlement
// itself is resolved from the `entitlements` table via has_active_entitlement
// — this file is presentation/config only.
//
// Launch pricing model
// --------------------
// During the Founding Member launch, purchasing surfaces present TWO choices:
//
//   PRIMARY   FOUNDING MEMBER      $49/year (with $99/year struck through as
//                                  the future/regular annual rate)
//   SECONDARY MONTHLY              $9.99/month, cancel anytime
//
// `annual` remains as an anchor row so post-launch we can flip
// `LAUNCH_OFFER` to null and reuse the same components for the regular $99
// annual price. `annual` is NOT a competing selectable plan while
// LAUNCH_OFFER === "founding" — its label is the strike-through anchor.

export const PRICING = {
  currency: "USD",
  monthly: {
    amount: 9.99,
    label: "$9.99",
    period: "/month",
    cta: "Cancel anytime.",
  },
  annual: {
    amount: 99,
    label: "$99",
    period: "/year",
  },
  founding: {
    amount: 49,
    label: "$49",
    period: "/year",
    note: "Lock in your Founding Member rate while your membership remains active.",
  },
} as const;

/** Which offer is primary right now. When null the annual/monthly pair is the
 *  standard two-choice presentation. Flip to null after the Founding window
 *  closes; no code changes are needed downstream. */
export const LAUNCH_OFFER: "founding" | null = "founding";

/** The product id stored in `entitlements.product` that grants Pro.
 *  Live rows use "pro". The has_active_entitlement RPC also treats the older
 *  "premium" id as the same product — do not invent a second paid SKU. */
export const PRO_PRODUCT = "pro";

export type PillarKey =
  | "history"
  | "insights"
  | "alerts"
  | "documents"
  | "expenses"
  | "tax";

// The canonical six benefits shared with mobile. Copy is customer-facing;
// keep both platforms in lockstep.
export const PRO_PILLARS: {
  key: PillarKey;
  title: string;
  blurb: string;
  icon: string;
}[] = [
  {
    key: "history",
    title: "Complete History",
    blurb: "Your full gig and payment history.",
    icon: "history",
  },
  {
    key: "insights",
    title: "Advanced Insights",
    blurb: "Understand your earnings, payments, costs, and patterns.",
    icon: "chart",
  },
  {
    key: "alerts",
    title: "Alerts",
    blurb: "Get notified about opportunities you don't want to miss.",
    icon: "bell",
  },
  {
    key: "documents",
    title: "Advanced Documents",
    blurb: "Keep your work records connected and organized.",
    icon: "doc",
  },
  {
    key: "expenses",
    title: "Expenses & Mileage",
    blurb: "Understand what it actually costs you to work.",
    icon: "receipt",
  },
  {
    key: "tax",
    title: "Reports & Tax Organization",
    blurb: "Turn your records into reports and stay organized for tax time.",
    icon: "file",
  },
];

/** Contextual paywall stories — the source that sent the user shapes the
 *  headline. The default when a context isn't in this map is the canonical
 *  top-line headline "Get more from every gig". */
export const PAYWALL_CONTEXT: Record<
  string,
  { headline: string; emphasize: PillarKey }
> = {
  insights_history: {
    headline: "Understand your gig career",
    emphasize: "history",
  },
  insights_payment_aging: {
    headline: "See where your money is stuck",
    emphasize: "insights",
  },
  insights_gross_net: {
    headline: "Understand your gig career",
    emphasize: "insights",
  },
  today_pro_insight: {
    headline: "Understand your gig career",
    emphasize: "insights",
  },
  // Analytics tag `watch_activation` predates the "Alerts" rename and is
  // preserved to avoid fragmenting the existing funnel; the customer-facing
  // headline and the emphasized pillar are on the new "Alerts" terminology.
  watch_activation: {
    headline: "Never miss the right opportunity",
    emphasize: "alerts",
  },
  document_gig_association: {
    headline: "Make your documents part of your career record",
    emphasize: "documents",
  },
  expense_tracking: {
    headline: "Understand what it costs you to work",
    emphasize: "expenses",
  },
  tax_prep: {
    headline: "Get organized for tax time",
    emphasize: "tax",
  },
  report_export: {
    headline: "Get more from every gig",
    emphasize: "tax",
  },
};

/** Canonical top-level Pro headline + supporting copy. Both mobile and web
 *  use the same string. */
export const PRO_HEADLINE = "Get more from every gig";
export const PRO_SUBHEAD =
  "Know what you're really making, keep your complete work history, find more opportunities, and stay organized for tax time.";
