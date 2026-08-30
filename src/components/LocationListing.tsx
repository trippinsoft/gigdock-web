import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase-server";
import type { Opportunity } from "@/lib/types";
import PublicShell from "@/components/PublicShell";
import TrackEvent from "@/components/TrackEvent";
import AppCta from "@/components/AppCta";
import OpportunitiesFeed from "@/components/OpportunitiesFeed";
import { ROLE_TYPES, specFaqs, belongsToMarket, marketsInState, type MarketSpec } from "@/lib/marketContent";
import { formatPostRoleCount, roleCount } from "@/lib/roles";
import { stateName, stateSlug } from "@/lib/markets";

const BASE = "https://www.gigdock.co";

function cityOf(loc: string | null): string | null {
  const c = (loc ?? "").split(",")[0].trim();
  return c || null;
}

// Posts (source listings) vs named roles on those posts vs distinct sources.
function honestCounts(opps: Opportunity[]): { posts: number; roles: number; sources: number } {
  const sources = new Set<string>();
  for (const o of opps) {
    if (o.source) sources.add(o.source);
  }
  return { posts: opps.length, roles: roleCount(opps), sources: sources.size };
}

async function getListings(spec: MarketSpec): Promise<Opportunity[]> {
  const today = new Date().toISOString().slice(0, 10);
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("opportunities")
    .select("*")
    .eq("status", "active")
    .is("deleted_at", null)
    .eq("match_state", spec.stateCode)
    .or(`expires_at.is.null,expires_at.gte.${today}`)
    .order("posted_at", { ascending: false })
    .limit(500);
  // Narrow the state's active opps to this market by evidence (terms/cities).
  return ((data ?? []) as Opportunity[]).filter((o) => belongsToMarket(spec, o)).slice(0, 200);
}

type Pulse = {
  total: number; newThisWeek: number; medianPay: number | null; activeCompanies: number;
  companies: [string, number][]; cities: [string, number][];
};

// Proprietary market intelligence (the SEO moat) — 30-day activity from GigDock's
// own data, scoped to the market's cities. Throughput stays strong even when few
// calls are live right now.
async function getPulse(spec: MarketSpec): Promise<Pulse> {
  const supabase = await createSupabaseServer();
  const since = new Date(Date.now() - 30 * 864e5).toISOString();
  const week = new Date(Date.now() - 7 * 864e5).toISOString();
  const { data } = await supabase
    .from("opportunities")
    .select("source, pay_min, posted_at, location, title, summary")
    .eq("match_state", spec.stateCode)
    .in("status", ["active", "expired"])
    .gte("posted_at", since)
    .limit(3000);
  const rows = (data ?? []).filter((r) => belongsToMarket(spec, r as { title: string | null; summary: string | null; location: string | null }));
  const total = rows.length;
  const newThisWeek = rows.filter((r) => r.posted_at && r.posted_at >= week).length;
  const pays = rows.map((r) => r.pay_min as number | null).filter((n): n is number => n != null).sort((a, b) => a - b);
  const medianPay = pays.length ? pays[Math.floor(pays.length / 2)] : null;
  const comp = new Map<string, number>();
  const city = new Map<string, number>();
  for (const r of rows) {
    if (r.source) comp.set(r.source as string, (comp.get(r.source as string) ?? 0) + 1);
    const c = cityOf(r.location as string | null);
    if (c) city.set(c, (city.get(c) ?? 0) + 1);
  }
  return {
    total, newThisWeek, medianPay, activeCompanies: comp.size,
    companies: [...comp.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5),
    cities: [...city.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8),
  };
}


function StatTile({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 text-center">
      <div className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-100">{value}</div>
      <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{label}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default async function LocationListing({ spec }: { spec: MarketSpec }) {
  const { name, content, slug } = spec;
  const faqs = specFaqs(spec);
  const [opps, pulse] = await Promise.all([getListings(spec), getPulse(spec)]);
  const counts = honestCounts(opps);
  const now = Date.now(); // stable render-time clock so the cards' relative times hydrate cleanly
  const updated = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  // Honest freshness: how many of the CURRENT active opportunities were posted in
  // the last 7 days. Computed from the live set so it matches the list exactly.
  const weekAgoIso = new Date(now - 7 * 864e5).toISOString();
  const newThisWeek = opps.filter((o) => o.posted_at && o.posted_at >= weekAgoIso).length;

  // Breadcrumb trail: Opportunities › By location › [State ›] Name. A market page
  // inserts its state level so the hierarchy Locations → Georgia → Atlanta is
  // explicit for users and search engines.
  const trail: { name: string; href: string }[] = [
    { name: "Opportunities", href: "/opportunities" },
    { name: "By location", href: "/opportunities/locations" },
  ];
  if (spec.kind === "market" && spec.stateCode) {
    trail.push({ name: stateName(spec.stateCode), href: `/opportunities/${stateSlug(spec.stateCode)}` });
  }
  trail.push({ name, href: `/opportunities/${slug}` });

  // On a state page, surface the curated markets within it that have inventory
  // (e.g. Georgia → Atlanta) so Atlanta is discoverable from the state as well.
  const stateMarkets =
    spec.kind === "state" && spec.stateCode
      ? marketsInState(spec.stateCode)
          .map((m) => ({ m, count: opps.filter((o) => belongsToMarket(m, o)).length }))
          .filter((x) => x.count > 0)
          .sort((a, b) => b.count - a.count || a.m.name.localeCompare(b.m.name))
      : [];

  const breadcrumbLd = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: trail.map((c, i) => ({
      "@type": "ListItem", position: i + 1, name: c.name, item: `${BASE}${c.href}`,
    })),
  };
  const itemListLd = {
    "@context": "https://schema.org", "@type": "ItemList", name: `Casting calls in ${name}`,
    itemListElement: opps.slice(0, 50).map((o, i) => ({ "@type": "ListItem", position: i + 1, url: `${BASE}/opportunities/${o.id}`, name: o.title })),
  };
  const faqLd = {
    "@context": "https://schema.org", "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };

  return (
    <PublicShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      {opps.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <TrackEvent
        event="opportunity_list_viewed"
        props={{
          market: slug,
          results_count: opps.length,
          roles: counts.roles,
          sources: counts.sources,
          surface: "market_page",
        }}
      />

      <div className="pb-8">
       <div className="max-w-5xl mx-auto">
        <nav className="text-sm text-zinc-500 dark:text-zinc-400 mb-3" aria-label="Breadcrumb">
          {trail.map((c, i) => (
            <span key={c.href}>
              {i > 0 && <span className="mx-1.5">›</span>}
              {i < trail.length - 1 ? (
                <Link href={c.href} className="hover:text-zinc-800 dark:hover:text-zinc-200">{c.name}</Link>
              ) : (
                <span className="text-zinc-700 dark:text-zinc-300">{c.name}</span>
              )}
            </span>
          ))}
        </nav>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 text-balance">
          {name}{" "}Casting Calls &amp; Background Acting Opportunities
        </h1>
        {/* Freshness bar — the differentiator. Real numbers from the live set;
            never a faked date. Sits high so it's the first thing after the H1. */}
        <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-base text-zinc-600 dark:text-zinc-300">
          {opps.length > 0 ? (
            <>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-green-500" aria-hidden="true" />
                <span className="font-bold text-zinc-900 dark:text-zinc-100">{formatPostRoleCount(counts.posts, counts.roles)}</span>
              </span>
              {newThisWeek > 0 && (
                <><span className="text-zinc-300 dark:text-zinc-600">·</span>
                <span><span className="font-bold text-zinc-900 dark:text-zinc-100">{newThisWeek}</span> added this week</span></>
              )}
              {counts.sources > 0 && (
                <><span className="text-zinc-300 dark:text-zinc-600">·</span>
                <span>from <span className="font-bold text-zinc-900 dark:text-zinc-100">{counts.sources}</span> {counts.sources === 1 ? "source" : "sources"}</span></>
              )}
              <span className="text-zinc-300 dark:text-zinc-600">·</span>
              <span className="text-sm text-zinc-500 dark:text-zinc-400">Updated {updated}</span>
            </>
          ) : (
            <span className="text-sm text-zinc-500 dark:text-zinc-400">Updated {updated}</span>
          )}
        </div>

        <p className="mt-4 text-zinc-600 dark:text-zinc-400 leading-relaxed">{content.intro}</p>

        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          New to background work?{" "}
          <Link href="/guides/how-background-actors-get-paid" className="font-medium text-blue-600 hover:underline dark:text-blue-400">
            Read how background actors get paid
          </Link>{" "}
          — rates, bumps, and when the check actually comes.
        </p>

        {stateMarkets.length > 0 && (
          <div className="mt-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Popular {name} markets</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              {stateMarkets.map(({ m, count }) => (
                <Link
                  key={m.slug}
                  href={`/opportunities/${m.slug}`}
                  className="flex items-center justify-between rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3.5 hover:border-blue-300 dark:hover:border-blue-800 hover:shadow-sm transition-all"
                >
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">{m.name} metro</span>
                  <span className="shrink-0 ml-3 text-sm font-medium text-zinc-500 dark:text-zinc-400">{count} {count === 1 ? "opportunity" : "opportunities"}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

       </div>

       {/* The SAME opportunity browser as /opportunities, at the same site-standard
           max-w-5xl width so the card column and detail column match the standard
           opportunities page exactly. SSR-seeded so the listings are crawlable. */}
       <div className="max-w-5xl mx-auto mt-10">
         <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100">Open casting calls in {name}</h2>
         {opps.length > 0 ? (
           <div className="mt-4">
             <OpportunitiesFeed initialOpps={opps} embedded scopeLabel={name} now={now} />
           </div>
         ) : (
           <p className="mt-4 text-zinc-600 dark:text-zinc-400">No open casting calls in {name} at the moment — new ones post throughout the day. Create a free account and GigDock will surface {name} opportunities the moment they land.</p>
         )}
       </div>

       <div className="max-w-5xl mx-auto">
        <div className="mt-8 rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 p-6 text-center">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">See which {name} calls fit you</h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 max-w-md mx-auto">GigFit compares casting requirements with your profile so you can spot the ones worth your time.</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <Link href="/gigfit" className="px-6 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm">Find my matches</Link>
            <Link href="/opportunities" className="px-6 py-2.5 rounded-full border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800">Browse all opportunities</Link>
          </div>
        </div>

        {pulse.total >= 5 && (
          <Section title={`${name} casting market — last 30 days`}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatTile value={pulse.total} label="casting calls tracked" />
              <StatTile value={pulse.newThisWeek} label="new this week" />
              {pulse.medianPay != null && <StatTile value={`$${pulse.medianPay}`} label="median posted rate" />}
              <StatTile value={pulse.activeCompanies} label="casting companies" />
            </div>
            {pulse.companies.length >= 3 && (
              <div className="mt-6">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Most active {name} casting companies this month</h3>
                <ol className="mt-2 space-y-1">
                  {pulse.companies.map(([src, n], i) => (
                    <li key={src} className="flex items-center justify-between text-sm border-b border-zinc-100 dark:border-zinc-800 py-1.5">
                      <span className="text-zinc-700 dark:text-zinc-300"><span className="text-zinc-400 mr-2">{i + 1}.</span>{src}</span>
                      <span className="text-zinc-500 dark:text-zinc-400">{n} {n === 1 ? "call" : "calls"}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            {pulse.cities.length >= 3 && (
              <div className="mt-6">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Where {name} gigs are filming</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {pulse.cities.map(([c, n]) => (
                    <span key={c} className="inline-flex items-center gap-1.5 text-sm px-3 py-1 rounded-full border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300">{c} <span className="text-zinc-400">{n}</span></span>
                  ))}
                </div>
              </div>
            )}
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-4">Based on casting calls GigDock tracked in {name} over the last 30 days. Updated {updated}.</p>
          </Section>
        )}

        {content.about && (
          <Section title={`About the ${name} film & TV market`}>
            <div className="space-y-3 text-zinc-700 dark:text-zinc-300 leading-relaxed">{content.about.map((p, i) => <p key={i}>{p}</p>)}</div>
            {content.hubs && content.hubs.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {content.hubs.map((h) => <span key={h} className="text-sm px-3 py-1 rounded-full border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400">{h}</span>)}
              </div>
            )}
          </Section>
        )}

        <Section title={`Types of casting calls in ${name}`}>
          <div className="space-y-3">
            {ROLE_TYPES.map((r) => (
              <div key={r.slug} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{r.label}</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">{r.blurb}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title={`How much do background actors get paid in ${name}?`}>
          <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
            {name} background and extras work is typically quoted as {content.payNote}. Non-union work is widely available to newcomers; union (SAG-AFTRA) productions pay more, and many calls add &quot;bumps&quot; for wardrobe, a personal vehicle, or special skills. Each listing above shows the stated rate.
          </p>
        </Section>

        <Section title="Frequently asked questions">
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {faqs.map((f) => (
              <div key={f.q} className="py-4">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{f.q}</h3>
                <p className="text-zinc-600 dark:text-zinc-400 mt-1.5 leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </Section>

        <section className="mt-12 rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 p-7 text-center">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Never miss a {name} casting call</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1.5 max-w-md mx-auto">Create a free GigDock account to save opportunities, track what you&apos;ve applied to, and see which {name} calls match your profile.</p>
          <Link href="/signup" className="inline-block mt-4 px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm">Create your free account</Link>
        </section>

        <AppCta center heading="Want these opportunities on your phone?" ctaLabel="Join the GigDock beta">
          Booked one of these? The GigDock app keeps your gigs, hours and pay — gross and net — in one place. It&rsquo;s
          in beta now, ahead of launch — join the beta to try it early on iPhone or Android.
        </AppCta>
       </div>
      </div>
    </PublicShell>
  );
}
