// Shared option vocabularies for the gig editor, matching the mobile app
// (global-functions/gigModeHelper.js and the pay-type codes).

export const GIG_MODES: { code: string; label: string }[] = [
  { code: "availability_checked", label: "Availability check" },
  { code: "booked", label: "Booked" },
  { code: "worked", label: "Worked" },
  { code: "paid", label: "Paid" },
];

// status_for_day uses the same vocabulary; 'worked' is the status that earns.
export const DAY_STATUSES = GIG_MODES;

export const PAY_TYPES: { code: string; label: string; hint: string }[] = [
  { code: "guaranteedMin", label: "Guaranteed minimum", hint: "Min pay for a set number of hours, then overtime" },
  { code: "hourly", label: "Hourly", hint: "A flat hourly rate" },
  { code: "flatRate", label: "Flat rate", hint: "One fixed amount for the whole gig" },
  { code: "dayRate", label: "Day rate", hint: "A fixed amount per day" },
];

export const PAYMENT_METHODS = [
  "Check",
  "Direct deposit",
  "Cash",
  "Venmo",
  "PayPal",
  "Zelle",
  "Payroll",
  "Other",
];

export function modeLabel(code: string | null | undefined): string {
  return GIG_MODES.find((m) => m.code === code)?.label ?? "Booked";
}
