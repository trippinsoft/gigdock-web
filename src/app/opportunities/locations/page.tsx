import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase-server";
import PublicShell from "@/components/PublicShell";
import { stateName, stateSlug } from "@/lib/markets";
import { curatedMarkets, belongsToMarket, type MarketSpec } from "@/lib/marketContent";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Film & TV Opportunities by Location",
  description:
    "Find film & TV casting opportunities by market and state. GigDock aggregates casting calls from across the web — browse the markets and states where work is posting now.",
  alternates: { canonical: "/opportunities/locations" },
  openGraph: { title: "Opportunities by Location · GigDock", type: "website", siteName: "GigDock" },
};

type Row = { match_state: string | null; location: string | null; title: string | null; summary: string | null };

async function getInventory(): Promise<Row[]> {
  const today = new Date().toISOString().slice(0, 10);
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("opportunities")
    .select("match_state, location, title, summary")
    .eq("status", "active")
    .is("deleted_at", null)
    .or(`expires_at.is.null,expires_at.gte.${today}`)
    .limit(5000);
  return (data ?? []) as Row[];
}

// Live count for a curated market: opportunities in its state that mention it.
function marketCount(spec: MarketSpec, rows: Row[]): number {
  return rows.filter((o) => o.match_state === spec.stateCode && belongsToMarket(spec, o)).length;
}

export default async function LocationsHub() {
  const rows = await getInventory();

  // Curated markets that actually have inventory right now → clickable cards.
  const markets = curatedMarkets()
    .map((spec) => ({ spec, count: marketCount(spec, rows) }))
    .filter((m) => m.count > 0)
    .sort((a, b) => b.count - a.count || a.spec.name.localeCompare(b.spec.name));

  // Curated markets we're building toward but have no inventory yet → "coming soon".
  const soon = curatedMarkets().filter((spec) => marketCount(spec, rows) === 0);

  // Every state with active inventory (not a hand-picked few) → complete catch-all.
  const stateCounts = new Map<string, number>();
  for (const o of rows) if (o.match_state) stateCounts.set(o.match_state, (stateCounts.get(o.match_state) ?? 0) + 1);
  const states = Array.from(stateCounts.entries())
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count || stateName(a.code).localeCompare(stateName(b.code)));

  const total = rows.length;

  return (
    <PublicShell>
      <div className="max-w-5xl mx-auto">
        <nav className="text-sm text-zinc-500 dark:text-zinc-400 mb-3" aria-label="Breadcrumb">
          <Link href="/opportunities" className="hover:text-zinc-800 dark:hover:text-zinc-200">Opportunities</Link>
          <span className="mx-1.5">›</span>
          <span className="text-zinc-700 dark:text-zinc-300">By location</span>
        </nav>

        <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
          Film &amp; TV opportunities by location
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-2 leading-relaxed">
          GigDock aggregates casting calls from across the web. Here&rsquo;s where work is posting right now —
          {total > 0 ? ` ${total.toLocaleString()} open ${total === 1 ? "opportunity" : "opportunities"} across ${states.length} ${states.length === 1 ? "state" : "states"}.` : " new opportunities post throughout the day."}{" "}
          Pick a market or a state.
        </p>

        {/* ---------- Popular markets ---------- */}
        {markets.length > 0 && (
          <section className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Popular markets</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              {markets.map(({ spec, count }) => (
                <Link
                  key={spec.slug}
                  href={`/opportunities/${spec.slug}`}
                  className="flex items-center justify-between rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3.5 hover:border-blue-300 dark:hover:border-blue-800 hover:shadow-sm transition-all"
                >
                  <span className="min-w-0">
                    <span className="block font-semibold text-zinc-900 dark:text-zinc-100">{spec.name}, {spec.stateCode}</span>
                    <span className="block text-xs text-zinc-500 dark:text-zinc-400">{stateName(spec.stateCode!)} metro</span>
                  </span>
                  <span className="shrink-0 ml-3 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    {count} {count === 1 ? "opportunity" : "opportunities"}
                  </span>
                </Link>
              ))}
            </div>
            {soon.length > 0 && (
              <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
                More markets coming soon: {soon.map((m) => m.name).join(" · ")}.
              </p>
            )}
          </section>
        )}

        {/* ---------- Browse by state ---------- */}
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Browse by state</h2>
          {states.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
              {states.map((m) => (
                <Link
                  key={m.code}
                  href={`/opportunities/${stateSlug(m.code)}`}
                  className="flex items-center justify-between px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                >
                  <span className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{stateName(m.code)}</span>
                  <span className="text-sm text-zinc-500 dark:text-zinc-400 shrink-0 ml-2">{m.count}</span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-3">
              <Link href="/opportunities" className="text-blue-600 dark:text-blue-400 font-medium">Browse all opportunities →</Link>
            </div>
          )}
        </section>
      </div>
    </PublicShell>
  );
}
