import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { getSessionUser, getPlan, getProfileWithWorkRoles } from "@/lib/backoffice";

// The authenticated back-office is per-user and never cached or indexed.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// Narrow transient signup-handoff guard.
//
// A user reaches this layout only if they're signed in. If the session's
// user_metadata still carries `pending_work_roles` AND their profile has
// work_roles_set_at IS NULL, they are in the brief post-signUp /
// pre-set_work_roles window — send them back to /signup/complete so the
// handoff can finish. Do NOT redirect purely because work_roles_set_at is
// NULL: existing unanswered users carry no pending metadata and must be
// completely unblocked (they see the optional Today banner instead).
//
// Once /signup/complete calls set_work_roles and clears the metadata, this
// guard becomes a no-op forever for that user. No launch date, no
// grandfather column, no persistent onboarding-state architecture.
function hasPendingWorkRolesMetadata(meta: unknown): boolean {
  const roles = (meta as { pending_work_roles?: unknown } | null)?.pending_work_roles;
  return Array.isArray(roles) && roles.length > 0;
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

  if (hasPendingWorkRolesMetadata(user.user_metadata)) {
    // Only pay the extra profile fetch when a signup handoff is in flight —
    // existing users have zero pending metadata and skip this branch.
    const profile = await getProfileWithWorkRoles();
    if (profile && !profile.work_roles_set_at) {
      redirect("/signup/complete");
    }
  }

  const plan = await getPlan();
  return <AppShell userEmail={user.email} plan={plan}>{children}</AppShell>;
}
