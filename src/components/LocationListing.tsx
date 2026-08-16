import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase-server";
import type { Opportunity } from "@/lib/types";
import PublicShell from "@/components/PublicShell";
import { stateName, stateSlug } from "@/lib/markets";
import { getMarketContent, marketFaqs, ROLE_TYPES } from "@/lib/marketContent";

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

async function getMarket(code: string): Promise<Opportunity[]> {
  const today = new Date().toISOString().slice(0, 10);
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("opportunities")
    .select("*")
    .eq("status", "active")
    .is("deleted_at", null)
    .eq("match_state", code)
    .or(`work_date.is.null,work_date.gte.${today}`)
    .order("posted_at", { ascending: false })
    .limit(200);
  return (data ?? []) as Opportunity[];
}

/* A branded, server-rendered opportunity card (crawlable + matches the app). */
function OppCard({ o }: { o: Opportunity }) {
  const meta = [o.source, o.location, shortDate(o.work_date)].filter(Boolean).join(" · ");
  const fresh = freshness(o);
  const chips = specChips(o.casting_specs);
  return (
    <Link
      href={`/opportunities/${o.id}`}
      className="flex items-start gap-3 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-sm transition-all"
    >
      <span className="shrink-0 w-14 h-14 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
        {o.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={o.image_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="text-zinc-400">
            <rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 8h18M8 5v3M16 5v3" />
          </svg>
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 leading-snug line-clamp-2 flex-1">{o.title}</h3>
          {fresh && (
            <span className="shrink-0 text-[11px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">{fresh}</span>
          )}
        </div>
        {meta && <div className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">{meta}</div>}
        <div className="flex items-center gap-2 flex-wrap mt-1.5">
          {o.pay_rate && <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{o.pay_rate}</span>}
          {chips.map((c) => (
            <span key={c} className="text-[11px] px-2 py-0.5 rounded-full border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400">{c}</span>
          ))}
        </div>
      </div>
    </Link>
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

export default async function LocationListing({ code }: { code: string }) {
  const name = stateName(code);
  const content = getMarketContent(code, name);
  const faqs = marketFaqs(code, name);
  const opps = await getMarket(code);
  const updated = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "GigDock", item: BASE },
      { "@type": "ListItem", position: 2, name: "Casting Calls by Location", item: `${BASE}/opportunities/locations` },
      { "@type": "ListItem", position: 3, name: `Casting Calls in ${name}`, item: `${BASE}/opportunities/${stateSlug(code)}` },
    ],
  };
  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Casting calls in ${name}`,
    itemListElement: opps.slice(0, 50).map((o, i) => ({
      "@type": "ListItem", position: i + 1, url: `${BASE}/opportunities/${o.id}`, name: o.title,
    })),
  };
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question", name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <PublicShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      {opps.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      <div className="max-w-3xl mx-auto pb-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-zinc-500 dark:text-zinc-400 mb-3" aria-label="Breadcrumb">
          <Link href="/opportunities/locations" className="hover:text-zinc-800 dark:hover:text-zinc-200">Locations</Link>
          <span className="mx-1.5">›</span>
          <span className="text-zinc-700 dark:text-zinc-300">{name}</span>
        </nav>

        {/* Hero */}
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 text-balance">
          Casting Calls in {name}
        </h1>
        <p className="mt-4 text-zinc-600 dark:text-zinc-400 leading-relaxed">{content.intro}</p>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-500 dark:text-zinc-400">
          {opps.length > 0 && (
            <span><span className="font-semibold text-zinc-800 dark:text-zinc-200">{opps.length}</span> open right now</span>
          )}
          <span>Updated {updated}</span>
        </div>

        {/* Live opportunities */}
        <Section title={`Open casting calls in ${name}`}>
          {opps.length > 0 ? (
            <div className="space-y-2">
              {opps.map((o) => <OppCard key={o.id} o={o} />)}
            </div>
          ) : (
            <p className="text-zinc-600 dark:text-zinc-400">
              No open casting calls in {name} at the moment — new ones post daily. Create a free account and
              GigDock will surface {name} opportunities the moment they land.
            </p>
          )}
          <div className="mt-6 rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 p-6 text-center">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">See which {name} calls fit you</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 max-w-md mx-auto">
              GigFit compares casting requirements with your profile so you can spot the ones worth your time.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <Link href="/gigfit" className="px-6 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm">Find my matches</Link>
              <Link href="/opportunities" className="px-6 py-2.5 rounded-full border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800">Browse all opportunities</Link>
            </div>
          </div>
        </Section>

        {/* About the market (custom markets only) */}
        {content.about && (
          <Section title={`About the ${name} film & TV market`}>
            <div className="space-y-3 text-zinc-700 dark:text-zinc-300 leading-relaxed">
              {content.about.map((p, i) => <p key={i}>{p}</p>)}
            </div>
            {content.hubs && content.hubs.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {content.hubs.map((h) => (
                  <span key={h} className="text-sm px-3 py-1 rounded-full border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400">{h}</span>
                ))}
              </div>
            )}
          </Section>
        )}

        {/* Types of casting calls */}
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

        {/* Pay */}
        <Section title={`How much do background actors get paid in ${name}?`}>
          <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
            {name} background and extras work is typically quoted as {content.payNote}. Non-union work is widely
            available to newcomers; union (SAG-AFTRA) productions pay more, and many calls add &quot;bumps&quot; for
            wardrobe, a personal vehicle, or special skills. Each listing above shows the stated rate.
          </p>
        </Section>

        {/* FAQ */}
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

        {/* Final CTA */}
        <section className="mt-12 rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 p-7 text-center">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Never miss a {name} casting call</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1.5 max-w-md mx-auto">
            Create a free GigDock account to save opportunities, track what you&apos;ve applied to, and see which {name} calls match your profile.
          </p>
          <Link href="/signup" className="inline-block mt-4 px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm">Create your free account</Link>
        </section>
      </div>
    </PublicShell>
  );
}
