// Server-side loader for the Settings → Plan panel.
//
// Reads the signed-in user's own `entitlements` row through the authenticated
// Supabase client (RLS scopes select to auth.uid()). Column set and current-
// entitlement rules match Draftbit mobile's utils/useEntitlement.js so both
// apps share one contract:
//
//   product ∈ ('pro','premium')          — legacy 'premium' is the same product
//   status  ∈ ('active','trialing')      — cancel-pending stays 'active', not
//                                          'canceled'; renewal-off is driven by
//                                          cancel_at_period_end (bool)
//   current_period_end null OR > now()   — evergreen (comp) OR still paid
//
// Feature gating still goes through has_active_entitlement / getPlan(). This
// loader adds presentation-only detail (renewal date, provider, cancel state,
// price label). It never mutates entitlements — the billing webhook remains
// authoritative for lifecycle changes.

import { cache } from "react";
import { createSupabaseServer } from "@/lib/supabase-server";
import { PRICING } from "@/lib/pricing";
import {
  isComplimentary,
  isUserManaged,
  normalizeProvider,
  type EntitlementRow,
  type Subscription,
} from "@/lib/subscription-types";

export type {
  Subscription,
  SubscriptionProvider,
  EntitlementRow,
} from "@/lib/subscription-types";
export {
  providerLabel,
  normalizeProvider,
  isUserManaged,
  isComplimentary,
} from "@/lib/subscription-types";

const CANONICAL_COLUMNS =
  "id,user_id,product,provider,status,current_period_end,cancel_at_period_end,canceled_at,price_id,plan_interval,started_at,metadata,updated_at";

function priceLabelFrom(row: EntitlementRow): string | null {
  const metadata = (row.metadata ?? {}) as Record<string, unknown>;
  if (typeof metadata.price_label === "string" && metadata.price_label.trim()) {
    return metadata.price_label;
  }
  // Prefer the structured plan_interval column, then a legacy metadata.tier.
  const interval = String(row.plan_interval ?? metadata.tier ?? "").toLowerCase();
  if (interval === "annual" || interval === "year" || interval === "yearly") {
    return `${PRICING.annual.label}${PRICING.annual.period}`;
  }
  if (interval === "monthly" || interval === "month") {
    return `${PRICING.monthly.label}${PRICING.monthly.period}`;
  }
  if (interval === "founding") {
    return `${PRICING.founding.label}${PRICING.founding.period} · Founding member`;
  }
  return null;
}

function noteFor(provider: string, metadata: Record<string, unknown>): string | null {
  if (typeof metadata.note === "string" && metadata.note.trim()) return metadata.note;
  const partner = metadata.partner_name ?? metadata.partner;
  if (typeof partner === "string" && partner.trim()) {
    return `Included through ${partner}`;
  }
  switch (provider) {
    case "beta":    return "Complimentary during beta";
    case "admin":   return "Complimentary — admin grant";
    case "partner": return "Complimentary — partner grant";
    case "promo":   return "Complimentary — promotion";
    default:        return null;
  }
}

function isCurrent(row: EntitlementRow): boolean {
  if (row.status !== "active" && row.status !== "trialing") return false;
  if (!row.current_period_end) return true;
  return new Date(row.current_period_end).getTime() > Date.now();
}

function summarize(row: EntitlementRow): Subscription {
  const provider = normalizeProvider(row.provider);
  const metadata = (row.metadata ?? {}) as Record<string, unknown>;

  if (isComplimentary(provider)) {
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

  if (!isUserManaged(provider)) {
    // Grants Pro through an unrecognized provider — feature access stands, but
    // we don't offer Cancel/Keep controls we can't back with a real portal.
    return {
      kind: "pro",
      state: "unmanaged",
      provider,
      renewsAt: null,
      endsAt: row.current_period_end,
      priceLabel: priceLabelFrom(row),
      note: null,
    };
  }

  if (row.cancel_at_period_end === true && row.current_period_end) {
    return {
      kind: "pro",
      state: "active_canceling",
      provider,
      renewsAt: null,
      endsAt: row.current_period_end,
      priceLabel: priceLabelFrom(row),
      note: null,
    };
  }

  return {
    kind: "pro",
    state: "active_renewing",
    provider,
    renewsAt: row.current_period_end,
    endsAt: null,
    priceLabel: priceLabelFrom(row),
    note: null,
  };
}

export const getSubscription = cache(async (): Promise<Subscription> => {
  try {
    const supabase = await createSupabaseServer();
    // RLS scopes the select to auth.uid(); we don't need to filter by user_id.
    // Pushing the current-entitlement rules into the query mirrors mobile.
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from("entitlements")
      .select(CANONICAL_COLUMNS)
      .in("product", ["pro", "premium"])
      .in("status", ["active", "trialing"])
      .or(`current_period_end.is.null,current_period_end.gt.${nowIso}`)
      .order("updated_at", { ascending: false });
    if (error || !data || data.length === 0) return { kind: "free" };
    // Guard against clock skew — re-check isCurrent client-side.
    const row = (data as EntitlementRow[]).find(isCurrent);
    if (!row) return { kind: "free" };
    return summarize(row);
  } catch {
    return { kind: "free" };
  }
});
