import type { MetadataRoute } from "next";
import { createSupabaseServer } from "@/lib/supabase-server";
import { stateSlug } from "@/lib/markets";

const BASE = "https://gigdock.co";

export const revalidate = 3600; // refresh hourly

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const today = new Date().toISOString().slice(0, 10);
  const supabase = await createSupabaseServer();

  const { data } = await supabase
    .from("opportunities")
    .select("id, updated_at, match_state")
    .eq("status", "active")
    .is("deleted_at", null)
    .or(`work_date.is.null,work_date.gte.${today}`)
    .order("posted_at", { ascending: false })
    .limit(5000);

  const opps = data ?? [];

  const oppUrls: MetadataRoute.Sitemap = opps.map((o) => ({
    url: `${BASE}/opportunities/${o.id}`,
    lastModified: o.updated_at ?? undefined,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  // One market page per state that currently has active opportunities.
  const states = Array.from(
    new Set(opps.map((o) => o.match_state).filter(Boolean) as string[])
  );
  const marketUrls: MetadataRoute.Sitemap = states.map((code) => ({
    url: `${BASE}/opportunities/${stateSlug(code)}`,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  return [
    { url: BASE, changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/opportunities`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/gigfit`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/opportunities/locations`, changeFrequency: "daily", priority: 0.8 },
    ...marketUrls,
    ...oppUrls,
  ];
}
