// SEO market/state content + registry. Neutral URL architecture:
//   /opportunities/atlanta-ga  -> a production MARKET (region: Atlanta + metro/film towns)
//   /opportunities/georgia     -> the STATEWIDE view (Atlanta + Savannah + Macon + …)
// The searcher's vocabulary ("Atlanta casting calls", "background acting jobs")
// lives in titles/H1/body — never baked into the path. Market pages are the
// primary SEO surface; states serve a genuinely broader purpose.
//
// Content must be GENUINELY useful per market (real studios, pay, cities). Thin
// swap-the-name templates are doorway pages — so only markets with real content
// + recurring inventory get built/indexed.

import { stateName } from "@/lib/markets";

export type Faq = { q: string; a: string };

export type MarketContent = {
  /** Distinctive; used in <title> after the market name. */
  tagline: string;
  /** 2–3 sentence server-rendered intro under the H1. */
  intro: string;
  /** Evergreen "about this market" paragraphs — omit for generic markets. */
  about?: string[];
  /** One-line note on typical background/extra pay. */
  payNote: string;
  /** Notable production hubs / towns (chips). */
  hubs?: string[];
  /** Market-specific FAQ (merged after the universal questions). */
  faqs?: Faq[];
};

// A resolved page target — either a production-market region or a whole state.
export type MarketSpec = {
  slug: string;
  kind: "market" | "state";
  /** Display name: "Atlanta" or "Georgia". */
  name: string;
  stateCode: string;
  /** Region markets scope listings to these cities (metro + surrounding film towns). */
  cities?: string[];
  /** Text signals that assign an opportunity to this market with higher confidence
   *  than a city match — e.g. a post that says "Atlanta local hire" even though the
   *  shoot is in Fayetteville. Matched against title + summary + location. */
  terms?: string[];
  /** Only index (sitemap + follow/index) markets we've deemed ready — real content
   *  AND enough recurring inventory. Prevents thin/doorway pages while we build the
   *  capability for many markets. Flip to true when a market is genuinely ready. */
  indexable?: boolean;
  content: MarketContent;
};

/* ---------------- role types (universal) ---------------- */

export const ROLE_TYPES: { slug: string; label: string; blurb: string }[] = [
  { slug: "background-actor", label: "Background actors & extras", blurb: "Non-speaking roles that fill out scenes — the bread and butter of film & TV work, and the easiest way to start with no experience." },
  { slug: "featured-background", label: "Featured background", blurb: "Background roles the camera lingers on — a specific look or action that stands out without lines." },
  { slug: "stand-in", label: "Stand-ins", blurb: "Match a principal actor's height and coloring to hold their place while crew sets lights and camera. Steady, longer bookings." },
  { slug: "photo-double", label: "Photo doubles", blurb: "Fill in for a principal in specific shots (hands, over-the-shoulder, distance) where the face isn't clearly seen." },
  { slug: "principal", label: "Featured & principal", blurb: "Speaking and named roles, usually cast through agents and auditions." },
];

/* ---------------- FAQs ---------------- */

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

/* ---------------- market registry ---------------- */

// Cities that make up the Atlanta production market (metro + surrounding film towns).
const ATLANTA_CITIES = [
  "Atlanta", "Fayetteville", "Senoia", "Covington", "Peachtree City", "Griffin",
  "Stone Mountain", "Norcross", "Decatur", "Douglasville", "Conyers", "Marietta",
  "Newnan", "Jonesboro", "Brooks", "Lithonia", "Palmetto", "Union City",
  "College Park", "Hampton", "McDonough", "Madison", "Rutledge", "Social Circle",
  "Monroe", "Porterdale", "Grantville", "Moreland", "Sharpsburg", "Tyrone",
  "Hapeville", "Forest Park", "Duluth", "Lawrenceville", "Alpharetta", "Roswell",
  "Sandy Springs", "Kennesaw", "Acworth", "Woodstock", "Canton", "Cartersville",
  "Locust Grove", "Villa Rica", "Winder", "Loganville", "Snellville", "Tucker",
];

const ATLANTA_CONTENT: MarketContent = {
  tagline: "Background Acting Jobs, Extras & Film/TV Casting",
  intro:
    "Atlanta is one of the busiest film and television production markets in the world — background actors, extras, stand-ins, and photo doubles are booked across the metro every week. GigDock gathers current Atlanta casting calls from casting companies and sources into one searchable feed, updated daily.",
  about: [
    "Thanks to Georgia's 30% film & television tax credit, Atlanta became known as the \"Hollywood of the South\" (or \"Y'allywood\"). Major studios anchor the market — Trilith Studios in Fayetteville, Tyler Perry Studios and Assembly Studios in Atlanta, Blackhall/Shadowbox, and EUE/Screen Gems — and Marvel features, Netflix and Disney+ series, and countless independent productions shoot here year-round.",
    "That volume means a steady stream of paid background and extras work for people of every look and age. Productions cluster across the metro and its film towns — Atlanta, Fayetteville, Senoia, Covington (\"the Hollywood of the South\"), Peachtree City, Griffin, and Newnan. You don't need to live inside Atlanta's city limits; most calls list a report location and a self-travel radius.",
  ],
  payNote: "$100–$210 for a 12-hour day",
  hubs: ["Atlanta", "Fayetteville", "Senoia", "Covington", "Peachtree City", "Griffin", "Newnan"],
  faqs: [
    {
      q: "What's filming in Atlanta right now?",
      a: "It changes constantly — Atlanta hosts Marvel films, major Netflix, Disney+, Apple, and network series, plus features and commercials, all shooting simultaneously. Rather than tracking each production, watch the live GigDock feed above: every current Atlanta-area casting call from the sources we cover is aggregated in one place.",
    },
    {
      q: "Is casting work in Atlanta union or non-union?",
      a: "Both. A large share of Atlanta background work is non-union and open to newcomers, while SAG-AFTRA (Atlanta local) covers union productions at higher rates. GigDock shows union status on each listing so you can filter for what fits you.",
    },
    {
      q: "Do I have to live in Atlanta to do background work here?",
      a: "No. The Atlanta market spans the whole metro and nearby film towns — Fayetteville, Senoia, Covington, Peachtree City, Griffin, Newnan and more. Each casting call lists its report location and, often, how far you'd need to self-travel.",
    },
  ],
};

const SEO_MARKETS: Record<string, MarketSpec> = {
  "atlanta-ga": {
    slug: "atlanta-ga",
    kind: "market",
    name: "Atlanta",
    stateCode: "GA",
    cities: ATLANTA_CITIES,
    terms: ["atlanta"],
    indexable: true,
    content: ATLANTA_CONTENT,
  },

  // ---- Curated market registry (capability built now; indexed only when ready) ----
  // These carry real state scoping + city/term matching so the template, Market
  // Pulse, and listings all work today, but stay OUT of the sitemap and are
  // noindex until each has genuine recurring inventory and fuller content.
  // Expand this list intentionally — never auto-generate a page per city.
  "nashville-tn": {
    slug: "nashville-tn",
    kind: "market",
    name: "Nashville",
    stateCode: "TN",
    cities: ["Nashville", "Franklin", "Murfreesboro", "Hendersonville", "Brentwood", "Gallatin", "Columbia", "Clarksville"],
    terms: ["nashville", "middle tennessee"],
    indexable: false,
    content: genericMarket("Nashville", "Tennessee"),
  },
  "los-angeles-ca": {
    slug: "los-angeles-ca",
    kind: "market",
    name: "Los Angeles",
    stateCode: "CA",
    cities: ["Los Angeles", "Burbank", "Hollywood", "Santa Clarita", "Long Beach", "Pasadena", "Culver City", "Santa Monica", "Glendale", "Valencia"],
    terms: ["los angeles", "l.a.", "greater los angeles", "socal", "southern california"],
    indexable: false,
    content: genericMarket("Los Angeles", "California"),
  },
  "new-york-ny": {
    slug: "new-york-ny",
    kind: "market",
    name: "New York",
    stateCode: "NY",
    cities: ["New York", "Brooklyn", "Queens", "Bronx", "Staten Island", "Manhattan", "Yonkers", "Long Island City"],
    terms: ["new york", "nyc", "new york city", "tri-state"],
    indexable: false,
    content: genericMarket("New York", "New York"),
  },
};

// Statewide content (broader than any single market). Georgia is written; others
// use a generic-but-honest template until real content is added.
const STATE_CONTENT: Record<string, MarketContent> = {
  GA: {
    tagline: "Film & TV Casting Calls Statewide",
    intro:
      "Find film & TV casting calls across Georgia — from the Atlanta production market to Savannah, Macon, Augusta, and Columbus. GigDock gathers Georgia casting calls from casting companies and sources into one searchable feed, updated daily.",
    about: [
      "Georgia is a top-tier film production state thanks to its 30% tax credit, with the bulk of work centered on metro Atlanta and its film towns, plus a growing hub in Savannah and productions in Columbus and Macon.",
    ],
    payNote: "$100–$210 for a 12-hour day",
    hubs: ["Atlanta metro", "Savannah", "Columbus", "Macon", "Augusta"],
  },
};

// Honest-but-generic content for a curated market we haven't hand-written yet.
// Used only by non-indexable registry stubs so the template renders while we
// build real per-market copy.
function genericMarket(name: string, state: string): MarketContent {
  return {
    tagline: "Background Acting Jobs, Extras & Film/TV Casting",
    intro: `Find current film & TV casting calls in the ${name} area — background actors, extras, stand-ins, photo doubles, and featured roles across ${state}. GigDock gathers ${name} opportunities from casting companies and sources into one searchable feed, updated daily.`,
    payNote: "a set rate for a guaranteed number of hours (often $100–$200 for non-union work)",
  };
}

function genericState(name: string): MarketContent {
  return {
    tagline: "Film & TV Casting Calls & Background Jobs",
    intro: `Find current film & TV casting calls in ${name} — background actors, extras, stand-ins, photo doubles, and featured roles. GigDock gathers ${name} opportunities from casting companies and sources into one searchable feed, updated daily.`,
    payNote: "a set rate for a guaranteed number of hours (often $100–$150 for non-union work)",
  };
}

/* ---------------- resolvers ---------------- */

export function getSeoMarket(slug: string): MarketSpec | null {
  return SEO_MARKETS[slug] ?? null;
}

export function seoMarketSlugs(): string[] {
  return Object.keys(SEO_MARKETS);
}

/** Slugs of markets marked ready to INDEX (real content + recurring inventory).
 *  Only these belong in the sitemap and get index/follow; the rest render but
 *  stay noindex, so we build capability without shipping thin doorway pages. */
export function indexableMarketSlugs(): string[] {
  return Object.values(SEO_MARKETS).filter((m) => m.indexable).map((m) => m.slug);
}

/** Evidence-based membership: does this opportunity belong to `spec`?
 *  - A state spec (no cities/terms) matches everything already scoped to its state.
 *  - A market spec matches when one of its TERMS appears anywhere in the post
 *    (title + summary + location), or one of its CITIES appears in the location.
 *  Callers pre-filter by state; this narrows a state's opps to the market. */
export function belongsToMarket(
  spec: MarketSpec,
  o: { title?: string | null; summary?: string | null; location?: string | null }
): boolean {
  if (!spec.cities?.length && !spec.terms?.length) return true; // state page / unscoped
  const loc = (o.location ?? "").toLowerCase();
  const hay = `${o.title ?? ""} ${o.summary ?? ""} ${o.location ?? ""}`.toLowerCase();
  if (spec.terms?.some((t) => hay.includes(t.toLowerCase()))) return true;
  if (spec.cities?.some((c) => loc.includes(c.toLowerCase()))) return true;
  return false;
}

/** State spec from a 2-letter code (for /opportunities/<state> pages). */
export function stateSpec(code: string, slug: string): MarketSpec {
  const name = stateName(code);
  return {
    slug, kind: "state", name, stateCode: code,
    content: STATE_CONTENT[code] ?? genericState(name),
  };
}

export function specFaqs(spec: MarketSpec): Faq[] {
  return [...universalFaqs(spec.name, spec.content.payNote), ...(spec.content.faqs ?? [])];
}
