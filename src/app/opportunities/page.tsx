import type { Metadata } from "next";
import Link from "next/link";
import OpportunitiesFeed from "@/components/OpportunitiesFeed";
import AppShell from "@/components/AppShell";
import {
  getSessionUser,
  getPlan,
  getProfileWithWorkRoles,
  hasPerformerRole,
  hasExtraJobsBackground,
} from "@/lib/backoffice";
import { loadActiveOpportunities } from "@/lib/load-opportunities";

export const metadata: Metadata = {
  title: "Browse Film & TV Casting Calls & Opportunities",
  description:
    "Search current film & TV casting calls and background acting opportunities from across the web in one feed, matched to you with GigFit.",
  alternates: { canonical: "/opportunities" },
  openGraph: {
    title: "Film & TV Casting Calls & Opportunities · GigDock",
    description:
      "Current film & TV casting calls from many sources in one searchable feed, matched to you with GigFit.",
    type: "website",
    siteName: "GigDock",
  },
};

// Opportunities is both a public/SEO surface and an in-app workspace. Signed-in
// users get the authenticated AppShell (left nav) so it matches the rest of the
// back-office; logged-out visitors and crawlers get the public shell (unchanged
// content + metadata, so SEO is unaffected).
export default async function OpportunitiesPage() {
  const user = await getSessionUser();
  const now = Date.now();

  // Public / signed-out visitor: unchanged behavior. Opportunities remain
  // a public SEO surface with the full feed and no gating.
  if (!user) {
    const opps = await loadActiveOpportunities();
    return <OpportunitiesFeed initialOpps={opps} now={now} />;
  }

  // Signed-in visitor: the ExtraJobs background connection gates the
  // in-app feed. OFF means we do not fetch or render active
  // opportunities — a compact rebound explains the state and links to
  // /connections. The connection is server-authoritative (RPC), so this
  // survives navigation and reload without any client state.
  const [plan, extrajobs] = await Promise.all([getPlan(), hasExtraJobsBackground()]);
  if (!extrajobs) {
    return (
      <AppShell userEmail={user.email} plan={plan} hasExtraJobs={false}>
        <div className="max-w-3xl mx-auto py-10">
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 sm:p-8 text-center">
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              Background opportunities are turned off
            </h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed max-w-xl mx-auto">
              Your Saved opportunities, Applied history, gigs created from
              opportunities, and alert preferences are preserved. Turn
              Background opportunities back on to see the feed and
              matches again.
            </p>
            <Link
              href="/connections"
              className="mt-5 inline-flex items-center rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-semibold text-white"
            >
              Manage connections →
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const [opps, roleGate, isPerformer] = await Promise.all([
    loadActiveOpportunities(),
    getProfileWithWorkRoles(),
    hasPerformerRole(),
  ]);
  // Crew-only viewer (answered roles, no performer role) — suppress
  // GigFit UI. Users who have not yet answered roles keep the current
  // behavior.
  const workRolesSet = !!roleGate?.work_roles_set_at;
  const hideGigFit = workRolesSet && !isPerformer;
  return (
    <AppShell userEmail={user.email} plan={plan} hasExtraJobs={true}>
      <OpportunitiesFeed bareChrome initialOpps={opps} now={now} hideGigFit={hideGigFit} />
    </AppShell>
  );
}
