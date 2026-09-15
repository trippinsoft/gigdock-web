import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  getProfileWithWorkRoles,
  getSessionUser,
} from "@/lib/backoffice";
import {
  persistOnboardingDraft,
  type OnboardingPerformerPayload,
} from "@/lib/backoffice-actions";
import { createSupabaseServer } from "@/lib/supabase-server";
import { safeNext } from "@/lib/workRolesLaunch";
import CompleteRecoveryPanel from "./CompleteRecoveryPanel";

// URL: /signup/complete?next=<safe-path>
//
// Single post-auth handoff for BOTH auto-confirm and email-confirm signups.
// Runs under the (signup) route-group shell (no app nav).
//
// Behavior — idempotent:
//   1. Require an authenticated session (bounce to /signup otherwise).
//   2. If work_roles_set_at is already populated, treat as a successful
//      completion: clear any stale metadata and redirect to `next`.
//   3. Otherwise, if the session carries a pending_draft_id, call
//      claim_onboarding_draft(...) — the RPC verifies the caller's email
//      hashes to the draft's owner hash before returning the JSON — then
//      call persistOnboardingDraft(...) to write work_roles, work_markets,
//      and (optionally) the performer_profiles row. On verified success
//      clear the metadata and redirect to `next`.
//   4. Any failure → render a small "we couldn't finish" panel with a
//      "Try again" link (which just re-loads this same URL, re-running
//      the handoff). Users are kept on this route by the (app) guard for
//      as long as pending metadata + unset roles persist, so /signup/complete
//      is the exclusive locus of the failure/retry loop.

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Finishing signup — GigDock",
  robots: { index: false, follow: false },
};

type PendingMeta = { pending_draft_id?: unknown };

function readPendingDraftId(meta: unknown): string | null {
  const m = (meta ?? {}) as PendingMeta;
  return typeof m.pending_draft_id === "string" ? m.pending_draft_id : null;
}

async function clearPending(): Promise<void> {
  const supabase = await createSupabaseServer();
  try {
    await supabase.auth.updateUser({
      data: {
        pending_draft_id: null,
        // Also clear the older-scheme keys just in case any user_metadata
        // rows still carry them from prior wizard versions.
        pending_work_roles: null,
        pending_work_roles_other: null,
        pending_has_performer_role: null,
        pending_wants_gigfit: null,
        pending_performer_profile: null,
      },
    });
  } catch {
    /* non-fatal */
  }
}

type DraftPayload = {
  work_roles?: unknown;
  work_roles_other?: unknown;
  work_markets?: unknown;
  performer?: unknown;
};

function extractDraft(payload: unknown): {
  roleKeys: string[];
  roleOther: string | null;
  marketCodes: string[];
  performer: OnboardingPerformerPayload | null;
} | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as DraftPayload;
  const roles = Array.isArray(p.work_roles)
    ? (p.work_roles as unknown[]).filter((v): v is string => typeof v === "string")
    : [];
  const markets = Array.isArray(p.work_markets)
    ? (p.work_markets as unknown[]).filter((v): v is string => typeof v === "string")
    : [];
  if (roles.length === 0 || markets.length === 0) return null;
  const roleOther =
    typeof p.work_roles_other === "string" ? p.work_roles_other : null;

  let performer: OnboardingPerformerPayload | null = null;
  if (p.performer && typeof p.performer === "object") {
    const perf = p.performer as Record<string, unknown>;
    performer = {
      gender: typeof perf.gender === "string" ? perf.gender : null,
      ethnicity: Array.isArray(perf.ethnicity)
        ? (perf.ethnicity as unknown[]).filter(
            (v): v is string => typeof v === "string"
          )
        : [],
      date_of_birth:
        typeof perf.date_of_birth === "string" ? perf.date_of_birth : null,
      union_status:
        typeof perf.union_status === "string" ? perf.union_status : null,
      height_inches:
        typeof perf.height_inches === "number" && perf.height_inches > 0
          ? Math.round(perf.height_inches)
          : null,
    };
  }
  return { roleKeys: roles, roleOther, marketCodes: markets, performer };
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

  const profile = await getProfileWithWorkRoles();

  // (1) Already done — clear stale metadata and redirect out.
  if (profile?.work_roles_set_at) {
    await clearPending();
    redirect(nextPath);
  }

  const draftId = readPendingDraftId(user!.user_metadata);
  if (!draftId) {
    // No draft in metadata AND roles not set — the user is authenticated
    // but the handoff data is missing. Let them finish in /profile without
    // being trapped here by the (app) transient guard.
    return <CompleteRecoveryPanel reason="no_draft" nextPath={nextPath} />;
  }

  // (2) Claim the draft. The RPC enforces email-hash ownership. Idempotent
  // by design: if this user already claimed the draft, the RPC returns
  // the same payload without re-updating claimed_by.
  const supabase = await createSupabaseServer();
  const claimRes = await supabase.rpc("claim_onboarding_draft", {
    p_draft_id: draftId,
  });
  if (claimRes.error) {
    return (
      <CompleteRecoveryPanel
        reason="claim_failed"
        nextPath={nextPath}
        detail={claimRes.error.message ?? undefined}
      />
    );
  }

  const draft = extractDraft(claimRes.data);
  if (!draft) {
    return <CompleteRecoveryPanel reason="malformed_draft" nextPath={nextPath} />;
  }

  // (3) Persist. Each write is individually idempotent. set_work_roles /
  // set_work_markets both raise loudly (SQLSTATE P0002) if the profile
  // row is missing — a silent 0-row UPDATE is impossible. Therefore
  // when persistRes.ok is true the writes DID land, and no additional
  // verification read is needed. The old verify step re-ran
  // getProfileWithWorkRoles (which does its own supabase.auth.getUser()
  // network hop) and could return null on a transient hiccup, causing
  // spurious verify_failed even after the DB was correctly written —
  // observed in production for crew-only signup (user ob6: RPCs
  // succeeded, DB fully populated, recovery panel still shown). This
  // was especially likely for crew-only because that path has NO
  // performer_profiles INSERT to serialize behind, so the verify read
  // ran the fastest after the writes — right when transient auth-server
  // latency is most likely to reject a token check.
  const persistRes = await persistOnboardingDraft({
    roleKeys: draft.roleKeys,
    roleOther: draft.roleOther,
    marketCodes: draft.marketCodes,
    performer: draft.performer,
  });
  if (!persistRes.ok) {
    return (
      <CompleteRecoveryPanel
        reason="persist_failed"
        nextPath={nextPath}
        detail={persistRes.error}
      />
    );
  }

  await clearPending();
  redirect(nextPath);
}
