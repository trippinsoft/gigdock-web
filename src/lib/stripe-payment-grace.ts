export const PAYMENT_GRACE_SECONDS = 3 * 24 * 60 * 60;

export function proAccessForStripeStatus(
  status: string,
  periodEnd: number | undefined,
  latestInvoice: { created: number; status?: string } | null | undefined,
): { status: "active" | "trialing" | "expired" | "cancelled"; periodEnd: number | null; graceEndsAt: number | null } {
  if (status === "canceled") return { status: "cancelled", periodEnd: periodEnd ?? null, graceEndsAt: null };
  if (status === "active" || status === "trialing") {
    return { status, periodEnd: periodEnd ?? null, graceEndsAt: null };
  }
  if (status === "past_due") {
    // Grace is anchored to the failed renewal invoice, NOT each retry/webhook.
    // current_period_end is deliberately bounded so access expires by time
    // without waiting for another Stripe event or a scheduled cleanup job.
    if (!latestInvoice || !Number.isFinite(latestInvoice.created) || latestInvoice.created <= 0 ||
      latestInvoice.status === "paid") {
      throw new Error("Past-due subscription has no usable unpaid invoice");
    }
    const graceEndsAt = latestInvoice.created + PAYMENT_GRACE_SECONDS;
    return {
      status: "active",
      periodEnd: Math.min(periodEnd ?? graceEndsAt, graceEndsAt),
      graceEndsAt,
    };
  }
  return { status: "expired", periodEnd: periodEnd ?? null, graceEndsAt: null };
}
