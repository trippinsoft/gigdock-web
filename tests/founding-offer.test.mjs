import assert from "node:assert/strict";
import { after, test } from "node:test";
import {
  getFoundingOfferEndsAt,
  isFoundingOfferActive,
  getAnnualProOfferForCheckout,
} from "../src/lib/founding-offer.server.ts";

const prior = process.env.GIGDOCK_FOUNDING_OFFER_ENDS_AT;
after(() => {
  if (prior === undefined) delete process.env.GIGDOCK_FOUNDING_OFFER_ENDS_AT;
  else process.env.GIGDOCK_FOUNDING_OFFER_ENDS_AT = prior;
});

test("founding promotion is closed without a configured deadline", () => {
  delete process.env.GIGDOCK_FOUNDING_OFFER_ENDS_AT;
  assert.equal(getFoundingOfferEndsAt(), null);
  assert.equal(isFoundingOfferActive(), false);
  assert.deepEqual(getAnnualProOfferForCheckout(), {
    founding: false,
    annualPriceCents: 9900,
    annualAlertsUpgradeChargeCents: 6900,
    annualRenewalPriceCents: 9900,
  });
});

test("invalid or timezone-free deadline fails closed", () => {
  for (const value of ["invalid", "2027-04-01", "2027-04-01T00:00:00", "2027-99-99T00:00:00Z"]) {
    process.env.GIGDOCK_FOUNDING_OFFER_ENDS_AT = value;
    assert.equal(isFoundingOfferActive(new Date("2026-01-01T00:00:00Z")), false, value);
  }
});

test("offer remains open until, but not including, the cutoff instant", () => {
  process.env.GIGDOCK_FOUNDING_OFFER_ENDS_AT = "2027-04-01T00:00:00Z";
  assert.equal(isFoundingOfferActive(new Date("2027-03-31T23:59:59.999Z")), true);
  assert.equal(isFoundingOfferActive(new Date("2027-04-01T00:00:00Z")), false);
  assert.equal(isFoundingOfferActive(new Date("2027-04-01T00:00:00.001Z")), false);
});

test("founding and standard annual checkout amounts are correct", () => {
  process.env.GIGDOCK_FOUNDING_OFFER_ENDS_AT = "2027-04-01T00:00:00Z";
  assert.deepEqual(getAnnualProOfferForCheckout(new Date("2027-03-31T12:00:00Z")), {
    founding: true,
    annualPriceCents: 4900,
    annualAlertsUpgradeChargeCents: 1900,
    annualRenewalPriceCents: 4900,
  });
  assert.equal(getAnnualProOfferForCheckout(new Date("2027-04-02T00:00:00Z")).annualAlertsUpgradeChargeCents, 6900);
});

test("extending the single global deadline reopens founding pricing", () => {
  process.env.GIGDOCK_FOUNDING_OFFER_ENDS_AT = "2027-04-01T00:00:00Z";
  const now = new Date("2027-04-02T00:00:00Z");
  assert.equal(isFoundingOfferActive(now), false);
  process.env.GIGDOCK_FOUNDING_OFFER_ENDS_AT = "2027-05-01T00:00:00Z";
  assert.equal(isFoundingOfferActive(now), true);
});

test("explicit timezone offset is interpreted correctly", () => {
  process.env.GIGDOCK_FOUNDING_OFFER_ENDS_AT = "2027-04-01T00:00:00-05:00";
  assert.equal(getFoundingOfferEndsAt()?.toISOString(), "2027-04-01T05:00:00.000Z");
});
