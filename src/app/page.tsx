import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import type { Opportunity } from "@/lib/types";
import PublicShell from "@/components/PublicShell";
import { stateName, stateSlug } from "@/lib/markets";

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
    .or(`work_date.is.null,work_date.gte.${today}`)
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
    .or(`work_date.is.null,work_date.gte.${today}`)
    .order("posted_at", { ascending: false })
    .limit(24);
  const all = (data ?? []) as Opportunity[];
  // Prefer listings with artwork — the inventory is the homepage's imagery.
  const withImg = all.filter((o) => o.image_url);
  const withoutImg = all.filter((o) => !o.image_url);
  return [...withImg, ...withoutImg].slice(0, 6);
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
      <div className="flex gap-3 p-4">
        <span className="shrink-0 w-16 h-16 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
          {o.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={o.image_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="text-zinc-400">
              <rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 8h18M8 5v3M16 5v3" />
            </svg>
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-100 leading-snug line-clamp-2">{o.title}</h3>
          {o.source && <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">{o.source}</p>}
        </div>
        <span className="shrink-0 text-zinc-300 dark:text-zinc-600 group-hover:text-blue-500" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 3h12a1 1 0 011 1v17l-7-4-7 4V4a1 1 0 011-1z" /></svg>
        </span>
      </div>
      {meta && <div className="px-4 -mt-1 text-sm text-zinc-600 dark:text-zinc-300 truncate">{meta}</div>}
      {chips.length > 0 && (
        <div className="px-4 py-3 mt-2 border-t border-zinc-100 dark:border-zinc-800 flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <span key={c} className="text-xs px-2 py-0.5 rounded-full border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400">{c}</span>
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
        <section className="text-center pt-8 pb-10 max-w-3xl mx-auto">
          <span className="inline-block text-xs font-semibold tracking-[0.14em] uppercase text-blue-600 dark:text-blue-400">
            Your Gig Life. Simplified.
          </span>
          <h1 className="mt-3 text-4xl sm:text-6xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 text-balance">
            Never miss a gig that fits you
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
            <ValueProp icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 3 14h7l-1 8 10-12h-7z" /></svg>}>New opportunities added daily</ValueProp>
            <ValueProp icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z" /><path d="M9 12l2 2 4-4" /></svg>}>Matched to your profile</ValueProp>
            <ValueProp icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 3h12a1 1 0 011 1v17l-7-4-7 4V4a1 1 0 011-1z" /></svg>}>Save, apply &amp; share</ValueProp>
          </div>
        </section>

        {/* Live opportunity preview — real listings are the homepage's imagery */}
        {preview.length > 0 && (
          <section className="mb-14">
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Live opportunities</h2>
              <Link href="/opportunities" className="text-sm font-medium text-blue-600 dark:text-blue-400">View all opportunities →</Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {preview.map((o) => <OppPreviewCard key={o.id} o={o} />)}
            </div>
          </section>
        )}

        {/* How GigDock works — gather → personalize → act */}
        <section className="mb-14">
          <h2 className="text-center text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-8">How GigDock works</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {/* Many sources, one feed — the clearest wedge, given visual weight */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
              <div className="flex items-center gap-2 flex-wrap mb-4">
                {["Facebook", "Instagram", "Casting sites", "Production cos."].map((src) => (
                  <span key={src} className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">{src}</span>
                ))}
                <span className="text-zinc-400">→</span>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/gigdock-logo.png" alt="" className="h-3.5 w-3.5" /> One feed
                </span>
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Many sources. One feed.</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1.5 leading-relaxed">
                Stop checking casting sites and social feeds one by one. GigDock brings film &amp; TV opportunities together in one clean, searchable place.
              </p>
            </div>

            {/* GigFit */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
              <div className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 px-3 py-1.5 rounded-full">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.3 6.9.6-5.2 4.5 1.6 6.8L12 17l-6.2 3.7 1.6-6.8L2.2 8.9l6.9-.6z" /></svg>
                Your matches
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">GigFit — matched to you</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1.5 leading-relaxed">
                Tell us a little about yourself. GigFit compares casting requirements with your profile so you can quickly see which opportunities fit.
              </p>
            </div>

            {/* Save, apply & share */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
              <div className="mb-4 flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="h-8 w-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 3h12a1 1 0 011 1v17l-7-4-7 4V4a1 1 0 011-1z" /></svg>
                  </span>
                ))}
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Save, apply &amp; share</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1.5 leading-relaxed">
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

        {/* Open beta (growth story) + final CTA */}
        <section className="mb-4 rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 p-7 sm:p-9 grid md:grid-cols-2 gap-8 items-center">
          <div>
            <span className="inline-block text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300">
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
          <div className="flex items-center gap-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/gigdock-logo.png" alt="GigDock" className="hidden sm:block h-16 w-16 shrink-0" />
            <div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Ready to find opportunities that fit you?</h3>
              <Link href="/signup" className="inline-block mt-3 px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm">
                Create your free account
              </Link>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">No credit card required.</p>
            </div>
          </div>
        </section>
      </div>
    </PublicShell>
  );
}
