// Shared entitlement/subscription contract for web. Mirrors the production
// Supabase `entitlements` table (migration
// 20260905033219_entitlements_subscription_management_fields) so the web app
// and the Draftbit mobile app can read the same rows with the same semantics.
// Keep in lockstep with mobile's utils/useEntitlement.js.
//
// Client-safe: no server imports. Server-side loader lives in ./subscription.ts.
//
// Canonical state semantics:
//   • cancel_at_period_end = false → active/trialing, will renew.
//   • cancel_at_period_end = true  → renewal canceled, Pro remains available
//                                    through current_period_end. Never revoke
//                                    access here — billing webhook is
//                                    authoritative for lifecycle changes.
//   • current_period_end controls paid-through/access expiry.
//   • provider is the billing source; it decides whether Manage/Keep controls
//     appear and where they lead.

export type EntitlementRow = {
  id: string;
  user_id: string;
  product: string;
  provider: string | null;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  canceled_at: string | null;
  price_id: string | null;
  plan_interval: string | null;
  started_at: string | null;
  metadata: Record<string, unknown> | null;
  updated_at: string | null;
};

/** Normalized billing source. Groups provider values and their aliases into
 * one canonical bucket, matching the spec in CLAUDE.md / docs. */
export type SubscriptionProvider =
  | "web"      // web · stripe
  | "apple"    // apple · ios · app_store · appstore · itunes
  | "google"   // google · play · play_store · playstore · google_play · android
  | "partner"
  | "promo"
  | "admin"
  | "beta"
  | "unknown";

/** One of five render states for Settings → Plan. */
export type Subscription =
  | { kind: "free" }
  | {
      kind: "pro";
      /** How the Plan panel should render:
       *   • active_renewing   — normal paid subscription, will renew.
       *   • active_canceling  — paid, renewal canceled, Pro through endsAt.
       *   • complimentary     — beta/admin/partner/promo grant; not
       *                         user-managed recurring billing.
       *   • unmanaged         — active Pro from an unrecognized provider;
       *                         show support fallback, no Cancel/Keep.
       */
      state: "active_renewing" | "active_canceling" | "complimentary" | "unmanaged";
      provider: SubscriptionProvider;
      /** Renewal date for active_renewing; null otherwise. */
      renewsAt: string | null;
      /** Paid-through date for active_canceling; also the comp-grant expiry. */
      endsAt: string | null;
      /** e.g. "$7.99/mo", "$49.99/yr · Founding member". null when unknown. */
      priceLabel: string | null;
      /** Free-form note for complimentary grants ("Complimentary during beta"). */
      note: string | null;
    };

const APPLE_ALIASES = new Set(["apple", "ios", "app_store", "appstore", "itunes"]);
const GOOGLE_ALIASES = new Set([
  "google",
  "play",
  "play_store",
  "playstore",
  "google_play",
  "android",
]);

export function normalizeProvider(raw: unknown): SubscriptionProvider {
  const v = String(raw ?? "").toLowerCase().trim();
  if (v === "web" || v === "stripe") return "web";
  if (APPLE_ALIASES.has(v)) return "apple";
  if (GOOGLE_ALIASES.has(v)) return "google";
  if (v === "beta") return "beta";
  if (v === "admin") return "admin";
  if (v === "partner") return "partner";
  if (v === "promo" || v === "promotion") return "promo";
  return "unknown";
}

/** Providers that represent user-managed recurring billing — the only ones
 * that should surface Cancel or Keep GigDock Pro affordances. */
export function isUserManaged(p: SubscriptionProvider): boolean {
  return p === "web" || p === "apple" || p === "google";
}

/** Providers that grant Pro without user-managed billing (complimentary). */
export function isComplimentary(p: SubscriptionProvider): boolean {
  return p === "beta" || p === "admin" || p === "partner" || p === "promo";
}

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
