import assert from "node:assert/strict";
import { test } from "node:test";
import { proAccessForStripeStatus, PAYMENT_GRACE_SECONDS } from "../src/lib/stripe-payment-grace.ts";
const renewal = 1792350000;
test("past_due grants only three days from the same failed invoice", () => {
 const a = proAccessForStripeStatus("past_due", renewal + 2592000, {created:renewal,status:"open"});
 assert.equal(a.status,"active");
 assert.equal(a.periodEnd,renewal + PAYMENT_GRACE_SECONDS);
 assert.equal(a.graceEndsAt,renewal + PAYMENT_GRACE_SECONDS);
});
test("retries do not extend original grace deadline", () => {
 const i = {created:renewal,status:"open"};
 assert.deepEqual(proAccessForStripeStatus("past_due",renewal+2592000,i),proAccessForStripeStatus("past_due",renewal+2592000,i));
});
test("paid recovery restores active renewal period and removes grace marker", () => {
 assert.deepEqual(proAccessForStripeStatus("active",renewal+2592000,{created:renewal,status:"paid"}),{status:"active",periodEnd:renewal+2592000,graceEndsAt:null});
});
test("missing past-due invoice fails rather than allowing indefinite access", () => {
 assert.throws(()=>proAccessForStripeStatus("past_due",renewal+2592000,null));
});
test("canceled subscription revokes access regardless of future nominal period", () => {
 assert.equal(proAccessForStripeStatus("canceled",renewal+2592000,null).status,"cancelled");
});
test("unpaid and incomplete are not granted grace", () => {
 for(const status of ["unpaid","incomplete","incomplete_expired","paused"]) assert.equal(proAccessForStripeStatus(status,renewal+2592000,null).status,"expired");
});
