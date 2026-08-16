// Editorial content for market (state/province) landing pages. The whole point
// of these pages is to rank for "casting calls in <market>" — so each needs
// GENUINELY useful, market-specific substance, not a templated fill-in-the-blank
// (Google flags those as thin/doorway pages). Flagship markets get full write-ups
// here; the rest fall back to a lighter, still-honest generic template until we
// add their content.

export type Faq = { q: string; a: string };

export type MarketContent = {
  /** Distinctive; used in <title> after the state name. */
  tagline: string;
  /** 2–3 sentence server-rendered intro under the H1. */
  intro: string;
  /** Evergreen "about this market" paragraphs — omit for generic markets. */
  about?: string[];
  /** One-line note on typical background/extra pay in this market. */
  payNote: string;
  /** Notable production hubs / cities in the market (chips). */
  hubs?: string[];
  /** Market-specific FAQ (merged after the universal questions). */
  faqs?: Faq[];
  /** True only for markets with hand-written content. */
  custom?: boolean;
};

// Casting role types — universal across markets, used for the "types of work"
// section and (later) role×market landing pages.
export const ROLE_TYPES: { slug: string; label: string; blurb: string }[] = [
  { slug: "background-actor", label: "Background actors & extras", blurb: "Non-speaking roles that fill out scenes — the bread and butter of film & TV work, and the easiest way to start with no experience." },
  { slug: "featured-background", label: "Featured background", blurb: "Background roles the camera lingers on — a specific look or action that stands out without lines." },
  { slug: "stand-in", label: "Stand-ins", blurb: "Match a principal actor's height and coloring to hold their place while crew sets lights and camera. Steady, longer bookings." },
  { slug: "photo-double", label: "Photo doubles", blurb: "Fill in for a principal actor in specific shots (hands, over-the-shoulder, distance) where the face isn't clearly seen." },
  { slug: "principal", label: "Featured & principal", blurb: "Speaking and named roles, usually cast through agents and auditions." },
];

// Questions that apply to essentially every market — the state name is injected.
export function universalFaqs(name: string, payNote: string): Faq[] {
  return [
    {
      q: `How do I become a background actor in ${name}?`,
      a: `You don't need experience, training, or an agent to start as a background actor in ${name}. Most casting directors accept direct submissions — usually a recent photo, your sizes, and contact info by email or a submission link. Browse current calls on GigDock, submit to the ones that fit, and you can be booked within days.`,
    },
    {
      q: `What do background actors and extras get paid in ${name}?`,
      a: `Pay is typically quoted as a flat rate for a guaranteed number of hours — in ${name}, commonly ${payNote}. Non-union background work is widely available; union (SAG-AFTRA) rates are higher, and productions may pay "bumps" for wardrobe, a personal vehicle, or special skills. Overtime usually kicks in after the guaranteed hours.`,
    },
    {
      q: `Do I need an agent to do background or extra work in ${name}?`,
      a: `No. Background, extras, stand-in, and photo-double work is almost always cast by submitting directly to the casting company — no agent required. Agents matter more for featured and principal (speaking) roles.`,
    },
    {
      q: `How often are new casting calls posted in ${name}?`,
      a: `Constantly — productions cast on short notice, often days before a shoot. GigDock pulls new ${name} casting calls from many casting companies and sources into one feed and updates throughout the day, so you don't have to monitor each one yourself.`,
    },
  ];
}

const MARKET_CONTENT: Record<string, MarketContent> = {
  GA: {
    custom: true,
    tagline: "Background, Extras, Stand-Ins & Film/TV Jobs",
    intro:
      "Georgia is one of the busiest film and television production hubs in the world — background actors, extras, stand-ins, and photo doubles are booked here every week. GigDock gathers current Georgia casting calls from casting companies and sources across the state into one searchable feed, updated daily.",
    about: [
      "Thanks to Georgia's 30% film & television tax credit, the state has become known as the \"Hollywood of the South\" (or \"Y'allywood\"). Major studios anchor the industry here — Trilith Studios in Fayetteville, Tyler Perry Studios and Assembly Studios in Atlanta, Blackhall/Shadowbox, and EUE/Screen Gems — and Marvel features, Netflix and Disney+ series, and countless independent productions shoot across the metro year-round.",
      "That volume means a steady stream of paid background and extras work for people of every look and age. Productions cluster around metro Atlanta and nearby towns — Fayetteville, Senoia, Covington (\"the Hollywood of the South\"), and Peachtree City — with additional work in Savannah and Columbus. You do not need to live in Atlanta proper; many calls list a report location and self-travel radius.",
    ],
    payNote: "$100–$210 for a 12-hour day",
    hubs: ["Atlanta", "Fayetteville", "Senoia", "Covington", "Savannah", "Columbus"],
    faqs: [
      {
        q: "What's filming in Georgia right now?",
        a: "It changes constantly — Georgia hosts Marvel films, major Netflix, Disney+, Apple, and network series, plus features and commercials, all shooting simultaneously. Rather than tracking each production, watch the live GigDock feed above: every current Georgia casting call from the sources we cover is aggregated in one place.",
      },
      {
        q: "Is casting work in Georgia union or non-union?",
        a: "Both. A large share of Georgia background work is non-union and open to newcomers, while SAG-AFTRA (Atlanta local) covers union productions at higher rates. Many casting calls specify which they are; GigDock shows union status on each listing so you can filter for what fits you.",
      },
      {
        q: "Where is most film work in Georgia located?",
        a: "The core is metro Atlanta and the surrounding production towns — Fayetteville (Trilith), Senoia, Covington, and Peachtree City — with a secondary hub in Savannah. Report locations are listed on each casting call.",
      },
    ],
  },
};

export function getMarketContent(code: string, name: string): MarketContent {
  const c = MARKET_CONTENT[code];
  if (c) return c;
  // Generic fallback — honest and useful, but intentionally lighter (no fabricated
  // studios/productions) until real per-market content is written.
  return {
    tagline: "Background, Extras & Film/TV Jobs",
    intro: `Find current film & TV casting calls in ${name} — background actors, extras, stand-ins, photo doubles, and featured roles. GigDock gathers ${name} opportunities from casting companies and sources into one searchable feed, updated daily.`,
    payNote: "a set rate for a guaranteed number of hours (often $100–$150 for non-union work)",
  };
}

export function marketFaqs(code: string, name: string): Faq[] {
  const c = getMarketContent(code, name);
  return [...universalFaqs(name, c.payNote), ...(c.faqs ?? [])];
}
