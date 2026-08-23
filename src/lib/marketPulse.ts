// Server-only helper: real 30-day activity for a market, for use in guides that
// want a clearly-labeled "what GigDock is seeing" data box. Mirrors the location
// page's market-pulse query so the numbers agree. NEVER returns guessed values —
// callers omit a line when its value is empty/zero.

import { createSupabaseServer } from "@/lib/supabase-server";
import { belongsToMarket, type MarketSpec } from "@/lib/marketContent";

export type MarketPulse = {
  /** Opportunities posted in the market in the last 30 days. */
  callsTracked: number;
  /** Distinct casting sources those came from. */
  castingSources: number;
  /** Most-represented cities/areas, most first. */
  topCities: string[];
};

const cityOf = (loc: string | null): string | null => {
  const c = (loc ?? "").split(",")[0].trim();
  return c || null;
};

export async function getMarketPulse(spec: MarketSpec): Promise<MarketPulse> {
  const supabase = await createSupabaseServer();
  const since = new Date(Date.now() - 30 * 864e5).toISOString();
  const { data } = await supabase
    .from("opportunities")
    .select("source, location, title, summary, posted_at")
    .eq("match_state", spec.stateCode)
    .in("status", ["active", "expired"])
    .gte("posted_at", since)
    .limit(3000);

  const rows = (data ?? []).filter((r) =>
    belongsToMarket(spec, r as { title: string | null; summary: string | null; location: string | null })
  );

  const sources = new Set<string>();
  const cities = new Map<string, number>();
  for (const r of rows) {
    if (r.source) sources.add(r.source as string);
    const c = cityOf(r.location as string | null);
    if (c) cities.set(c, (cities.get(c) ?? 0) + 1);
  }

  return {
    callsTracked: rows.length,
    castingSources: sources.size,
    topCities: [...cities.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([c]) => c),
  };
}
