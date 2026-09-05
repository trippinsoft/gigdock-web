// Subscription/plan summary for the Settings → Plan panel.
//
// Feature gating still goes through has_active_entitlement / getPlan(). This
// helper adds the presentation-only detail the Plan panel needs: source
// (web/Apple/Google/complimentary), renewal date, cancel-at-period-end state,
// and price label.
//
// Backed by the get_active_pro_entitlement RPC (SECURITY DEFINER). If that RPC
// is not deployed yet — or fails — we fall back to getPlan() so the panel
// still renders the correct Free vs Pro state, just without the extra detail.

import { cache } from "react";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getPlan } from "@/lib/backoffice";
import { PRICING } from "@/lib/pricing";
import type { Subscription, SubscriptionProvider } from "@/lib/subscription-types";

export type { Subscription, SubscriptionProvider } from "@/lib/subscription-types";
export { providerLabel } from "@/lib/subscription-types";

function normProvider(raw: unknown): SubscriptionProvider {
  const v = String(raw ?? "").toLowerCase();
  if (v === "web" || v === "stripe") return "web";
  if (v === "apple" || v === "app_store" || v === "appstore") return "apple";
  if (v === "google" || v === "play" || v === "google_play") return "google";
  if (v === "beta") return "beta";
  if (v === "admin") return "admin";
  if (v === "partner") return "partner";
  if (v === "promo" || v === "promotion") return "promo";
  return "unknown";
}

function priceLabelFrom(metadata: Record<string, unknown>): string | null {
  if (typeof metadata.price_label === "string") return metadata.price_label;
  const tier = metadata.tier;
  if (tier === "annual") return `${PRICING.annual.label}${PRICING.annual.period}`;
  if (tier === "monthly") return `${PRICING.monthly.label}${PRICING.monthly.period}`;
  if (tier === "founding") return `${PRICING.founding.label}${PRICING.founding.period} · Founding member`;
  return null;
}

function noteFor(provider: SubscriptionProvider, metadata: Record<string, unknown>): string | null {
  if (typeof metadata.note === "string" && metadata.note.trim()) return metadata.note as string;
  switch (provider) {
    case "beta":    return "Complimentary during beta";
    case "admin":   return "Complimentary — admin grant";
    case "partner": return "Complimentary — partner grant";
    case "promo":   return "Complimentary — promotion";
    default:        return null;
  }
}

type EntitlementRow = {
  product: string;
  provider: string | null;
  status: string;
  current_period_end: string | null;
  external_ref: string | null;
  metadata: Record<string, unknown> | null;
};

function summarize(row: EntitlementRow): Subscription {
  const provider = normProvider(row.provider);
  const complimentary = provider === "beta" || provider === "admin" || provider === "partner" || provider === "promo";
  const metadata = row.metadata ?? {};

  if (complimentary) {
    return {
      kind: "pro",
      state: "complimentary",
      provider,
      renewsAt: null,
      endsAt: row.current_period_end,
      priceLabel: null,
      note: noteFor(provider, metadata),
    };
  }

  // Cancel-at-period-end: Stripe leaves status='canceled' with a future
  // current_period_end during the cancel-pending window; some flows instead
  // keep status='active' and flag metadata.cancel_at_period_end.
  const canceling =
    row.status === "canceled" || metadata.cancel_at_period_end === true;

  if (canceling && row.current_period_end) {
    return {
      kind: "pro",
      state: "active_canceling",
      provider,
      renewsAt: null,
      endsAt: row.current_period_end,
      priceLabel: priceLabelFrom(metadata),
      note: null,
    };
  }

  return {
    kind: "pro",
    state: "active_renewing",
    provider,
    renewsAt: row.current_period_end,
    endsAt: null,
    priceLabel: priceLabelFrom(metadata),
    note: null,
  };
}

export const getSubscription = cache(async (): Promise<Subscription> => {
  try {
    const supabase = await createSupabaseServer();
    const { data, error } = await supabase.rpc("get_active_pro_entitlement");
    if (!error && data) return summarize(data as EntitlementRow);
    if (!error && data === null) return { kind: "free" };
    // fall through on rpc missing / error
  } catch {
    // fall through
  }
  // Fallback so the panel still shows the right Free/Pro state.
  const plan = await getPlan();
  if (plan === "pro") {
    return {
      kind: "pro",
      state: "active_renewing",
      provider: "unknown",
      renewsAt: null,
      endsAt: null,
      priceLabel: null,
      note: null,
    };
  }
  return { kind: "free" };
});

