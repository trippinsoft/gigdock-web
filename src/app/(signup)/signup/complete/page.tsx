import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
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
    return <ErrorPanel nextPath={nextPath} reason="no_draft" />;
  }

  // (2) Claim the draft. The RPC enforces email-hash ownership.
  const supabase = await createSupabaseServer();
  const claimRes = await supabase.rpc("claim_onboarding_draft", {
    p_draft_id: draftId,
  });
  if (claimRes.error) {
    return (
      <ErrorPanel
        nextPath={nextPath}
        reason="claim_failed"
        detail={claimRes.error.message ?? undefined}
      />
    );
  }

  const draft = extractDraft(claimRes.data);
  if (!draft) {
    return <ErrorPanel nextPath={nextPath} reason="malformed_draft" />;
  }

  // (3) Persist. Each write is individually idempotent.
  const persistRes = await persistOnboardingDraft({
    roleKeys: draft.roleKeys,
    roleOther: draft.roleOther,
    marketCodes: draft.marketCodes,
    performer: draft.performer,
  });
  if (!persistRes.ok) {
    return (
      <ErrorPanel
        nextPath={nextPath}
        reason="persist_failed"
        detail={persistRes.error}
      />
    );
  }

  // (4) Verify.
  const verify = await getProfileWithWorkRoles();
  if (!verify?.work_roles_set_at) {
    return <ErrorPanel nextPath={nextPath} reason="verify_failed" />;
  }

  await clearPending();
  redirect(nextPath);
}

function ErrorPanel({
  nextPath,
  reason,
  detail,
}: {
  nextPath: string;
  reason: "no_draft" | "claim_failed" | "malformed_draft" | "persist_failed" | "verify_failed";
  detail?: string;
}) {
  const headline: Record<typeof reason, string> = {
    no_draft: "We couldn't find your onboarding draft.",
    claim_failed: "We couldn't finish setting up your account.",
    malformed_draft: "Your onboarding draft is incomplete.",
    persist_failed: "We couldn't save your onboarding details.",
    verify_failed: "Setup didn't complete — please try again.",
  };
  const retryHref = `/signup/complete?next=${encodeURIComponent(nextPath)}`;
  return (
    <div className="pt-10 mx-auto max-w-xl">
      <div className="rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20 p-6">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          {headline[reason]}
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
          Your account is created but we hit a snag finishing setup. Try again — most of the time this resolves itself.
        </p>
        {detail && (
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 font-mono">{detail}</p>
        )}
        <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-end">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center rounded-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800"
          >
            Start over
          </Link>
          <Link
            href={retryHref}
            className="inline-flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 px-5 py-2 text-sm font-semibold text-white"
          >
            Try again
          </Link>
        </div>
      </div>
    </div>
  );
}
