// Run: npx tsx src/lib/workFinancials.test.ts
//
// Pure-function tests for the shared Expense/Mileage helpers. The mobile
// origin file has an identical Node test suite; keep the two in sync when
// the calculation model evolves.

import assert from "node:assert/strict";
import {
  EXPENSE_CATEGORIES,
  categoryLabel,
  gigAssociationLabel,
  milesLabel,
  money,
  potentialMileageDeduction,
  rateForDate,
  summarizeWorkFinancials,
  type BusinessMileageRate,
} from "./workFinancials";

// --- 1. Category taxonomy is stable and complete -----------------------------

assert.equal(EXPENSE_CATEGORIES.length, 10, "Ten canonical categories");
assert.deepEqual(
  EXPENSE_CATEGORIES.map(([k]) => k),
  [
    "parking_tolls",
    "travel",
    "meals",
    "equipment",
    "wardrobe_appearance",
    "supplies",
    "software_subscriptions",
    "professional_services",
    "fees",
    "other",
  ],
);
assert.equal(categoryLabel("parking_tolls"), "Parking & Tolls");
assert.equal(categoryLabel("wardrobe_appearance"), "Wardrobe & Appearance");
assert.equal(
  categoryLabel("does_not_exist"),
  "Other",
  "unknown key falls back to Other",
);
assert.equal(categoryLabel(null), "Other");
assert.equal(categoryLabel(undefined), "Other");

// --- 2. Currency formatter ---------------------------------------------------

assert.equal(money(0), "$0.00");
assert.equal(money(5), "$5.00");
assert.equal(money(1234.5), "$1,234.50");
assert.equal(money(null), "$0.00");
assert.equal(money(undefined), "$0.00");
// A non-numeric string doesn't render as NaN.
assert.equal(money("not-a-number"), "$0.00");

// --- 3. milesLabel -----------------------------------------------------------

assert.equal(milesLabel(0), "0 mi");
assert.equal(milesLabel(15), "15 mi");
assert.equal(milesLabel(1234.56), "1,234.56 mi");
assert.equal(milesLabel(null), "0 mi");

// --- 4. rateForDate window semantics ----------------------------------------

const RATES: BusinessMileageRate[] = [
  {
    effective_from: "2025-01-01",
    effective_to: "2026-01-01",
    rate_per_mile: 0.7,
    source_url: null,
  },
  {
    effective_from: "2026-01-01",
    effective_to: "2026-07-01",
    rate_per_mile: 0.725,
    source_url: null,
  },
  {
    effective_from: "2026-07-01",
    effective_to: "2027-01-01",
    rate_per_mile: 0.76,
    source_url: null,
  },
];

// Inclusive lower bound.
assert.equal(rateForDate(RATES, "2026-01-01")?.rate_per_mile, 0.725);
// Exclusive upper bound.
assert.equal(rateForDate(RATES, "2026-07-01")?.rate_per_mile, 0.76);
// Historical rate.
assert.equal(rateForDate(RATES, "2025-06-15")?.rate_per_mile, 0.7);
// Beyond published rates — must return null so the UI shows "Rate unavailable".
assert.equal(rateForDate(RATES, "2027-01-01"), null);
assert.equal(rateForDate(RATES, "2024-12-31"), null);
assert.equal(rateForDate(RATES, null), null);
assert.equal(rateForDate([], "2026-05-01"), null);

// --- 5. potentialMileageDeduction -------------------------------------------

assert.equal(potentialMileageDeduction(100, "2025-06-01", RATES), 70);
assert.equal(potentialMileageDeduction(100, "2026-02-01", RATES), 72.5);
assert.equal(potentialMileageDeduction(100, "2026-08-15", RATES), 76);
assert.equal(
  potentialMileageDeduction(50, "2028-01-01", RATES),
  null,
  "future date with no rate must be null (never zero)",
);
// Non-numeric miles is safely null — mobile returns NaN in the same case,
// which the panel would render as "$NaN"; the web port explicitly returns
// null so the caller shows "Rate unavailable" or hides the line instead.
assert.equal(
  potentialMileageDeduction("junk", "2026-01-15", RATES),
  null,
);

// --- 6. summarizeWorkFinancials ---------------------------------------------

const summary = summarizeWorkFinancials(
  [
    { amount: 25.5, category_key: "meals" },
    { amount: 10, category_key: "parking_tolls" },
    { amount: 14.99, category_key: "meals" },
  ],
  [
    { miles: 20, trip_date: "2026-02-10" },
    { miles: 5, trip_date: "2026-08-15" },
  ],
  RATES,
  200, // gross earnings
);
assert.equal(summary.actualExpenses, 50.49);
assert.equal(summary.businessMiles, 25);
assert.equal(summary.categoryTotals.meals, 40.49);
assert.equal(summary.categoryTotals.parking_tolls, 10);
// 20 × 0.725 = 14.5; 5 × 0.76 = 3.8; total 18.30.
assert.equal(summary.potentialDeduction, 18.3);
// Net = 200 - 50.49 = 149.51.
assert.equal(summary.netBeforeTaxes, 149.51);

// --- 7. summarizeWorkFinancials — missing rate poisons the potential -------

const partial = summarizeWorkFinancials(
  [],
  [
    { miles: 10, trip_date: "2026-02-10" }, // has rate
    { miles: 10, trip_date: "2100-01-01" }, // no rate
  ],
  RATES,
);
assert.equal(
  partial.potentialDeduction,
  null,
  "any missing rate must poison the aggregate potential deduction",
);
assert.equal(partial.actualExpenses, 0);
assert.equal(partial.businessMiles, 20);
assert.equal(partial.netBeforeTaxes, null, "no gross → no net");

// --- 8. Empty inputs ---------------------------------------------------------

const empty = summarizeWorkFinancials([], [], RATES, 0);
assert.equal(empty.actualExpenses, 0);
assert.equal(empty.businessMiles, 0);
assert.deepEqual(empty.categoryTotals, {});
assert.equal(
  empty.potentialDeduction,
  0,
  "no trips → 0 deduction (not null), matches mobile",
);
assert.equal(empty.netBeforeTaxes, 0);

// --- 9. gigAssociationLabel -------------------------------------------------

assert.equal(gigAssociationLabel(null), "General business");
assert.equal(gigAssociationLabel(null, "General"), "General");
assert.equal(gigAssociationLabel({ title: "Day 1" }), "Day 1");
assert.equal(
  gigAssociationLabel({ title: "Day 1", project_title: "Tulsa King" }),
  "Tulsa King — Day 1",
);

console.log("workFinancials tests passed");
