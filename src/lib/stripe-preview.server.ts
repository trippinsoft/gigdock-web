import Stripe from "stripe";

export function getPreviewStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production" && !process.env.VERCEL_ENV) {
    throw new Error("GigDock Stripe checkout is restricted to Vercel preview");
  }
  if (!key?.startsWith("sk_test_")) throw new Error("Stripe sandbox key is not configured");
  return new Stripe(key);
}

export function proPriceId(tier: "monthly" | "annual", founding: boolean): string {
  const name = tier === "monthly"
    ? "STRIPE_PRICE_PRO_MONTHLY"
    : founding ? "STRIPE_PRICE_PRO_FOUNDING_ANNUAL" : "STRIPE_PRICE_PRO_ANNUAL";
  const value = process.env[name];
  if (!value?.startsWith("price_")) throw new Error(name + " is not configured");
  return value;
}
