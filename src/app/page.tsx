import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import type { Opportunity } from "@/lib/types";
import PublicShell from "@/components/PublicShell";
import { GigFitArt, SaveShareArt } from "@/components/HowItWorksArt";
import AppCta from "@/components/AppCta";
import { stateName, stateSlug } from "@/lib/markets";
import { curatedMarkets } from "@/lib/marketContent";

export const metadata: Metadata = {
  title: "GigDock — Film & TV Opportunities Matched to You",
  description:
    "Find film & TV casting opportunities from across the web in one place, with GigFit matching to help you quickly see what fits you.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "GigDock — Film & TV Opportunities Matched to You",
    description:
      "Film & TV opportunities from many sources in one feed, matched to you with GigFit.",
    type: "website",
    siteName: "GigDock",
  },
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function shortDate(input: string | null): string | null {
  if (!input) return null;
  const [y, m, d] = input.split("T")[0].split("-").map(Number);
  if (!y || !m || !d) return null;
  return `${MONTHS[m - 1]} ${d}`;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Up to three neutral casting-spec chips for a preview card (real data only).
function specChips(specs: Opportunity["casting_specs"]): string[] {
  const s = (specs ?? {}) as Record<string, unknown>;
  const out: string[] = [];
  const gender = s.gender;
  if (Array.isArray(gender) && gender.length) out.push(gender.map((g) => cap(String(g))).join(", "));
  const amin = s.age_min as number | undefined;
  const amax = s.age_max as number | undefined;
  if (amin != null && amax != null) out.push(`Ages ${amin}–${amax}`);
  else if (amin != null) out.push(`Ages ${amin}+`);
  const eth = s.ethnicity;
  if (Array.isArray(eth) && eth.length) out.push(eth.length > 1 ? "Multiple ethnicities" : cap(String(eth[0])));
  else out.push("All ethnicities");
  const union = s.union_status as string | undefined;
  if (union === "sag-aftra") out.push("Union");
  else if (union === "non-union") out.push("Non-Union");
  return out.slice(0, 3);
}

async function getMarkets(): Promise<string[]> {
  const today = new Date().toISOString().slice(0, 10);
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("opportunities")
    .select("match_state")
    .eq("status", "active")
    .is("deleted_at", null)
    .or(`expires_at.is.null,expires_at.gte.${today}`)
    .not("match_state", "is", null)
    .limit(5000);
  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const s = row.match_state as string | null;
    if (s) counts.set(s, (counts.get(s) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([code]) => code);
}

async function getPreviewOpps(): Promise<Opportunity[]> {
  const today = new Date().toISOString().slice(0, 10);
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("opportunities")
    .select("*")
    .eq("status", "active")
    .is("deleted_at", null)
    .or(`expires_at.is.null,expires_at.gte.${today}`)
    .order("posted_at", { ascending: false })
    .limit(24);
  const all = (data ?? []) as Opportunity[];
  // Prefer listings with artwork — the inventory is the homepage's imagery.
  const withImg = all.filter((o) => o.image_url);
  const withoutImg = all.filter((o) => !o.image_url);
  return [...withImg, ...withoutImg].slice(0, 3);
}

/* ---------- small presentational pieces ---------- */

function ValueProp({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
      <span className="text-blue-600 dark:text-blue-400">{icon}</span>
      {children}
    </div>
  );
}

function OppPreviewCard({ o }: { o: Opportunity }) {
  const meta = [o.location, o.pay_rate, shortDate(o.work_date)].filter(Boolean).join(" · ");
  const chips = specChips(o.casting_specs);
  return (
    <Link
      href={`/opportunities/${o.id}`}
      className="group flex flex-col rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-sm transition-all"
    >
      <div className="flex gap-4 p-5">
        <span className="shrink-0 w-24 h-24 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
          {o.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={o.image_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="text-zinc-400">
              <rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 8h18M8 5v3M16 5v3" />
            </svg>
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-zinc-100 leading-snug line-clamp-2">{o.title}</h3>
          {o.source && <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 truncate">{o.source}</p>}
        </div>
        <span className="shrink-0 text-zinc-300 dark:text-zinc-600 group-hover:text-blue-500" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 3h12a1 1 0 011 1v17l-7-4-7 4V4a1 1 0 011-1z" /></svg>
        </span>
      </div>
      {meta && <div className="px-5 -mt-1.5 text-sm sm:text-[15px] text-zinc-600 dark:text-zinc-300 truncate">{meta}</div>}
      {chips.length > 0 && (
        <div className="px-5 py-3.5 mt-2.5 border-t border-zinc-100 dark:border-zinc-800 flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <span key={c} className="text-xs px-2.5 py-1 rounded-full border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400">{c}</span>
          ))}
        </div>
      )}
    </Link>
  );
}

export default async function Home() {
  // Signed-in users skip the marketing page and go straight to the feed.
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/opportunities");

  const [markets, preview] = await Promise.all([getMarkets(), getPreviewOpps()]);

  return (
    <PublicShell>
      <div className="max-w-5xl mx-auto">
        {/* Hero */}
        <section className="text-center pt-8 pb-10">
          <span className="inline-block text-base sm:text-lg font-bold tracking-[0.14em] uppercase text-blue-600 dark:text-blue-400">
            Your Gig Life. Simplified.
          </span>
          <h1 className="mt-3 text-4xl sm:text-6xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 text-balance lg:whitespace-nowrap">
            Don&apos;t miss a gig that fits you
          </h1>
          <p className="mt-4 text-base sm:text-lg text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto">
            Find film &amp; TV opportunities from across the web in one place — matched to you with GigFit.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link href="/gigfit" className="px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm">
              Find my matches
            </Link>
            <Link href="/opportunities" className="px-6 py-3 rounded-full border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800">
              Browse opportunities
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <ValueProp icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 3 14h7l-1 8 10-12h-7z" /></svg>}>New opportunities added throughout the day</ValueProp>
            <ValueProp icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z" /><path d="M9 12l2 2 4-4" /></svg>}>Matched to your profile</ValueProp>
            <ValueProp icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 3h12a1 1 0 011 1v17l-7-4-7 4V4a1 1 0 011-1z" /></svg>}>Save, apply &amp; share</ValueProp>
          </div>
          <p className="mt-5 text-sm text-zinc-500 dark:text-zinc-400">
            New to background acting?{" "}
            <Link href="/guides/how-background-actors-get-paid" className="font-medium text-blue-600 hover:underline dark:text-blue-400">
              Learn how background actors get paid
            </Link>
            .
          </p>
        </section>

        {/* Live opportunity preview — real listings are the homepage's imagery */}
        {preview.length > 0 && (
          <section className="mb-14">
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Live opportunities</h2>
              <Link href="/opportunities" className="text-sm font-medium text-blue-600 dark:text-blue-400">View all opportunities →</Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {preview.map((o) => <OppPreviewCard key={o.id} o={o} />)}
            </div>
          </section>
        )}

        {/* How GigDock works — gather → personalize → act */}
        <section className="mb-14">
          <h2 className="text-center text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
            How <span className="text-blue-600 dark:text-blue-400">GigDock</span> works
          </h2>
          <p className="text-center text-zinc-600 dark:text-zinc-400 mt-3 max-w-xl mx-auto">
            We bring film &amp; TV opportunities from across the web into one place, so you can find the
            right gigs and focus on what you do best.
          </p>

          <div className="grid md:grid-cols-3 gap-4 mt-8">
            {/* GigFit */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 flex flex-col">
              <div className="mb-4"><GigFitArt /></div>
              <div className="mt-1 flex items-center gap-3">
                <span className="h-11 w-11 shrink-0 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" /><circle cx="12" cy="10" r="2.2" /><path d="M8.5 16c.7-2 6.3-2 7 0" /></svg>
                </span>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 leading-snug">GigFit — matched to you</h3>
              </div>
              <div className="mt-3 h-1 w-10 rounded-full bg-blue-600" />
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-3 leading-relaxed">
                Tell us a little about yourself. GigFit compares casting requirements with your profile so you can quickly see which opportunities fit.
              </p>
            </div>

            {/* Many sources, one feed — the hub-and-spoke wedge, centered */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 flex flex-col items-center text-center">
              <svg viewBox="0 0 200 200" className="w-44 h-44 sm:w-48 sm:h-48 mb-1" role="img" aria-label="The GigDock spoke hub with six spokes out to six sources">
                {/* faint connecting ring */}
                <circle cx="100" cy="100" r="68" fill="none" stroke="#bfdbfe" strokeWidth="1.5" strokeDasharray="2 6" />
                {/* the GigDock spoke mark, opened up: six spokes from the hub out to each source */}
                <g stroke="#2563eb" strokeWidth="3" strokeLinecap="round">
                  <line x1="100" y1="100" x2="100" y2="32" />
                  <line x1="100" y1="100" x2="159" y2="66" />
                  <line x1="100" y1="100" x2="159" y2="134" />
                  <line x1="100" y1="100" x2="100" y2="168" />
                  <line x1="100" y1="100" x2="41" y2="134" />
                  <line x1="100" y1="100" x2="41" y2="66" />
                </g>
                {/* central hub — the GigDock mark's node */}
                <polygon points="100,74 77.5,87 77.5,113 100,126 122.5,113 122.5,87" fill="#1d4ed8" />
                {/* source nodes */}
                <g transform="translate(100,32)"><circle r="18" fill="#2563eb" /><text x="0" y="6" textAnchor="middle" fontSize="19" fontWeight="700" fill="#fff">f</text></g>
                <g transform="translate(159,66)"><circle r="18" fill="#2563eb" /><rect x="-8" y="-6" width="16" height="12" rx="2" fill="none" stroke="#fff" strokeWidth="1.8" /><path d="M-8 -5 L0 2 L8 -5" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></g>
                <g transform="translate(159,134)"><circle r="18" fill="#2563eb" /><circle r="7.5" fill="none" stroke="#fff" strokeWidth="1.6" /><path d="M-7.5 0 H7.5" stroke="#fff" strokeWidth="1.5" /><path d="M0 -7.5 C-4.5 -3 -4.5 3 0 7.5 C4.5 3 4.5 -3 0 -7.5 Z" fill="none" stroke="#fff" strokeWidth="1.5" /></g>
                <g transform="translate(100,168)"><circle r="18" fill="#2563eb" /><rect x="-6.5" y="-8" width="13" height="16" rx="1" fill="none" stroke="#fff" strokeWidth="1.7" /><rect x="-3.6" y="-5" width="2.2" height="2.2" fill="#fff" /><rect x="1.4" y="-5" width="2.2" height="2.2" fill="#fff" /><rect x="-3.6" y="-0.4" width="2.2" height="2.2" fill="#fff" /><rect x="1.4" y="-0.4" width="2.2" height="2.2" fill="#fff" /></g>
                <g transform="translate(41,134)"><circle r="18" fill="#2563eb" /><circle cy="-3.5" r="3.3" fill="none" stroke="#fff" strokeWidth="1.8" /><path d="M-6.5 8 C-6.5 2 6.5 2 6.5 8" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" /></g>
                <g transform="translate(41,66)"><circle r="18" fill="#2563eb" /><rect x="-7" y="-7" width="14" height="14" rx="4.5" fill="none" stroke="#fff" strokeWidth="1.8" /><circle r="3.3" fill="none" stroke="#fff" strokeWidth="1.8" /><circle cx="4.3" cy="-4.3" r="1.1" fill="#fff" /></g>
              </svg>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Many sources. One feed.</h3>
              <div className="mt-3 h-1 w-10 rounded-full bg-blue-600" />
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-3 leading-relaxed">
                Stop checking casting sites and social feeds one by one. GigDock brings film &amp; TV opportunities together in one clean, searchable place.
              </p>
            </div>

            {/* Save, apply & share */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 flex flex-col">
              <div className="mb-4"><SaveShareArt /></div>
              <div className="mt-1 flex items-center gap-3">
                <span className="h-11 w-11 shrink-0 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h12a1 1 0 011 1v17l-7-4-7 4V4a1 1 0 011-1z" /></svg>
                </span>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 leading-snug">Save, apply &amp; share</h3>
              </div>
              <div className="mt-3 h-1 w-10 rounded-full bg-blue-600" />
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-3 leading-relaxed">
                Bookmark the opportunities you&apos;re interested in, track what you&apos;ve applied to, and share any listing in a tap.
              </p>
            </div>
          </div>
        </section>

        {/* Browse by location — no inventory counts yet */}
        {markets.length > 0 && (
          <section className="mb-14">
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Browse opportunities by location</h2>
              <Link href="/opportunities/locations" className="text-sm font-medium text-blue-600 dark:text-blue-400">All locations →</Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {/* Featured metro markets first (direct link into the curated market
                  pages, e.g. Atlanta), then states. */}
              {curatedMarkets()
                .filter((m) => m.indexable && m.stateCode && markets.includes(m.stateCode))
                .map((m) => (
                  <Link
                    key={m.slug}
                    href={`/opportunities/${m.slug}`}
                    className="px-4 py-2 rounded-full bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
                  >
                    {m.name}, {m.stateCode}
                  </Link>
                ))}
              {markets.map((code) => (
                <Link
                  key={code}
                  href={`/opportunities/${stateSlug(code)}`}
                  className="px-4 py-2 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm text-zinc-800 dark:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-700"
                >
                  {stateName(code)}
                </Link>
              ))}
              <Link href="/opportunities/locations" className="px-4 py-2 rounded-full border border-blue-200 dark:border-blue-900/50 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30">
                All locations →
              </Link>
            </div>
          </section>
        )}

        {/* Open beta (growth story) + final CTA — two clear halves split by the shield */}
        <section className="mb-4 rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 p-7 sm:p-9 grid md:grid-cols-[1fr_auto_1fr] gap-6 md:gap-0 items-stretch">
          {/* Left half — growth story */}
          <div className="flex flex-col justify-center md:pr-8 text-center md:text-left">
            <span className="inline-block self-center md:self-start text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300">
              Open Beta
            </span>
            <h2 className="mt-2 text-xl font-bold text-zinc-900 dark:text-zinc-100">We&apos;re growing the Dock.</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1.5">
              GigDock is currently in open beta and we&apos;re adding new casting sources and markets regularly.
            </p>
            <a href="mailto:gigdocksupport@gmail.com?subject=GigDock%20feedback" className="inline-block mt-2.5 text-sm font-medium text-blue-600 dark:text-blue-400">
              Seeing a gig we missed? Tell us. →
            </a>
          </div>

          {/* Center — the GigDock shield as the divider between the two halves */}
          <div className="flex items-center justify-center py-4 md:py-0 md:px-8 border-y md:border-y-0 md:border-x border-blue-200 dark:border-blue-900/50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/gigdock-logo.png" alt="GigDock" className="h-16 w-16 sm:h-20 sm:w-20 shrink-0" />
          </div>

          {/* Right half — final CTA */}
          <div className="flex flex-col justify-center md:pl-8 text-center md:text-left">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Ready to find opportunities that fit you?</h3>
            <Link href="/signup" className="inline-block self-center md:self-start mt-3 px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm">
              Create your free account
            </Link>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">No credit card required.</p>
          </div>
        </section>

        <AppCta center heading="See everything GigDock can do" ctaLabel="See how GigDock works">
          Find casting calls here, then track the gigs you book — dates, hours, bumps, and what you were paid, gross and
          net — in the GigDock app. It&rsquo;s in beta now, ahead of launch.
        </AppCta>
      </div>
    </PublicShell>
  );
}
