import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase-server";
import type { Opportunity } from "@/lib/types";
import OpportunityCard from "@/components/OpportunityCard";
import PublicShell from "@/components/PublicShell";
import ShareButton from "@/components/ShareButton";

// Public, shareable single-opportunity page. Server-rendered so shared links get
// rich previews (Open Graph) and work for people who don't have GigDock yet.

async function getOpportunity(id: string): Promise<Opportunity | null> {
  // Reject obviously non-uuid ids fast (avoids a DB round-trip on junk paths).
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const opp = await getOpportunity(id);
  if (!opp) return { title: "Opportunity — GigDock" };

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

  if (!opp) {
    return (
      <PublicShell>
        <div className="max-w-md mx-auto text-center py-16">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            Opportunity not available
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
            This casting opportunity may have expired or been filled.
          </p>
          <Link
            href="/opportunities"
            className="inline-block mt-4 px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm"
          >
            Browse opportunities
          </Link>
        </div>
      </PublicShell>
    );
  }

  const inactive = opp.status !== "active";

  return (
    <PublicShell>
      <div className="max-w-2xl mx-auto">
        {inactive && (
          <div className="mb-4 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/30 px-4 py-2.5 text-sm text-amber-800 dark:text-amber-300">
            This opportunity may no longer be active.
          </div>
        )}

        <OpportunityCard
          opp={opp}
          hideAdminMeta
          actions={<ShareButton id={opp.id} title={opp.title} />}
        />

        <div className="mt-6 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 text-center">
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            Find casting gigs that fit you
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            GigDock surfaces opportunities matched to your profile — never miss the right one.
          </p>
          <Link
            href="/opportunities"
            className="inline-block mt-4 px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm"
          >
            Browse all opportunities
          </Link>
        </div>
      </div>
    </PublicShell>
  );
}
