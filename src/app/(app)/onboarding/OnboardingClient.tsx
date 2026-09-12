"use client";

// Two-step client onboarding:
//   Step 1  Work Roles (required, ≥1)
//   Step 2  Optional performer-profile invitation (rendered only if any
//           performer role was selected). "Set up now" links to /profile;
//           "Skip for now" completes onboarding and navigates to next.
//
// Crew-only users skip Step 2 entirely and end onboarding after Step 1.
// The Step 2 skip is explicit — we intentionally do NOT create an empty
// performer_profiles row when the user skips; the existing GigFit
// completion nudges become the persistent path back later.

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { WorkRoleCatalogRow } from "@/lib/workRoles";
import { hasPerformerRole } from "@/lib/workRoles";
import WorkRolesPicker from "@/components/app/WorkRolesPicker";
import { updateWorkRoles } from "@/lib/backoffice-actions";
import { trackOnboarding } from "@/lib/onboardingEvents";

type Step = "roles" | "gigfit_offer";

export default function OnboardingClient({
  catalog,
  nextPath,
}: {
  catalog: WorkRoleCatalogRow[];
  nextPath: string;
}) {
  const router = useRouter();

  const [step, setStep] = useState<Step>("roles");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [otherDetail, setOtherDetail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    trackOnboarding("onboarding_started", { entry_point: "web_signup" });
  }, []);

  const selectedKeys = useMemo(() => Array.from(selected).sort(), [selected]);
  const anyPerformer = useMemo(
    () => hasPerformerRole(selectedKeys, catalog),
    [selectedKeys, catalog]
  );

  function toggle(roleKey: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(roleKey)) {
        next.delete(roleKey);
      } else {
        next.add(roleKey);
      }
      return next;
    });
  }

  function completeAndGo(flow: "crew_only" | "performer_full" | "performer_skipped") {
    trackOnboarding("onboarding_completed", {
      flow,
      has_performer_role: anyPerformer,
    });
    router.replace(nextPath);
    router.refresh();
  }

  async function saveRoles() {
    setError(null);
    if (selected.size === 0) {
      setError("Select at least one to continue.");
      return;
    }
    setBusy(true);
    const res = await updateWorkRoles(
      selectedKeys,
      selected.has("other") ? otherDetail : null
    );
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    trackOnboarding("work_roles_selected", {
      role_count: selectedKeys.length,
      roles: selectedKeys,
      has_performer_role: anyPerformer,
      has_crew_role: catalog.some(
        (r) => selected.has(r.role_key) && r.category === "crew"
      ),
      entry_point: "web_signup",
    });

    if (anyPerformer) {
      // Advance to the optional performer offer. Server refresh so the
      // gate helpers (has_performer_role, needsOnboarding) see the new
      // state on the next full navigation.
      trackOnboarding("performer_profile_started");
      router.refresh();
      setStep("gigfit_offer");
      return;
    }

    completeAndGo("crew_only");
  }

  function skipPerformerProfile() {
    trackOnboarding("performer_profile_skipped", { steps_skipped: "both" });
    completeAndGo("performer_skipped");
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <div className="text-xs font-bold uppercase tracking-[0.14em] text-blue-600 dark:text-blue-400">
          Welcome to GigDock
        </div>
        <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 leading-tight">
          {step === "roles"
            ? "What kind of work do you do?"
            : "Set up GigFit — optional"}
        </h1>
        <p className="mt-3 text-base text-zinc-600 dark:text-zinc-300 leading-relaxed">
          {step === "roles"
            ? "Select all that apply. We'll use this to tailor GigDock to the work you actually do."
            : "You picked at least one performing role. Set up your casting profile now so GigFit can start matching opportunities — or skip and come back later."}
        </p>
      </div>

      {step === "roles" ? (
        <>
          <WorkRolesPicker
            catalog={catalog}
            selected={selected}
            onToggle={toggle}
            otherDetail={otherDetail}
            onOtherDetailChange={setOtherDetail}
          />

          {error && (
            <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <div className="mt-8 flex items-center justify-between gap-3">
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              {selected.size === 0
                ? "Choose at least one to continue."
                : `${selected.size} selected`}
            </div>
            <button
              type="button"
              onClick={saveRoles}
              disabled={busy || selected.size === 0}
              className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-6 py-2.5 text-sm font-semibold text-white transition-colors"
            >
              {busy ? "Saving…" : "Continue"}
            </button>
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/60 dark:bg-blue-950/20 px-5 py-5 sm:px-6 sm:py-6">
          <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Match with casting opportunities
          </div>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
            GigFit compares your profile — markets, gender, ethnicity, age and union status — with each opportunity&rsquo;s casting requirements so the ones worth your time float up. You don&rsquo;t have to fill it all in at once, and you can skip this and set it up later.
          </p>
          <div className="mt-5 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={skipPerformerProfile}
              className="inline-flex items-center justify-center rounded-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-5 py-2 text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              Skip for now
            </button>
            <Link
              href={`/profile?from=onboarding&next=${encodeURIComponent(nextPath)}`}
              onClick={() =>
                trackOnboarding("onboarding_completed", {
                  flow: "performer_full",
                  has_performer_role: true,
                })
              }
              className="inline-flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 px-5 py-2 text-sm font-semibold text-white transition-colors"
            >
              Set up my casting profile →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
