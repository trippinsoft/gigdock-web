import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  getProfileWithWorkRoles,
  getSessionUser,
  getWorkRolesCatalog,
} from "@/lib/backoffice";
import { updateWorkRoles } from "@/lib/backoffice-actions";
import { createSupabaseServer } from "@/lib/supabase-server";
import { safeNext } from "@/lib/workRolesLaunch";
import CompleteRecovery from "./CompleteRecovery";

// URL: /signup/complete?next=<safe-path>
//
// The single post-auth handoff for BOTH auto-confirm and email-confirm
// signups. Runs under the (signup) route-group shell (no app nav).
//
// Behavior:
//   1. Requires an authenticated session. No session → bounce to /signup.
//   2. If work_roles_set_at is already populated, treat as idempotent
//      success: clear any stale pending metadata and redirect to `next`
//      (or /profile?from=onboarding&next=... if the user opted into
//      GigFit setup).
//   3. Otherwise, if the session carries pending_work_roles metadata,
//      call updateWorkRoles (the existing set_work_roles RPC wrapper).
//      On success + verified persistence, clear metadata and redirect.
//   4. If the write fails, or pending metadata is missing/incomplete,
//      keep the user on this page and render the recovery UI
//      (WorkRolesPicker + retry). We deliberately do NOT bounce to the
//      authenticated /onboarding: the (app) transient guard would send
//      them right back here as long as pending metadata + unset roles
//      persist, creating a redirect loop.

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Finishing signup — GigDock",
  robots: { index: false, follow: false },
};

type PendingMeta = {
  pending_work_roles?: unknown;
  pending_work_roles_other?: unknown;
  pending_wants_gigfit?: unknown;
};

function readPending(meta: unknown): {
  roles: string[] | null;
  other: string | null;
  wantsGigfit: boolean;
} {
  const m = (meta ?? {}) as PendingMeta;
  const rawRoles = m.pending_work_roles;
  const roles =
    Array.isArray(rawRoles) && rawRoles.every((v) => typeof v === "string")
      ? (rawRoles as string[])
      : null;
  const other = typeof m.pending_work_roles_other === "string" ? m.pending_work_roles_other : null;
  const wantsGigfit = m.pending_wants_gigfit === true;
  return { roles, other, wantsGigfit };
}

function successDestination(nextPath: string, wantsGigfit: boolean): string {
  return wantsGigfit
    ? `/profile?from=onboarding&next=${encodeURIComponent(nextPath)}`
    : nextPath;
}

async function clearPending(): Promise<void> {
  const supabase = await createSupabaseServer();
  try {
    await supabase.auth.updateUser({
      data: {
        pending_work_roles: null,
        pending_work_roles_other: null,
        pending_has_performer_role: null,
        pending_wants_gigfit: null,
      },
    });
  } catch {
    // Non-fatal: metadata will linger but roles are set, so the (app)
    // guard's `pending_work_roles is truthy` check may still trip. We
    // guard against that by also treating an empty array / null as
    // absent in the (app) layout check.
  }
}

export default async function CompleteSignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  const nextPath = safeNext(sp.next, "/today");

  const user = await getSessionUser();
  if (!user) {
    redirect(`/signup?next=${encodeURIComponent(nextPath)}`);
  }

  const { roles: pendingRoles, other: pendingOther, wantsGigfit } = readPending(
    user.user_metadata
  );

  const profile = await getProfileWithWorkRoles();

  // (2) Idempotent success — roles already recorded.
  if (profile?.work_roles_set_at) {
    if (pendingRoles || pendingOther !== null || wantsGigfit) {
      await clearPending();
    }
    redirect(successDestination(nextPath, wantsGigfit));
  }

  // (3) Attempt the handoff write if pending metadata is well-formed.
  if (pendingRoles && pendingRoles.length > 0) {
    const res = await updateWorkRoles(pendingRoles, pendingOther);
    if (res.ok) {
      const verify = await getProfileWithWorkRoles();
      if (verify?.work_roles_set_at) {
        await clearPending();
        redirect(successDestination(nextPath, wantsGigfit));
      }
    }
  }

  // (4) Recovery — either no usable pending metadata or the write failed.
  //     Render the picker in-place and let the user save. The (app) guard
  //     keeps them contained here until work_roles_set_at is populated.
  const catalog = await getWorkRolesCatalog();
  return (
    <CompleteRecovery
      catalog={catalog}
      nextPath={nextPath}
      wantsGigfit={wantsGigfit}
      initialSelected={pendingRoles ?? []}
      initialOther={pendingOther ?? ""}
    />
  );
}
