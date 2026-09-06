// Additional Pay type catalog. Source of truth for both the label mapping
// and the option list — mirrors mobile's TYPE_OPTIONS in
// components/GigBumpsBlock.js exactly, so dropdowns and list rows read
// identically on web and mobile. Stored bump_type values are unchanged
// (car / fitting / gas / props / other), so mobile and web read/write
// the same records.

export type AdditionalPayType = "car" | "fitting" | "gas" | "props" | "other";

export const ADDITIONAL_PAY_TYPES: { value: AdditionalPayType; label: string }[] = [
  { value: "fitting", label: "Wardrobe / fitting bump" },
  { value: "car", label: "Car bump" },
  { value: "gas", label: "Gas bump" },
  { value: "props", label: "Props bump" },
  { value: "other", label: "Other" },
];

/** Canonical customer-facing label for a bump_type value. Used in both the
 *  editor's type dropdown and the read-only Additional Pay list rows on
 *  Gig Detail — matches mobile's labelForType(). */
export function additionalPayTypeOptionLabel(value: string): string {
  return ADDITIONAL_PAY_TYPES.find((o) => o.value === value)?.label ?? "Other";
}

/** Backwards-compatible alias — same as additionalPayTypeOptionLabel(). */
export const additionalPayTypeLabel = additionalPayTypeOptionLabel;
