// Central GigDock Pro configuration. Pricing and the Pro pillar copy live here
// so nothing is hard-coded across the app (Part XIX). Entitlement itself is
// resolved from the `entitlements` table via has_active_entitlement — this file
// is presentation/config only.

export const PRICING = {
  currency: "USD",
  monthly: { amount: 7.99, label: "$7.99", period: "/mo" },
  annual: { amount: 69.99, label: "$69.99", period: "/yr", preferred: true, perMonth: "$5.83/mo" },
  founding: { amount: 49.99, label: "$49.99", period: "/yr", note: "Founding member — locked in while your subscription stays active" },
} as const;

/** The product id stored in `entitlements.product` that grants Pro. */
export const PRO_PRODUCT = "premium";

export type PillarKey = "history" | "insights" | "watches" | "documents" | "expenses" | "tax";

export const PRO_PILLARS: { key: PillarKey; title: string; blurb: string; icon: string }[] = [
  { key: "history", title: "Complete History", blurb: "Your complete gig, earnings and payment history — every year you've tracked.", icon: "history" },
  { key: "insights", title: "Advanced Insights", blurb: "Trends, comparisons, payment intelligence and personalized insights.", icon: "chart" },
  { key: "watches", title: "Advanced Watches", blurb: "Let GigDock actively monitor for the right opportunities for you.", icon: "bell" },
  { key: "documents", title: "Advanced Documents", blurb: "Connect and intelligently organize documents across your gig career.", icon: "doc" },
  { key: "expenses", title: "Expenses & Mileage", blurb: "Understand what it actually costs you to work.", icon: "receipt" },
  // Customer-facing paywall benefit groups reports + tax organization. The
  // feature/destination itself is branded "Tax Ready" (built later). GigDock
  // organizes records for tax time — it never prepares or files tax returns.
  { key: "tax", title: "Reports & Tax Organization", blurb: "Advanced reports and organized records to help you get ready for tax time.", icon: "file" },
];

/** Contextual paywall stories — the source that sent the user shapes the headline. */
export const PAYWALL_CONTEXT: Record<string, { headline: string; emphasize: PillarKey }> = {
  insights_history: { headline: "Understand your gig career", emphasize: "history" },
  insights_payment_aging: { headline: "See where your money is stuck", emphasize: "insights" },
  insights_gross_net: { headline: "Understand your gig career", emphasize: "insights" },
  today_pro_insight: { headline: "Understand your gig career", emphasize: "insights" },
  watch_activation: { headline: "Never miss the right opportunity", emphasize: "watches" },
  document_gig_association: { headline: "Make your documents part of your career record", emphasize: "documents" },
  expense_tracking: { headline: "Understand what it costs you to work", emphasize: "expenses" },
  tax_prep: { headline: "Get organized for tax time", emphasize: "tax" },
  report_export: { headline: "Turn your records into reports", emphasize: "insights" },
};
