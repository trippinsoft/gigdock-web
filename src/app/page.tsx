import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import PublicShell from "@/components/PublicShell";
import { stateName, stateSlug } from "@/lib/markets";

export const metadata: Metadata = {
  title: "GigDock — Casting Calls & Gigs Matched to You",
  description:
    "GigDock brings casting calls and gig work from across the web into one place — matched to your profile, so you never miss the right one.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "GigDock — Casting Calls & Gigs Matched to You",
    description:
      "Casting calls in one feed, matched to you. Browse, save, apply, and share.",
    type: "website",
    siteName: "GigDock",
  },
};

async function getStats() {
  const today = new Date().toISOString().slice(0, 10);
  const supabase = await createSupabaseServer();
  const { data, count } = await supabase
    .from("opportunities")
    .select("match_state", { count: "exact" })
    .eq("status", "active")
    .is("deleted_at", null)
    .or(`work_date.is.null,work_date.gte.${today}`)
    .limit(5000);

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const s = row.match_state as string | null;
    if (s) counts.set(s, (counts.get(s) ?? 0) + 1);
  }
  const markets = Array.from(counts.entries())
    .map(([code, n]) => ({ code, n }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 12);
  return { total: count ?? 0, marketCount: counts.size, markets };
}

export default async function Home() {
  // Signed-in users skip the marketing page and go straight to the feed;
  // first-time visitors and crawlers see the landing.
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/opportunities");

  const { total, marketCount, markets } = await getStats();

  return (
    <PublicShell>
      <div className="max-w-3xl mx-auto">
        {/* Hero */}
        <section className="text-center pt-8 pb-10">
          <span className="inline-block text-xs font-semibold tracking-[0.14em] uppercase text-blue-600 dark:text-blue-400">
            The home for your gig life
          </span>
          <h1 className="mt-3 text-3xl sm:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 text-balance">
            Never miss a gig that fits you
          </h1>
          <p className="mt-4 text-base sm:text-lg text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto">
            GigDock brings casting calls and gig work from across the web into one
            feed — matched to your profile, so the right opportunity finds you.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/opportunities"
              className="px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm"
            >
              Browse opportunities
            </Link>
            <Link
              href="/casting-calls"
              className="px-6 py-3 rounded-full border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              By location
            </Link>
          </div>
          {total > 0 && (
            <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">{total.toLocaleString()}</span> open
              opportunities across <span className="font-semibold text-zinc-800 dark:text-zinc-200">{marketCount}</span>{" "}
              {marketCount === 1 ? "region" : "regions"} right now.
            </p>
          )}
          <p className="mt-6 text-xs text-zinc-400 dark:text-zinc-500 max-w-md mx-auto">
            GigDock is in open beta — we&apos;re still expanding what we cover.
          </p>
          <Link
            href="/feedback"
            className="mt-1.5 inline-block text-xs text-blue-600 dark:text-blue-400 underline underline-offset-2"
          >
            Seeing a gig we missed? Tell us.
          </Link>
        </section>

        {/* What you get */}
        <section className="grid sm:grid-cols-3 gap-3">
          {[
            { h: "Many sources, one feed", p: "Casting posts from across the web, normalized into one clean, searchable place." },
            { h: "GigFit — matched to you", p: "See at a glance which calls fit your profile, and which are a long shot." },
            { h: "Save, apply & share", p: "Bookmark gigs, track what you've applied to, and share any opportunity in a tap." },
          ].map((f) => (
            <div key={f.h} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">{f.h}</h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1.5 leading-relaxed">{f.p}</p>
            </div>
          ))}
        </section>

        {/* Browse by location */}
        {markets.length > 0 && (
          <section className="mt-10">
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Opportunities by location</h2>
              <Link href="/casting-calls" className="text-sm font-medium text-blue-600 dark:text-blue-400">All locations →</Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {markets.map((m) => (
                <Link
                  key={m.code}
                  href={`/casting-calls/${stateSlug(m.code)}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm text-zinc-800 dark:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-700"
                >
                  {stateName(m.code)}
                  <span className="text-zinc-400 dark:text-zinc-500">{m.n}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Bottom CTA */}
        <section className="mt-12 mb-4 rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 p-7 text-center">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Find your next gig</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1.5 max-w-md mx-auto">
            Build a quick profile and GigDock highlights the calls that fit you — free.
          </p>
          <Link
            href="/opportunities"
            className="inline-block mt-4 px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm"
          >
            Browse opportunities
          </Link>
        </section>
      </div>
    </PublicShell>
  );
}
