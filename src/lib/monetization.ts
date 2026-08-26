// Monetization analytics (Part XXIV). Thin wrapper over the existing analytics
// track() so every Pro touchpoint fires a consistent event with a context tag.
// Instrumenting from day one tells us which Pro pillars actually convert.

import { track } from "@/lib/analytics";

export type ProContextTag =
  | "insights_history"
  | "insights_payment_aging"
  | "insights_gross_net"
  | "today_pro_insight"
  | "watch_activation"
  | "document_gig_association"
  | "expense_tracking"
  | "tax_prep"
  | "report_export"
  | "account"
  | "nav";

export type ProEvent =
  | "pro_preview_impression"
  | "pro_preview_clicked"
  | "locked_feature_attempted"
  | "paywall_opened"
  | "pricing_viewed"
  | "checkout_initiated"
  | "checkout_completed"
  | "founding_offer_selected"
  | "subscription_canceled"
  | "subscription_reactivated";

export function trackPro(event: ProEvent, context: ProContextTag, extra: Record<string, unknown> = {}) {
  track(event, { context, ...extra });
}
