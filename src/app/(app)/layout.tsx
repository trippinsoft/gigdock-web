import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import {
  getSessionUser,
  getPlan,
  getProfileWithWorkRoles,
  hasExtraJobsBackground,
} from "@/lib/backoffice";

// The authenticated back-office is per-user and never cached or indexed.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// Narrow transient signup-handoff guard.
//
// A user reaches this layout only if they're signed in. If the session's
// user_metadata still carries `pending_draft_id` (the opaque
// onboarding_drafts id set by the pre-account wizard) AND their profile
// has work_roles_set_at IS NULL, they are in the brief post-signUp /
// pre-set_work_roles window — send them back to /signup/complete so the
// handoff can finish. Do NOT redirect purely because work_roles_set_at is
// NULL: existing unanswered users carry no pending metadata and must be
// completely unblocked (they see the optional Today banner instead).
//
// Once /signup/complete claims the draft, writes roles + markets +
// (optionally) the performer profile, and clears the metadata, this
// guard becomes a no-op forever for that user. No launch date, no
// grandfather column, no persistent onboarding-state architecture.
function hasPendingDraftMetadata(meta: unknown): boolean {
  const m = (meta ?? {}) as {
    pending_draft_id?: unknown;
    pending_work_roles?: unknown; // legacy — pre-draft schema
  };
  if (typeof m.pending_draft_id === "string" && m.pending_draft_id.length > 0) return true;
  // Back-compat: users still mid-handoff from the older metadata-based
  // scheme are also routed to /signup/complete, which clears both keys.
  if (Array.isArray(m.pending_work_roles) && m.pending_work_roles.length > 0) return true;
  return false;
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  // Middleware already gates these routes; this is a defense-in-depth check and
  // also gives the shell the user's email.
  if (!user) redirect("/login");

  if (hasPendingDraftMetadata(user.user_metadata)) {
    // Only pay the extra profile fetch when a signup handoff is in flight —
    // existing users have zero pending metadata and skip this branch.
    const profile = await getProfileWithWorkRoles();
    if (profile && !profile.work_roles_set_at) {
      redirect("/signup/complete");
    }
  }

  const [plan, hasExtraJobs] = await Promise.all([
    getPlan(),
    hasExtraJobsBackground(),
  ]);
  return (
    <AppShell userEmail={user.email} plan={plan} hasExtraJobs={hasExtraJobs}>
      {children}
    </AppShell>
  );
}
