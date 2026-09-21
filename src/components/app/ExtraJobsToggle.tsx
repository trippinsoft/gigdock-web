"use client";

// Client control for the extrajobs_background account-level connection.
// Wraps the shared switch pattern used elsewhere in the app (see
// AdditionalPayEditor.tsx) so /connections and any inline reuse stay
// visually consistent.
//
// Authoritative persistence — no optimistic UI:
//   The parent server component reads the effective state through
//   getUserConnection() and passes it as `initialEnabled`. On tap we
//   disable the control, call set_user_connection() via
//   `updateUserConnection`, and ONLY move the displayed state after the
//   RPC confirms success. Nav / Today / Opportunities read the same
//   server-side state via getUserConnection(), so the router refresh
//   below re-runs those reads once the write has landed.
//
//   The previous optimistic-with-rollback pattern could briefly show
//   nav or Today reacting as though the setting had flipped before the
//   server confirmed the change — this authoritative flow avoids that
//   and matches the "Supabase remains authoritative" contract for the
//   canonical connection state.

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
  // `displayed` reflects ONLY server-confirmed state. It is initialized
  // from the server-rendered read and moves only after the RPC succeeds.
  const [displayed, setDisplayed] = useState(initialEnabled);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    if (pending || disabled) return;
    const next = !displayed;
    setError(null);
    startTransition(async () => {
      const res = await updateUserConnection("extrajobs_background", next);
      if (!res.ok) {
        // Retain the prior displayed state and surface the failure —
        // the setting did not change on the server, so the UI must
        // not pretend it did.
        setError(res.error || "Couldn't update the connection.");
        return;
      }
      // Server accepted the write. Now (and only now) flip the
      // displayed state and refresh the router so nav / Today /
      // Opportunities re-read getUserConnection() with the new value.
      setDisplayed(next);
      router.refresh();
    });
  }

  const busy = pending || disabled;
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        role="switch"
        aria-checked={displayed}
        aria-busy={pending || undefined}
        aria-label="Background opportunities powered by ExtraJobs"
        onClick={toggle}
        disabled={busy}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-900 ${
          displayed
            ? "bg-blue-600"
            : "bg-zinc-300 dark:bg-zinc-700"
        } ${busy ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span
          aria-hidden="true"
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
            displayed ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
      {pending && (
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
          Saving…
        </p>
      )}
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 max-w-[16rem] text-right">
          {error}
        </p>
      )}
    </div>
  );
}
