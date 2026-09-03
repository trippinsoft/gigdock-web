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
  /** Show in the "Popular markets" section on the locations hub — an intentional
   *  curation flag, not automatic. Kept separate from `indexable` so a page can be
   *  indexed for SEO without being featured, and vice versa. Live-inventory
   *  filtering still applies on top of this. */
  featured?: boolean;
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
    "Atlanta is one of the busiest film and television production markets in the world — background actors, extras, stand-ins, and photo doubles are booked across the metro every week. GigDock gathers current Atlanta casting calls from casting companies and sources into one searchable feed, updated throughout the day.",
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
    {
      q: "How do I get background acting work in Atlanta?",
      a: "Most Atlanta background roles are cast through open calls that anyone can respond to — no agent or experience required to start. Watch the current listings above, filter to what fits you, and follow each call's apply instructions (usually an email or a submission link). Setting up a profile lets GigFit flag which calls match your look, so you spend time on the ones worth applying to.",
    },
    {
      q: "How much do background actors and extras get paid in Atlanta?",
      a: "Atlanta background and extras work is typically quoted as a rate for a set number of guaranteed hours — commonly $100–$210 for a 12-hour day for non-union work, with SAG-AFTRA productions paying more. Many calls add \"bumps\" for wardrobe, a personal vehicle, or special skills. Each listing above shows its stated rate.",
    },
  ],
};

// Cities that make up the Chicago production market (metro + film-relevant suburbs).
const CHICAGO_CITIES = [
  "Chicago", "Evanston", "Oak Park", "Cicero", "Skokie", "Berwyn", "Forest Park",
  "Wilmette", "Winnetka", "Glenview", "Northbrook", "Highland Park",
  "Naperville", "Aurora", "Elgin", "Joliet", "Waukegan", "Schaumburg",
  "Rosemont", "Des Plaines", "Park Ridge", "Elmhurst", "Lombard", "Downers Grove",
  "Wheaton", "Hinsdale", "Oak Brook", "Lake Forest", "Bolingbrook", "Homewood",
  "Blue Island", "Chicago Heights", "Melrose Park", "River Forest", "Lansing",
  "Calumet City", "Harvey", "Hammond",
];

const CHICAGO_CONTENT: MarketContent = {
  tagline: "Background Acting Jobs, Extras & Film/TV Casting",
  intro:
    "Chicago is a top U.S. production market — background actors, extras, stand-ins, and photo doubles are booked across Chicagoland every week. GigDock gathers current Chicago casting calls from casting companies and sources into one searchable feed, updated throughout the day.",
  about: [
    "Illinois's film tax credit and a deep bench of local crew and studios make Chicago a year-round hub for television, features, and commercials. Long-running series shoot here (Chicago Fire, Chicago P.D., Chicago Med, The Chi), alongside features, streamers, and one of the country's largest commercial-production markets.",
    "Cinespace Chicago Film Studios in the West Side is the anchor stage complex; productions also work on location across the city, the North Shore (Evanston, Wilmette, Winnetka, Highland Park), the western suburbs (Oak Park, Naperville, Elmhurst), and out to Aurora, Elgin, and Joliet. Casting companies serving Chicagoland — 4 Star Casting, Extraordinary Casting, Joan Philo Casting and others — feed a steady pipeline of paid background and extras work.",
    "You don't have to live inside city limits — most calls list a report location and how far you'd need to self-travel. Cook County plus DuPage, Lake, Kane, and Will counties all fall inside the working Chicago market.",
  ],
  payNote: "$100–$188 for a 10-hour day",
  hubs: ["Chicago", "Evanston", "Oak Park", "Naperville", "Aurora", "Elgin", "Joliet"],
  faqs: [
    {
      q: "What's filming in Chicago right now?",
      a: "It changes constantly — Chicago hosts long-running network series (Chicago Fire, P.D., Med, The Chi), features, streaming originals, and a heavy commercial market. Rather than tracking each production, watch the live GigDock feed above: every current Chicago-area casting call from the sources we cover is aggregated in one place.",
    },
    {
      q: "Is casting work in Chicago union or non-union?",
      a: "Both. A large share of Chicago background work is non-union and open to newcomers; SAG-AFTRA (Chicago local) covers union productions at higher rates. GigDock shows union status on each listing so you can filter for what fits you.",
    },
    {
      q: "Do I have to live in Chicago to do background work here?",
      a: "No. The Chicago market spans Cook County plus DuPage, Lake, Kane and Will counties — Evanston, Oak Park, Naperville, Aurora, Elgin, Joliet, and the North Shore are all inside the working market. Each casting call lists its report location and, often, how far you'd need to self-travel.",
    },
    {
      q: "How do I get background acting work in Chicago?",
      a: "Most Chicago background roles are cast through open calls that anyone can respond to — no agent or experience required to start. Watch the current listings above, filter to what fits you, and follow each call's apply instructions (usually an email or a submission link). Setting up a profile lets GigFit flag which calls match your look, so you spend time on the ones worth applying to.",
    },
    {
      q: "How much do background actors and extras get paid in Chicago?",
      a: "Chicago background and extras work is typically quoted as a rate for a set number of guaranteed hours — commonly $100–$188 for a 10-hour day for non-union work, with SAG-AFTRA productions paying more. Many calls add \"bumps\" for wardrobe, a personal vehicle, or special skills. Each listing above shows its stated rate.",
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
    featured: true,
    content: ATLANTA_CONTENT,
  },
  "chicago-il": {
    slug: "chicago-il",
    kind: "market",
    name: "Chicago",
    stateCode: "IL",
    cities: CHICAGO_CITIES,
    terms: ["chicago", "chicagoland"],
    indexable: true,
    featured: true,
    content: CHICAGO_CONTENT,
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
    featured: true,
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
    // Kept in the registry (page still renders, still reachable via California)
    // but intentionally not featured on the locations hub while inventory is thin.
    featured: false,
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
    featured: true,
    content: genericMarket("New York", "New York"),
  },
};

// Statewide content (broader than any single market). Georgia is written; others
// use a generic-but-honest template until real content is added.
const STATE_CONTENT: Record<string, MarketContent> = {
  GA: {
    tagline: "Film & TV Casting Calls Statewide",
    intro:
      "Find film & TV casting calls across Georgia — from the Atlanta production market to Savannah, Macon, Augusta, and Columbus. GigDock gathers Georgia casting calls from casting companies and sources into one searchable feed, updated throughout the day.",
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
    intro: `Find current film & TV casting calls in the ${name} area — background actors, extras, stand-ins, photo doubles, and featured roles across ${state}. GigDock gathers ${name} opportunities from casting companies and sources into one searchable feed, updated throughout the day.`,
    payNote: "a set rate for a guaranteed number of hours (often $100–$200 for non-union work)",
  };
}

function genericState(name: string): MarketContent {
  return {
    tagline: "Film & TV Casting Calls & Background Jobs",
    intro: `Find current film & TV casting calls in ${name} — background actors, extras, stand-ins, photo doubles, and featured roles. GigDock gathers ${name} opportunities from casting companies and sources into one searchable feed, updated throughout the day.`,
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

/** All curated market specs — the full registry. Some of these are featured on
 *  the locations hub (`featured: true`); the rest are capability-built stubs
 *  whose pages resolve but are not promoted. Live-inventory filtering happens
 *  on top of this at the render site. */
export function curatedMarkets(): MarketSpec[] {
  return Object.values(SEO_MARKETS);
}

/** The subset intentionally promoted in the locations hub's Popular markets
 *  section. A market's card only appears if it also has live inventory
 *  (count > 0) at render time — this is the "stable/configurable featured
 *  list" separate from the automatic count-driven sort. */
export function featuredMarkets(): MarketSpec[] {
  return Object.values(SEO_MARKETS).filter((m) => m.featured);
}

/** Curated markets that sit within a given state (e.g. GA -> Atlanta). Drives the
 *  "Popular <state> markets" cross-link on a state page. */
export function marketsInState(code: string): MarketSpec[] {
  return Object.values(SEO_MARKETS).filter((m) => m.stateCode === code);
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
