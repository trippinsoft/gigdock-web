import type { MetadataRoute } from "next";
import { createSupabasePublic } from "@/lib/supabase-server";
import { buildSitemapEntries, type SitemapOpp } from "@/lib/sitemap-entries";

export const revalidate = 3600; // refresh hourly
export const dynamic = "force-static";

async function loadSitemapOpportunities(): Promise<SitemapOpp[]> {
  try {
    const supabase = createSupabasePublic();
    if (!supabase) return [];

    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("opportunities")
      .select("id, updated_at, match_state")
      .eq("status", "active")
      .is("deleted_at", null)
      .or(`expires_at.is.null,expires_at.gte.${today}`)
      .order("posted_at", { ascending: false })
      .limit(5000);

    if (error) {
      console.error("sitemap opportunities query failed:", error.message);
      return [];
    }
    return (data ?? []) as SitemapOpp[];
  } catch (err) {
    console.error("sitemap opportunities fetch failed:", err);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const opps = await loadSitemapOpportunities();
  return buildSitemapEntries(opps);
}
