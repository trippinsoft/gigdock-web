// Monetization analytics. Thin wrapper over track() so every Pro touchpoint
// fires a consistent event with a context tag. Event names match the mobile
// app (docs/analytics-funnel.md in gigvault) so both surfaces unify in one
// Amplitude funnel:
//   pro_feature_impression   — a Pro-only UI surface was rendered
//   pro_feature_tapped       — the user tapped a locked-Pro affordance
//   locked_feature_attempt   — an attempt to invoke a Pro-only action
//   paywall_open             — the paywall/Pro landing was shown
//   paywall_context          — the specific context that opened the paywall
//   pricing_view             — the pricing tiers were rendered
//   checkout_start           — the user started checkout (not yet live)
//   checkout_complete        — checkout returned successfully (not yet live)
//   founding_offer_selected  — web-only supplement: user picked the founding tier

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
  | "pro_feature_impression"
  | "pro_feature_tapped"
  | "locked_feature_attempt"
  | "paywall_open"
  | "paywall_context"
  | "pricing_view"
  | "checkout_start"
  | "checkout_complete"
  | "founding_offer_selected"
  | "subscription_canceled"
  | "subscription_reactivated";

export function trackPro(event: ProEvent, context: ProContextTag, extra: Record<string, unknown> = {}) {
  track(event, { context, ...extra });
}
