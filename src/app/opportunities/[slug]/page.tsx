import type { Metadata } from "next";
import { createSupabaseServer } from "@/lib/supabase-server";
import type { Opportunity } from "@/lib/types";
import OpportunitiesFeed from "@/components/OpportunitiesFeed";
import LocationListing from "@/components/LocationListing";
import TrackEvent from "@/components/TrackEvent";
import { codeForSlug } from "@/lib/markets";
import { getSeoMarket, stateSpec, type MarketSpec } from "@/lib/marketContent";

// A slug is a region market (atlanta-ga), a whole state (georgia), or a gig (uuid).
function resolveMarket(slug: string): MarketSpec | null {
  const market = getSeoMarket(slug);
  if (market) return market;
  const code = codeForSlug(slug);
  return code ? stateSpec(code, slug) : null;
}

// One dynamic slot under /opportunities serves two things, disambiguated by slug:
//   • a known state slug (e.g. "georgia")   -> the location listings page
//   • a UUID (a shared gig link)             -> that opportunity, in the live feed
// Keeping locations under /opportunities/<state> keeps the URL neutral as GigDock
// grows beyond casting calls (no "casting-calls" baked into the path).

async function getOpportunity(id: string): Promise<Opportunity | null> {
  if (!/^[0-9a-f-]{16,}$/i.test(id)) return null;
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("opportunities")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  return (data as Opportunity) ?? null;
}

// NOTE: We intentionally do NOT emit JobPosting structured data for aggregated
// opportunities. Google's JobPosting policy restricts posting on behalf of an
// organization without authorization, and GigDock aggregates third-party casting
// calls — so chasing the Google-for-Jobs experience with this markup is a policy
// risk (and the listing detail is client-rendered, so the markup wouldn't match
// visible content anyway). These pages still rank in normal search on their own
// merits; the location pages are the real SEO surface.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  // Location page metadata.
  const spec = resolveMarket(slug);
  if (spec) {
    const title = `${spec.name} Casting Calls & Background Acting Jobs`;
    // Market stubs we haven't deemed ready still render (to build capability) but
    // stay noindex so we never ship thin doorway pages; ready markets + states index.
    const noindex = spec.kind === "market" && !spec.indexable;
    return {
      title,
      description: spec.content.intro,
      alternates: { canonical: `/opportunities/${slug}` },
      ...(noindex ? { robots: { index: false, follow: true } } : {}),
      openGraph: { title: `${spec.name} Casting Calls · GigDock`, description: spec.content.intro, type: "website", siteName: "GigDock" },
    };
  }

  // Shared gig link metadata.
  const opp = await getOpportunity(slug);
  if (!opp) return { title: "Opportunities — GigDock" };

  const title = `${opp.title} — GigDock`;
  const description =
    opp.summary ||
    [opp.pay_rate, opp.location].filter(Boolean).join(" · ") ||
    "A casting opportunity on GigDock.";
  const images = opp.image_url ? [opp.image_url] : undefined;

  return {
    title,
    description,
    alternates: { canonical: `/opportunities/${slug}` },
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "GigDock",
      ...(images ? { images } : {}),
    },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title,
      description,
      ...(images ? { images } : {}),
    },
  };
}

export default async function OpportunitySlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Region market (atlanta-ga) or whole state (georgia) → location landing page.
  const spec = resolveMarket(slug);
  if (spec) return <LocationListing spec={spec} />;

  // Otherwise a shared gig link (or an unknown slug → feed with nothing selected).
  const opp = await getOpportunity(slug);
  return (
    <>
      {opp && (
        <>
          <TrackEvent
            event="opportunity_viewed"
            props={{
              opportunity_id: opp.id,
              production_name: opp.production_name,
              market: opp.match_state,
              source: opp.source,
              pay_min: opp.pay_min,
              surface: "shared_link",
            }}
          />
        </>
      )}
      <OpportunitiesFeed initialSelectedId={slug} />
    </>
  );
}
