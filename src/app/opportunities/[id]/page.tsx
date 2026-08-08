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

// A few more active opportunities to pull a cold visitor into the feed, plus the
// total open count. Prefers the same state as the shared gig, then fills with recent.
async function getMore(
  currentId: string,
  state: string | null
): Promise<{ more: Opportunity[]; total: number }> {
  const supabase = await createSupabaseServer();
  const today = new Date().toISOString().slice(0, 10);
  const base = supabase
    .from("opportunities")
    .select("*")
    .eq("status", "active")
    .is("deleted_at", null)
    .neq("id", currentId)
    .or(`work_date.is.null,work_date.gte.${today}`)
    .order("posted_at", { ascending: false })
    .limit(12);

  const [{ data }, countRes] = await Promise.all([
    base,
    supabase
      .from("opportunities")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .is("deleted_at", null),
  ]);

  const rows = (data ?? []) as Opportunity[];
  // Same state first (relevance), then the rest.
  const sorted = state
    ? [...rows.filter((r) => r.match_state === state), ...rows.filter((r) => r.match_state !== state)]
    : rows;
  return { more: sorted.slice(0, 5), total: countRes.count ?? 0 };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function shortDate(input: string | null): string | null {
  if (!input) return null;
  const [y, m, d] = input.split("T")[0].split("-").map(Number);
  if (!y || !m || !d) return null;
  return `${MONTHS[m - 1]} ${d}`;
}

function MiniCard({ o }: { o: Opportunity }) {
  const shoot = shortDate(o.work_date);
  return (
    <Link
      href={`/opportunities/${o.id}`}
      className="flex items-start gap-3 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
    >
      {o.image_url && (
        <span className="shrink-0 w-11 h-11 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={o.image_url} alt="" className="w-full h-full object-cover" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-2">{o.title}</h3>
        <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
          {[o.source, o.location, shoot].filter(Boolean).join(" · ")}
        </div>
        {o.pay_rate && <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mt-1">{o.pay_rate}</div>}
      </div>
    </Link>
  );
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
  const { more, total } = await getMore(opp.id, opp.match_state);
  const stateName = opp.match_state;

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

        {/* Pull the visitor into the wider feed. */}
        {more.length > 0 && (
          <section className="mt-8">
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                {stateName ? `More casting calls in ${stateName}` : "More casting calls"}
              </h2>
              <Link href="/opportunities" className="text-sm font-medium text-blue-600 dark:text-blue-400">
                See all →
              </Link>
            </div>
            <div className="space-y-2">
              {more.map((o) => (
                <MiniCard key={o.id} o={o} />
              ))}
            </div>
          </section>
        )}

        <div className="mt-8 rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 p-6 text-center">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            Looking for more gigs?
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 max-w-md mx-auto">
            {total > 0
              ? `${total.toLocaleString()} open casting calls on GigDock — filter by role, pay, and location, and see which ones fit you.`
              : "Browse casting calls on GigDock — filter by role, pay, and location, and see which ones fit you."}
          </p>
          <Link
            href="/opportunities"
            className="inline-block mt-4 px-6 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm"
          >
            Browse all opportunities
          </Link>
        </div>
      </div>
    </PublicShell>
  );
}
