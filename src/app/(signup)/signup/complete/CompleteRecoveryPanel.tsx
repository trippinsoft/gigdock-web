"use client";

// /signup/complete error/recovery panel.
//
// Rendered by the server page when the post-signup handoff couldn't
// finish. By this point the user's account exists, they have an
// authenticated session, and — unless we clear the transient
// `pending_draft_id` metadata — the (app) transient guard will bounce
// them back to /signup/complete on every subsequent request.
//
// Two options:
//   1. "Try again" — re-runs the handoff (server page reloads and
//      retries each idempotent step). Fixes the common transient case.
//   2. "Finish in Profile" — clears the pending metadata (removing
//      the (app) guard) and navigates to /profile so the user can
//      set Work Roles + Markets manually. Their account is kept as-is;
//      no duplicate user or duplicate performer_profiles is created.
//
// Never redirect to /signup for a signed-in user: that would either
// bounce them right back here (metadata still pending) or take them to
// their intent-based landing without a clear explanation.

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { clearPendingOnboardingMetadata } from "@/lib/backoffice-actions";

export type RecoveryReason =
  | "no_draft"
  | "claim_failed"
  | "malformed_draft"
  | "persist_failed"
  | "verify_failed";

const HEADLINES: Record<RecoveryReason, string> = {
  no_draft: "We couldn't find your onboarding draft.",
  claim_failed: "We couldn't finish setting up your account.",
  malformed_draft: "Your onboarding draft is incomplete.",
  persist_failed: "We couldn't save your onboarding details.",
  verify_failed: "Setup didn't complete — please try again.",
};

export default function CompleteRecoveryPanel({
  reason,
  nextPath,
  detail,
}: {
  reason: RecoveryReason;
  nextPath: string;
  detail?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const retryHref = `/signup/complete?next=${encodeURIComponent(nextPath)}`;

  function finishInProfile() {
    startTransition(async () => {
      // Clear the pending_draft_id metadata so the (app) transient guard
      // stops bouncing this session back here. Then navigate to /profile
      // where they can set Work Roles + Work Markets in the normal UI.
      await clearPendingOnboardingMetadata();
      router.replace("/profile");
      router.refresh();
    });
  }

  return (
    <div className="pt-10 mx-auto max-w-xl">
      <div className="rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20 p-6">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          {HEADLINES[reason]}
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
          Your account is created and you&rsquo;re signed in — we just
          couldn&rsquo;t save the last bit of your setup automatically. Try
          again, or finish it in your Profile.
        </p>
        {detail && (
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 font-mono break-all">
            {detail}
          </p>
        )}
        <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={finishInProfile}
            disabled={pending}
            className="inline-flex items-center justify-center rounded-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-60"
          >
            {pending ? "Opening Profile…" : "Finish in Profile"}
          </button>
          <a
            href={retryHref}
            className="inline-flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 px-5 py-2 text-sm font-semibold text-white"
          >
            Try again
          </a>
        </div>
      </div>
    </div>
  );
}
