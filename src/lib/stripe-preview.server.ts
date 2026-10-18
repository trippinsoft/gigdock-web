/** Fail-closed billing environment selection. A deployment must not accidentally use test money in production or live money in preview. */
export function getStripeKey(): string {
  const env = process.env.VERCEL_ENV;
  if (env !== "preview" && env !== "production") throw new Error("Stripe billing is disabled outside Vercel preview/production");
  if (env === "production" && process.env.STRIPE_BILLING_ENABLED !== "true") {
    throw new Error("Live Stripe billing has not been enabled");
  }
  const key = process.env.STRIPE_SECRET_KEY;
  const prefix = env === "production" ? "sk_live_" : "sk_test_";
  if (!key?.startsWith(prefix)) throw new Error("Stripe key does not match deployment environment");
  return key;
}

export function proPriceId(tier: "monthly" | "annual", founding: boolean): string {
  const name = tier === "monthly" ? "STRIPE_PRICE_PRO_MONTHLY"
    : founding ? "STRIPE_PRICE_PRO_FOUNDING_ANNUAL" : "STRIPE_PRICE_PRO_ANNUAL";
  const value = process.env[name];
  if (!value?.startsWith("price_")) throw new Error(name + " is not configured");
  return value;
}

export async function stripeRequest<T>(method: string, endpoint: string, body?: URLSearchParams, idempotencyKey?: string): Promise<T> {
  const key = getStripeKey();
  const response = await fetch("https://api.stripe.com/v1/" + endpoint, {
    method,
    headers: {
      Authorization: "Bearer " + key,
      ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: body?.toString(),
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || "Stripe request failed");
  return data as T;
}
