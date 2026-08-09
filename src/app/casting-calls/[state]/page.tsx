import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import type { Opportunity } from "@/lib/types";
import PublicShell from "@/components/PublicShell";
import { codeForSlug, stateName } from "@/lib/markets";

const BASE = "https://gigdock.co";
export const revalidate = 3600;

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function shortDate(input: string | null): string | null {
  if (!input) return null;
  const [y, m, d] = input.split("T")[0].split("-").map(Number);
  if (!y || !m || !d) return null;
  return `${MONTHS[m - 1]} ${d}`;
}

async function getMarket(code: string): Promise<Opportunity[]> {
  const today = new Date().toISOString().slice(0, 10);
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("opportunities")
    .select("*")
    .eq("status", "active")
    .is("deleted_at", null)
    .eq("match_state", code)
    .or(`work_date.is.null,work_date.gte.${today}`)
    .order("posted_at", { ascending: false })
    .limit(200);
  return (data ?? []) as Opportunity[];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ state: string }>;
}): Promise<Metadata> {
  const { state } = await params;
  const code = codeForSlug(state);
  if (!code) return { title: "Casting Calls" };
  const name = stateName(code);
  const title = `Casting Calls & Gigs in ${name}`;
  return {
    title,
    description: `Current casting calls, background roles, and gig work in ${name}. Browse open opportunities on GigDock and find the ones that fit you.`,
    alternates: { canonical: `/casting-calls/${state}` },
    openGraph: { title: `${title} · GigDock`, type: "website", siteName: "GigDock" },
  };
}

function OppCard({ o }: { o: Opportunity }) {
  const shoot = shortDate(o.work_date);
  return (
    <Link
      href={`/opportunities/${o.id}`}
      className="flex items-start gap-3 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
    >
      {o.image_url && (
        <span className="shrink-0 w-12 h-12 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={o.image_url} alt="" className="w-full h-full object-cover" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-2">{o.title}</h2>
        <div className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
          {[o.source, o.location, shoot].filter(Boolean).join(" · ")}
        </div>
        {o.pay_rate && <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mt-1">{o.pay_rate}</div>}
      </div>
    </Link>
  );
}

export default async function StateMarketPage({
  params,
}: {
  params: Promise<{ state: string }>;
}) {
  const { state } = await params;
  const code = codeForSlug(state);
  if (!code) notFound();
  const name = stateName(code);
  const opps = await getMarket(code);

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: opps.slice(0, 50).map((o, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${BASE}/opportunities/${o.id}`,
      name: o.title,
    })),
  };

  return (
    <PublicShell>
      {opps.length > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />
      )}
      <div className="max-w-3xl mx-auto">
        <nav className="text-sm text-zinc-500 dark:text-zinc-400 mb-3">
          <Link href="/casting-calls" className="hover:text-zinc-800 dark:hover:text-zinc-200">Casting Calls</Link>
          <span className="mx-1.5">›</span>
          <span className="text-zinc-700 dark:text-zinc-300">{name}</span>
        </nav>

        <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
          Casting calls &amp; gigs in {name}
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-2">
          {opps.length > 0
            ? `${opps.length} open ${opps.length === 1 ? "opportunity" : "opportunities"} in ${name} right now — background, featured, stand-in, and more.`
            : `No open casting calls in ${name} at the moment. New ones post daily — check back or browse everywhere.`}
        </p>

        {opps.length > 0 && (
          <div className="space-y-2 mt-6">
            {opps.map((o) => <OppCard key={o.id} o={o} />)}
          </div>
        )}

        <div className="mt-8 rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 p-6 text-center">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">See gigs matched to you</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 max-w-md mx-auto">
            GigDock filters casting calls by role, pay, and location, and shows which ones fit your profile.
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
