"use client";

// Client control for the extrajobs_background account-level connection.
// Wraps the shared switch pattern used elsewhere in the app (see
// AdditionalPayEditor.tsx) so /connections and any inline reuse stay
// visually consistent.
//
// State is server-authoritative: the parent server component reads
// `getUserConnection("extrajobs_background")` and passes `initialEnabled`
// here. On toggle we call `updateUserConnection` (which upserts via the
// SECURITY DEFINER RPC and revalidates every layout), then let the
// server-rendered surfaces reflect the new state.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateUserConnection } from "@/lib/backoffice-actions";

export default function ExtraJobsToggle({
  initialEnabled,
  disabled = false,
}: {
  initialEnabled: boolean;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [optimistic, setOptimistic] = useState(initialEnabled);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    if (pending || disabled) return;
    const next = !optimistic;
    setOptimistic(next);
    setError(null);
    startTransition(async () => {
      const res = await updateUserConnection("extrajobs_background", next);
      if (!res.ok) {
        // Rollback optimistic state on failure — the UI must not pretend
        // the connection changed if the RPC didn't.
        setOptimistic(!next);
        setError(res.error || "Couldn't update the connection.");
        return;
      }
      // Server has invalidated cache paths for this layout — trigger a
      // Router refresh so the nav shell and Today re-render with the
      // new connection state without a full navigation.
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        role="switch"
        aria-checked={optimistic}
        aria-label="Background opportunities powered by ExtraJobs"
        onClick={toggle}
        disabled={disabled || pending}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-900 ${
          optimistic
            ? "bg-blue-600"
            : "bg-zinc-300 dark:bg-zinc-700"
        } ${pending || disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span
          aria-hidden="true"
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
            optimistic ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 max-w-[16rem] text-right">
          {error}
        </p>
      )}
    </div>
  );
}
