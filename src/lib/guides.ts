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
    slug: "how-to-track-film-tv-gig-income-expenses",
    title: "How to Track Income and Expenses From Film & TV Gigs",
    blurb:
      "Working multiple film and TV gigs? How to track gigs, income, payments, expenses, receipts and tax records — without losing what you made or spent.",
  },
  {
    slug: "how-to-get-background-acting-work-in-atlanta",
    title: "How to Get Background Acting Work in Atlanta",
    blurb:
      "Start getting paid background and extras work in Atlanta with no experience — how to prepare, where casting calls appear, how to submit, and what pay looks like.",
  },
  {
    slug: "where-to-find-atlanta-casting-calls",
    title: "Where to Find Atlanta Casting Calls",
    blurb:
      "Where Atlanta casting calls actually appear — the casting companies, websites, Facebook pages, social accounts, email lists and platforms to watch, and how to verify what you find.",
  },
  {
    slug: "how-background-actors-get-paid",
    title: "How Do Background Actors Get Paid?",
    blurb:
      "Rates and guaranteed hours, bumps and adjustments, overtime, who actually cuts the check, and when the money arrives.",
  },
  {
    slug: "how-to-track-background-acting-gigs-and-payments",
    title: "How to Track Your Background Acting Gigs & Payments",
    blurb:
      "The exact fields to record for every gig, when to record them, and how to catch a missing or wrong paycheck.",
  },
];

export function guideSlugs(): string[] {
  return GUIDES.map((g) => g.slug);
}

export function getGuide(slug: string): Guide | null {
  return GUIDES.find((g) => g.slug === slug) ?? null;
}
