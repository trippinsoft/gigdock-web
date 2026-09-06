// Additional Pay type catalog. Source of truth for both the label mapping
// and the option list — mirrors mobile's TYPE_OPTIONS in
// components/GigBumpsBlock.js. Stored bump_type values are unchanged
// (car / fitting / gas / props / other) so mobile and web read/write the
// same records.

export type AdditionalPayType = "car" | "fitting" | "gas" | "props" | "other";

export const ADDITIONAL_PAY_TYPES: { value: AdditionalPayType; label: string }[] = [
  { value: "fitting", label: "Wardrobe / Fitting" },
  { value: "car", label: "Car" },
  { value: "gas", label: "Gas" },
  { value: "props", label: "Props" },
  { value: "other", label: "Other" },
];

/** Compact per-row label used in lists / summaries. Keeps the industry
 *  "bump" suffix on background types; renders "Other additional pay"
 *  for the catch-all. */
export function additionalPayTypeLabel(rawType: string): string {
  const t = (rawType ?? "").trim().toLowerCase();
  if (!t) return "Additional pay";
  if (t === "other") return "Other additional pay";
  if (t === "fitting") return "Wardrobe / fitting bump";
  const head = t.charAt(0).toUpperCase() + t.slice(1);
  return `${head} bump`;
}

/** Full type-picker label (matches mobile's TYPE_OPTIONS labels verbatim). */
export function additionalPayTypeOptionLabel(value: string): string {
  return ADDITIONAL_PAY_TYPES.find((o) => o.value === value)?.label ?? "Other";
}
