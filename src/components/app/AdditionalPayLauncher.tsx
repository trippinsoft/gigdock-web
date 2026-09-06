"use client";

// Mounts the AdditionalPayEditor modal from a button that lives inside a
// server-rendered Gig Detail. Keeps the trigger + modal state on the client
// while the page shell stays server-rendered.

import { useState } from "react";
import AdditionalPayEditor from "@/components/app/AdditionalPayEditor";

export default function AdditionalPayLauncher({
  gigId,
  userId,
  variant = "manage",
}: {
  gigId: string;
  userId: string;
  /** manage = compact link-style ("Manage"); add = solid primary CTA. */
  variant?: "manage" | "add";
}) {
  const [open, setOpen] = useState(false);
  const cls =
    variant === "add"
      ? "inline-flex items-center h-9 px-3 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
      : "text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline";
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={cls}>
        {variant === "add" ? "+ Add Additional Pay" : "Manage"}
      </button>
      {open && (
        <AdditionalPayEditor
          gigId={gigId}
          userId={userId}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
