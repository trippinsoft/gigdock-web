import assert from "node:assert/strict";
import { test } from "node:test";
import { isCancellationScheduledAtPeriodEnd } from "../src/lib/stripe-cancellation.ts";

const periodEnd = 1823379604;

test("Stripe portal cancellation with cancel_at matching period end is scheduled", () => {
  assert.equal(isCancellationScheduledAtPeriodEnd({
    status: "active", cancel_at_period_end: false, cancel_at: periodEnd,
  }, periodEnd), true);
});

test("uncancel clears scheduled state", () => {
  assert.equal(isCancellationScheduledAtPeriodEnd({
    status: "active", cancel_at_period_end: false, cancel_at: null,
  }, periodEnd), false);
});

test("native period-end flag remains supported", () => {
  assert.equal(isCancellationScheduledAtPeriodEnd({
    status: "active", cancel_at_period_end: true, cancel_at: null,
  }, periodEnd), true);
});

test("immediate cancellation is not scheduled", () => {
  assert.equal(isCancellationScheduledAtPeriodEnd({
    status: "canceled", cancel_at_period_end: false, cancel_at: null,
  }, periodEnd), false);
});

test("custom cancellation date is not misrepresented as period end", () => {
  assert.equal(isCancellationScheduledAtPeriodEnd({
    status: "active", cancel_at_period_end: false, cancel_at: periodEnd - 86400,
  }, periodEnd), false);
});
