// Types and pure helpers for Subscription — safe to import from client
// components. The server-side loader lives in ./subscription.ts.

export type SubscriptionProvider =
  | "web"
  | "apple"
  | "google"
  | "partner"
  | "promo"
  | "admin"
  | "beta"
  | "unknown";

export type Subscription =
  | { kind: "free" }
  | {
      kind: "pro";
      state: "active_renewing" | "active_canceling" | "complimentary";
      provider: SubscriptionProvider;
      renewsAt: string | null;
      endsAt: string | null;
      priceLabel: string | null;
      note: string | null;
    };

export function providerLabel(p: SubscriptionProvider): string {
  return {
    web: "Web",
    apple: "Apple",
    google: "Google Play",
    partner: "Partner",
    promo: "Promotion",
    admin: "Admin",
    beta: "Beta",
    unknown: "",
  }[p];
}
