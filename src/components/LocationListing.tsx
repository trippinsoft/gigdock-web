import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase-server";
import type { Opportunity } from "@/lib/types";
import PublicShell from "@/components/PublicShell";
import { ROLE_TYPES, specFaqs, belongsToMarket, type MarketSpec } from "@/lib/marketContent";

const BASE = "https://www.gigdock.co";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function shortDate(input: string | null): string | null {
  if (!input) return null;
  const [y, m, d] = input.split("T")[0].split("-").map(Number);
  if (!y || !m || !d) return null;
  return `${MONTHS[m - 1]} ${d}`;
}
function freshness(o: Opportunity): string | null {
  if (!o.posted_at) return null;
  const hrs = (Date.now() - new Date(o.posted_at).getTime()) / 3.6e6;
  if (hrs <= 6) return "New";
  if (hrs <= 24) return "Today";
  return null;
}
function cap(s: string): string { return s.charAt(0).toUpperCase() + s.slice(1); }
function cityOf(loc: string | null): string | null {
  const c = (loc ?? "").split(",")[0].trim();
  return c || null;
}

function specChips(specs: Opportunity["casting_specs"]): string[] {
  const s = (specs ?? {}) as Record<string, unknown>;
  const out: string[] = [];
  const g = s.gender;
  if (Array.isArray(g) && g.length) out.push(g.map((x) => cap(String(x))).join(", "));
  const amin = s.age_min as number | undefined, amax = s.age_max as number | undefined;
  if (amin != null && amax != null) out.push(`Ages ${amin}–${amax}`);
  else if (amin != null) out.push(`Ages ${amin}+`);
  const u = s.union_status as string | undefined;
  if (u === "sag-aftra") out.push("Union");
  else if (u === "non-union") out.push("Non-Union");
  return out.slice(0, 3);
}

// Honest counts: distinct productions (grouping a project's roles) vs. individual
// roles vs. distinct sources — so we show "38 opportunities · 126 roles · 18
// sources" instead of an inflated role total. A role with no production groups as
// its own opportunity.
function honestCounts(opps: Opportunity[]): { opportunities: number; roles: number; sources: number } {
  const projects = new Set<string>();
  const sources = new Set<string>();
  let ungrouped = 0;
  for (const o of opps) {
    const p = (o.production_name ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (p) projects.add(p); else ungrouped++;
    if (o.source) sources.add(o.source);
  }
  return { opportunities: projects.size + ungrouped, roles: opps.length, sources: sources.size };
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

function OppCard({ o }: { o: Opportunity }) {
  const meta = [o.source, o.location, shortDate(o.work_date)].filter(Boolean).join(" · ");
  const fresh = freshness(o);
  const chips = specChips(o.casting_specs);
  return (
    <Link href={`/opportunities/${o.id}`} className="flex items-start gap-3 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-sm transition-all">
      <span className="shrink-0 w-14 h-14 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
        {o.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={o.image_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="text-zinc-400"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 8h18M8 5v3M16 5v3" /></svg>
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 leading-snug line-clamp-2 flex-1">{o.title}</h3>
          {fresh && <span className="shrink-0 text-[11px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">{fresh}</span>}
        </div>
        {meta && <div className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">{meta}</div>}
        <div className="flex items-center gap-2 flex-wrap mt-1.5">
          {o.pay_rate && <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{o.pay_rate}</span>}
          {chips.map((c) => <span key={c} className="text-[11px] px-2 py-0.5 rounded-full border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400">{c}</span>)}
        </div>
      </div>
    </Link>
  );
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
  const updated = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const breadcrumbLd = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "GigDock", item: BASE },
      { "@type": "ListItem", position: 2, name: "Opportunities by Location", item: `${BASE}/opportunities/locations` },
      { "@type": "ListItem", position: 3, name: `${name} Casting Calls`, item: `${BASE}/opportunities/${slug}` },
    ],
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

      <div className="max-w-3xl mx-auto pb-8">
        <nav className="text-sm text-zinc-500 dark:text-zinc-400 mb-3" aria-label="Breadcrumb">
          <Link href="/opportunities/locations" className="hover:text-zinc-800 dark:hover:text-zinc-200">Locations</Link>
          <span className="mx-1.5">›</span>
          <span className="text-zinc-700 dark:text-zinc-300">{name}</span>
        </nav>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 text-balance">
          {name} Casting Calls &amp; Background Acting Opportunities
        </h1>
        <p className="mt-4 text-zinc-600 dark:text-zinc-400 leading-relaxed">{content.intro}</p>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-500 dark:text-zinc-400">
          {opps.length > 0 && (
            <span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">{counts.opportunities}</span>{" "}
              {counts.opportunities === 1 ? "opportunity" : "opportunities"} open
              {counts.roles !== counts.opportunities && (
                <> · <span className="font-semibold text-zinc-800 dark:text-zinc-200">{counts.roles}</span> roles</>
              )}
              {counts.sources > 0 && (
                <> · from <span className="font-semibold text-zinc-800 dark:text-zinc-200">{counts.sources}</span> {counts.sources === 1 ? "source" : "sources"}</>
              )}
            </span>
          )}
          <span>Updated {updated}</span>
        </div>

        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          New to background work?{" "}
          <Link href="/guides/how-background-actors-get-paid" className="font-medium text-blue-600 hover:underline dark:text-blue-400">
            Read how background actors get paid
          </Link>{" "}
          — rates, bumps, and when the check actually comes.
        </p>

        <Section title={`Open casting calls in ${name}`}>
          {opps.length > 0 ? (
            <div className="space-y-2">{opps.map((o) => <OppCard key={o.id} o={o} />)}</div>
          ) : (
            <p className="text-zinc-600 dark:text-zinc-400">No open casting calls in {name} at the moment — new ones post daily. Create a free account and GigDock will surface {name} opportunities the moment they land.</p>
          )}
          <div className="mt-6 rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 p-6 text-center">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">See which {name} calls fit you</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 max-w-md mx-auto">GigFit compares casting requirements with your profile so you can spot the ones worth your time.</p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <Link href="/gigfit" className="px-6 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm">Find my matches</Link>
              <Link href="/opportunities" className="px-6 py-2.5 rounded-full border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800">Browse all opportunities</Link>
            </div>
          </div>
        </Section>

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
      </div>
    </PublicShell>
  );
}
