export type StripeCancellationState = {
  status: string;
  cancel_at_period_end: boolean;
  cancel_at?: number | null;
};

export function isCancellationScheduledAtPeriodEnd(
  subscription: StripeCancellationState,
  periodEnd: number | undefined,
): boolean {
  return subscription.status !== "canceled" && (
    subscription.cancel_at_period_end === true ||
    (typeof subscription.cancel_at === "number" &&
      typeof periodEnd === "number" &&
      subscription.cancel_at === periodEnd)
  );
}
