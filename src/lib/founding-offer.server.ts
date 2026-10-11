/**
 * Server-only founding promotion configuration.
 *
 * Set GIGDOCK_FOUNDING_OFFER_ENDS_AT to an ISO-8601 timestamp with timezone,
 * for example 2027-04-01T00:00:00-05:00. Extend the offer by changing that
 * setting in the deployment environment; no Stripe price change is needed.
 *
 * No value or an invalid value means the offer is CLOSED (fail-safe).
 * Checkout must evaluate this server-side immediately before creating a
 * Stripe session. The client-side paywall is not authoritative.
 */
export function getFoundingOfferEndsAt(): Date | null {
  const value = process.env.GIGDOCK_FOUNDING_OFFER_ENDS_AT;
  if (!value || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
    return null;
  }
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp) : null;
}

export function isFoundingOfferActive(now: Date = new Date()): boolean {
  const endsAt = getFoundingOfferEndsAt();
  return endsAt !== null && now.getTime() < endsAt.getTime();
}

/** Used for both $49 Pro annual and $19 annual Alerts-to-Pro upgrade. */
export function getAnnualProOfferForCheckout(now: Date = new Date()) {
  const founding = isFoundingOfferActive(now);
  return {
    founding,
    annualPriceCents: founding ? 4900 : 9900,
    annualAlertsUpgradeChargeCents: founding ? 1900 : 6900,
    annualRenewalPriceCents: founding ? 4900 : 9900,
  } as const;
}
