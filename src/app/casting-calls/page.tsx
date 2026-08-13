import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase-server";
import PublicShell from "@/components/PublicShell";
import { stateName, stateSlug } from "@/lib/markets";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Opportunities by Location",
  description:
    "Find film & TV casting opportunities by state. GigDock brings opportunities from multiple sources together so you can see what's open in your market.",
  alternates: { canonical: "/casting-calls" },
  openGraph: { title: "Opportunities by Location · GigDock", type: "website", siteName: "GigDock" },
};

async function getMarkets(): Promise<{ code: string; count: number }[]> {
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
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count || stateName(a.code).localeCompare(stateName(b.code)));
}

export default async function CastingCallsHub() {
  const markets = await getMarkets();
  const total = markets.reduce((n, m) => n + m.count, 0);

  return (
    <PublicShell>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
          Opportunities by location
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-2">
          {total > 0
            ? `${total.toLocaleString()} open opportunities across ${markets.length} ${markets.length === 1 ? "region" : "regions"}. Pick a state to see what's open now.`
            : "Browse opportunities by state. New ones post daily."}
        </p>

        {markets.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-6">
            {markets.map((m) => (
              <Link
                key={m.code}
                href={`/casting-calls/${stateSlug(m.code)}`}
                className="flex items-center justify-between px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
              >
                <span className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{stateName(m.code)}</span>
                <span className="text-sm text-zinc-500 dark:text-zinc-400 shrink-0 ml-2">{m.count}</span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-6">
            <Link href="/opportunities" className="text-blue-600 dark:text-blue-400 font-medium">Browse all opportunities →</Link>
          </div>
        )}
      </div>
    </PublicShell>
  );
}
