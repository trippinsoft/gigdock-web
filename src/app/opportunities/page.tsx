import type { Metadata } from "next";
import Link from "next/link";
import OpportunitiesFeed from "@/components/OpportunitiesFeed";
import AppShell from "@/components/AppShell";
import PublicShell from "@/components/PublicShell";
import {
  getSessionUser,
  getPlan,
  getProfileWithWorkRoles,
  hasPerformerRole,
  hasExtraJobsBackground,
} from "@/lib/backoffice";
import { loadActiveOpportunities } from "@/lib/load-opportunities";

export const metadata: Metadata = {
  title: "Background Acting Opportunities | GigDock & ExtraJobs",
  description:
    "Looking for background acting opportunities? Browse them at ExtraJobs, or sign in to GigDock to find opportunities provided by ExtraJobs inside your gig workspace.",
  alternates: { canonical: "/opportunities" },
  openGraph: {
    title: "Background Acting Opportunities | GigDock & ExtraJobs",
    description:
      "Background acting opportunities are available at ExtraJobs and inside your GigDock account.",
    type: "website",
    siteName: "GigDock",
  },
};

// Preserve bookmarked /opportunities links: signed-out visitors see a clear
// path to ExtraJobs, while signed-in users retain the existing in-app feed.
export default async function OpportunitiesPage() {
  const user = await getSessionUser();
  const now = Date.now();

  // Public visitors no longer see a duplicate opportunity directory.
  if (!user) {
    return (
      <PublicShell>
      <div className="mx-auto max-w-3xl py-6 sm:py-10">
        <div className="rounded-2xl border border-zinc-200 bg-white p-7 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-12">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">
            Looking for background acting opportunities?
          </h1>
          <p className="mt-5 text-lg font-semibold text-zinc-800 dark:text-zinc-200">
            They’re now at ExtraJobs.
          </p>
          <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
            Browse background acting opportunities on ExtraJobs, our dedicated opportunity-discovery site.
          </p>
          <a
            href="https://extrajobs.co"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-7 inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Browse Opportunities on ExtraJobs →
          </a>
        </div>
        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-7 text-center dark:border-zinc-800 dark:bg-zinc-900 sm:p-9">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            Finding gigs is just the beginning.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
            GigDock helps background actors, stand-ins, and photo doubles manage everything that comes after finding work. Track gigs and work dates, monitor earnings and outstanding payments, organize documents, and understand your income — all in one place.
          </p>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            You can also find opportunities provided by{" "}
            <a href="https://extrajobs.co" target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 underline-offset-2 hover:underline dark:text-blue-400">ExtraJobs</a>{" "}
            right inside your GigDock account.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/features"
              className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              Explore GigDock Features
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Create a Free Account
            </Link>
          </div>
        </div>
        <p className="mt-5 text-center text-sm text-zinc-600 dark:text-zinc-400">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-blue-600 hover:underline dark:text-blue-400">Sign In</Link>
        </p>
      </div>
      </PublicShell>
    );
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
