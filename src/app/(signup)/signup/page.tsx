import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  getSessionUser,
  getWorkRolesCatalog,
  getMarketsCatalog,
} from "@/lib/backoffice";
import { safeNext } from "@/lib/workRolesLaunch";
import { loadActiveOpportunities } from "@/lib/load-opportunities";
import OnboardingWizard from "@/components/signup/OnboardingWizard";
import type { PreviewOpportunity } from "@/components/signup/OpportunityPreview";

// URL: /signup (route group `(signup)` supplies the standalone shell).
//
// Canonical new-user entry point. Loads:
//   - the anonymous work_roles_catalog
//   - the anonymous markets catalog
//   - a lightweight active-opportunities list (for the Preview step)
// and mounts the unified OnboardingWizard.
//
// Signed-in visitors are bounced away — either directly to the intended
// destination (no pending draft) or to /signup/complete which resolves
// their pending draft first.

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

  const user = await getSessionUser();
  if (user) {
    const hasPending =
      typeof (user.user_metadata as { pending_draft_id?: unknown })
        ?.pending_draft_id === "string";
    redirect(
      hasPending
        ? `/signup/complete?next=${encodeURIComponent(nextPath)}`
        : nextPath
    );
  }

  const [catalog, markets, opportunitiesRaw] = await Promise.all([
    getWorkRolesCatalog(),
    getMarketsCatalog(),
    loadActiveOpportunities(),
  ]);

  // Trim opportunities down to what the Preview needs. Cap the list to a
  // manageable size for anonymous RPC round-trips.
  const previewOpportunities: PreviewOpportunity[] = opportunitiesRaw
    .slice(0, 200)
    .map((o) => ({
      id: o.id,
      title: o.title,
      location: o.location,
      work_date: o.work_date,
      pay_rate: o.pay_rate,
      image_url: o.image_url,
      match_state: o.match_state,
    }));

  return (
    <OnboardingWizard
      catalog={catalog}
      markets={markets}
      previewOpportunities={previewOpportunities}
      nextPath={nextPath}
      intent={intent}
    />
  );
}
