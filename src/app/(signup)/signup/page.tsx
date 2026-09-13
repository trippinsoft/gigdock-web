import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser, getWorkRolesCatalog } from "@/lib/backoffice";
import { safeNext } from "@/lib/workRolesLaunch";
import SignupWizard from "@/components/signup/SignupWizard";

// URL: /signup (route group `(signup)` supplies the standalone shell).
//
// The canonical new-user entry point. Every step of the pre-signup wizard
// runs inside SignupWizard on the client; this server component just
// resolves `safeNext(next)` + the anonymous work_roles_catalog and hands
// them down. Signed-in visitors are bounced away — they either already
// have an account (send to `next`) or are mid-handoff (send to
// /signup/complete which resolves the pending metadata + redirects).

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Create your GigDock account",
  robots: { index: false, follow: false },
};

type Intent = "save" | "applied" | "gigfit" | "manage" | "default";

function pickIntent(raw: string | undefined): Intent {
  return raw === "save" || raw === "applied" || raw === "gigfit" || raw === "manage"
    ? raw
    : "default";
}

function pickCompletionPath(
  nextParam: string | undefined,
  intent: Intent,
  oppId: string | null
): string {
  const safe = safeNext(nextParam ?? null, "");
  if (safe) return safe;
  if (intent === "gigfit") return "/profile";
  if (intent === "manage") return "/today";
  if ((intent === "save" || intent === "applied") && oppId) {
    return `/opportunities/${oppId}?do=${intent}`;
  }
  return "/opportunities";
}

function safeOppId(v: string | undefined): string | null {
  return v && /^[0-9a-f-]{16,}$/i.test(v) ? v : null;
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; intent?: string; opportunity?: string }>;
}) {
  const sp = await searchParams;
  const intent = pickIntent(sp.intent);
  const oppId = safeOppId(sp.opportunity);
  const nextPath = pickCompletionPath(sp.next, intent, oppId);

  // Signed-in already? Send them where they intended.
  //  - If they have pending signup metadata → /signup/complete resolves it.
  //  - Else → straight to `nextPath`. Reaching the app with
  //    work_roles_set_at IS NULL and no metadata is an acceptable state:
  //    the Today banner will invite them back to answer roles.
  const user = await getSessionUser();
  if (user) {
    const hasPending = !!(user.user_metadata as { pending_work_roles?: unknown })
      ?.pending_work_roles;
    redirect(
      hasPending ? `/signup/complete?next=${encodeURIComponent(nextPath)}` : nextPath
    );
  }

  // Anonymous catalog fetch — SELECT on work_roles_catalog is granted to
  // `anon`; the SSR client resolves as anon when there's no auth cookie.
  const catalog = await getWorkRolesCatalog();

  return <SignupWizard catalog={catalog} nextPath={nextPath} intent={intent} />;
}
