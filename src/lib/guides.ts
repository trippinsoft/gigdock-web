// Registry of evergreen guides. Adding an entry here surfaces the guide on the
// /guides hub and in the sitemap; you still create its page under
// src/app/guides/<slug>/page.tsx. Order = display order (newest/flagship first).

export type Guide = {
  slug: string;
  title: string;
  /** One-line summary shown on the hub card and used as the meta description. */
  blurb: string;
};

export const GUIDES: Guide[] = [
  {
    slug: "how-background-actors-get-paid",
    title: "How Do Background Actors Get Paid?",
    blurb:
      "Rates and guaranteed hours, bumps and adjustments, overtime, who actually cuts the check, and when the money arrives.",
  },
  {
    slug: "how-to-track-background-acting-gigs-and-payments",
    title: "How to Track Background Acting Gigs & Payments (+ Free Spreadsheet)",
    blurb:
      "The exact fields to record for every gig, a free downloadable tracker, and how to catch a missing or wrong paycheck.",
  },
];

export function guideSlugs(): string[] {
  return GUIDES.map((g) => g.slug);
}

export function getGuide(slug: string): Guide | null {
  return GUIDES.find((g) => g.slug === slug) ?? null;
}
