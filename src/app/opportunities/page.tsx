import type { Metadata } from "next";
import OpportunitiesFeed from "@/components/OpportunitiesFeed";
import AppShell from "@/components/AppShell";
import {
  getSessionUser,
  getPlan,
  getProfileWithWorkRoles,
  hasPerformerRole,
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
  const [user, opps] = await Promise.all([getSessionUser(), loadActiveOpportunities()]);
  const now = Date.now();
  if (user) {
    const [plan, roleGate, isPerformer] = await Promise.all([
      getPlan(),
      getProfileWithWorkRoles(),
      hasPerformerRole(),
    ]);
    // Crew-only viewer (answered roles, no performer role) — suppress
    // GigFit UI. Users who have not yet answered roles keep the current
    // behavior.
    const workRolesSet = !!roleGate?.work_roles_set_at;
    const hideGigFit = workRolesSet && !isPerformer;
    return (
      <AppShell userEmail={user.email} plan={plan}>
        <OpportunitiesFeed bareChrome initialOpps={opps} now={now} hideGigFit={hideGigFit} />
      </AppShell>
    );
  }
  return <OpportunitiesFeed initialOpps={opps} now={now} />;
}
