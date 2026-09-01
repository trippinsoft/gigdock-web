import { createSupabasePublic } from "@/lib/supabase-public";
import { buildSitemapEntries, renderSitemapXml, type SitemapOpp } from "@/lib/sitemap-entries";

export const dynamic = "force-static";
export const revalidate = 3600;
export const runtime = "nodejs";

const XML_HEADERS = {
  "Content-Type": "application/xml; charset=utf-8",
  "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
  "Access-Control-Allow-Origin": "*",
};

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

export async function GET() {
  const opps = await loadSitemapOpportunities();
  const xml = renderSitemapXml(buildSitemapEntries(opps));
  return new Response(xml, { status: 200, headers: XML_HEADERS });
}
