// Stripe Customer Portal handoff for Settings → Plan → Manage subscription.
//
// The customer is taken from Stripe, never from client input or entitlement
// metadata alone. The signed-in user's own entitlement row (RLS scopes the
// select to auth.uid()) names a Stripe subscription. Stripe must confirm that
// subscription was created for this user (metadata.supabase_user_id, set at
// checkout) before a portal session opens for its customer. A user can
// therefore only ever reach the portal for their own subscription.
//
// Kept free of Next imports so tests/billing-portal.test.mjs can exercise it
// directly with fake Supabase and Stripe transports.

import type { SupabaseClient } from "@supabase/supabase-js";

export type BillingPortalFailure =
  | "no_subscription"
  | "not_owner"
  | "portal_unavailable";

export type BillingPortalResult =
  | { ok: true; url: string }
  | { ok: false; reason: BillingPortalFailure };

export type StripeRequest = <T>(method: string, endpoint: string, body?: URLSearchParams) => Promise<T>;

type StripeSubscription = {
  id: string;
  customer: string | { id: string } | null;
  metadata?: Record<string, string>;
};

type EntitlementRef = {
  external_ref: string | null;
  metadata: Record<string, unknown> | null;
};

const STRIPE_PROVIDERS = ["stripe", "web"];

export async function createBillingPortalSession(input: {
  supabase: SupabaseClient;
  userId: string;
  returnUrl: string;
  stripe: StripeRequest;
}): Promise<BillingPortalResult> {
  const { supabase, userId, returnUrl, stripe } = input;

  const { data, error } = await supabase
    .from("entitlements")
    .select("external_ref,metadata")
    .eq("user_id", userId)
    .in("product", ["pro", "premium"])
    .in("provider", STRIPE_PROVIDERS)
    .in("status", ["active", "trialing"])
    .or(`current_period_end.is.null,current_period_end.gt.${new Date().toISOString()}`)
    .order("updated_at", { ascending: false })
    .limit(1);
  if (error) throw error;

  const row = (data as EntitlementRef[] | null)?.[0];
  const subscriptionId = row?.external_ref;
  if (!subscriptionId || !subscriptionId.startsWith("sub_")) {
    return { ok: false, reason: "no_subscription" };
  }

  let subscription: StripeSubscription;
  try {
    subscription = await stripe<StripeSubscription>(
      "GET",
      `subscriptions/${encodeURIComponent(subscriptionId)}`
    );
  } catch (e) {
    console.error("[billing] subscription lookup failed", e);
    return { ok: false, reason: "portal_unavailable" };
  }

  const customer =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id ?? null;
  const recordedCustomer = row?.metadata?.stripe_customer_id;
  if (
    subscription.metadata?.supabase_user_id !== userId ||
    !customer ||
    (typeof recordedCustomer === "string" && recordedCustomer !== customer)
  ) {
    return { ok: false, reason: "not_owner" };
  }

  try {
    const session = await stripe<{ url?: string }>(
      "POST",
      "billing_portal/sessions",
      new URLSearchParams({ customer, return_url: returnUrl })
    );
    if (!session.url) return { ok: false, reason: "portal_unavailable" };
    return { ok: true, url: session.url };
  } catch (e) {
    // e.g. the sandbox has no saved Customer Portal configuration.
    console.error("[billing] portal session failed", e);
    return { ok: false, reason: "portal_unavailable" };
  }
}
