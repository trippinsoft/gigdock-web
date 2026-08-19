import type { Metadata } from "next";
import { createSupabaseServer } from "@/lib/supabase-server";
import type { Opportunity } from "@/lib/types";
import OpportunitiesFeed from "@/components/OpportunitiesFeed";
import LocationListing from "@/components/LocationListing";
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

const CA_STATES = new Set(["AB","BC","MB","NB","NL","NS","NT","NU","ON","PE","QC","SK","YT"]);

// Google for Jobs structured data (JSON-LD) for a single opportunity.
function jobPostingLd(o: Opportunity) {
  const descParts = [
    o.summary,
    o.requirements && `Requirements: ${o.requirements}`,
    o.application_info && `How to apply: ${o.application_info}`,
  ].filter(Boolean);

  const ld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: o.title,
    description: descParts.join("<br/><br/>") || o.title,
    datePosted: o.posted_at,
    employmentType: "CONTRACTOR",
    hiringOrganization: { "@type": "Organization", name: o.source || "GigDock" },
    identifier: { "@type": "PropertyValue", name: "GigDock", value: o.id },
    directApply: false,
  };

  const validThrough = o.apply_by || o.work_date;
  if (validThrough) ld.validThrough = `${validThrough}T23:59:59`;

  const region = o.match_state ?? undefined;
  const country = region && CA_STATES.has(region) ? "CA" : "US";

  if (/remote/i.test(`${o.location ?? ""} ${o.title ?? ""}`)) {
    ld.jobLocationType = "TELECOMMUTE";
    ld.applicantLocationRequirements = { "@type": "Country", name: country };
  } else {
    const locality = o.location ? o.location.split(",")[0].trim() : undefined;
    ld.jobLocation = {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        ...(locality ? { addressLocality: locality } : {}),
        ...(region ? { addressRegion: region } : {}),
        addressCountry: country,
      },
    };
  }
  return ld;
}

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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jobPostingLd(opp)) }}
        />
      )}
      <OpportunitiesFeed initialSelectedId={slug} />
    </>
  );
}
