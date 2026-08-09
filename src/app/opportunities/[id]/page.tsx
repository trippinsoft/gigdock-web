import type { Metadata } from "next";
import { createSupabaseServer } from "@/lib/supabase-server";
import type { Opportunity } from "@/lib/types";
import OpportunitiesFeed from "@/components/OpportunitiesFeed";

// A shared opportunity link. Server-rendered here only for the Open Graph preview
// (so pasted links show a rich card); the body is the full live feed with this
// gig pre-selected, so visitors land inside GigDock — filters, list, and all —
// not on a stripped single-post page.

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
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const opp = await getOpportunity(id);
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

export default async function OpportunityPublicPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const opp = await getOpportunity(id);
  return (
    <>
      {opp && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jobPostingLd(opp)) }}
        />
      )}
      <OpportunitiesFeed initialSelectedId={id} />
    </>
  );
}
