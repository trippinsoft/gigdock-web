"use client";

// Recovery UI for /signup/complete. Renders WorkRolesPicker in place —
// same (signup) shell, no app navigation — so a signed-in user whose
// automatic handoff didn't complete can save their roles and finish
// without ever seeing GigDock's authenticated chrome.
//
// After a successful save, router.refresh() re-runs the server page,
// which detects work_roles_set_at is now populated, clears any stale
// pending metadata, and redirects to `next` (or /profile?from=onboarding
// for users who opted into GigFit).

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { WorkRoleCatalogRow } from "@/lib/workRoles";
import WorkRolesPicker from "@/components/app/WorkRolesPicker";
import { updateWorkRoles } from "@/lib/backoffice-actions";

export default function CompleteRecovery({
  catalog,
  nextPath,
  wantsGigfit,
  initialSelected,
  initialOther,
}: {
  catalog: WorkRoleCatalogRow[];
  nextPath: string;
  wantsGigfit: boolean;
  initialSelected: string[];
  initialOther: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initialSelected)
  );
  const [otherDetail, setOtherDetail] = useState(initialOther);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedKeys = useMemo(() => Array.from(selected).sort(), [selected]);

  function toggle(roleKey: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(roleKey)) next.delete(roleKey);
      else next.add(roleKey);
      return next;
    });
  }

  async function save() {
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
      setError(res.error || "We couldn't save your Work Roles. Please try again.");
      return;
    }
    // The server page will re-run, see work_roles_set_at populated,
    // clear pending metadata, and redirect to `nextPath` (or /profile
    // when wantsGigfit is true).
    router.refresh();
  }

  return (
    <div className="pt-6 sm:pt-10">
      <div className="mb-6">
        <div className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
          Finish setting up your account
        </div>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 leading-tight">
          One last step — confirm your Work Roles
        </h1>
        <p className="mt-3 text-base text-zinc-600 dark:text-zinc-300 leading-relaxed">
          We couldn&rsquo;t finish setting up your Work Roles automatically.
          Pick what applies and save to continue{wantsGigfit ? " to GigFit setup" : ""}.
        </p>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Destination after saving: <span className="font-mono">{nextPath}</span>
        </p>
      </div>

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

      <div className="mt-10 flex items-center justify-between gap-3">
        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          {selected.size === 0
            ? "Choose at least one to continue."
            : `${selected.size} selected`}
        </div>
        <button
          type="button"
          onClick={save}
          disabled={busy || selected.size === 0}
          className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-6 py-2.5 text-sm font-semibold text-white transition-colors"
        >
          {busy ? "Saving…" : "Save and continue"}
        </button>
      </div>
    </div>
  );
}
