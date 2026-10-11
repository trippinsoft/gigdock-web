export function getPreviewStripeKey(): string {
  if (process.env.VERCEL_ENV !== "preview") throw new Error("Stripe checkout is preview-only");
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key?.startsWith("sk_test_")) throw new Error("Stripe sandbox secret key is missing");
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
  const key = getPreviewStripeKey();
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
