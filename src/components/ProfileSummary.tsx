"use client";

import Link from "next/link";
import {
  describeProfile,
  fieldsMissing,
  fieldsSet,
  PROFILE_FIELD_LABELS,
  type PerformerProfile,
} from "@/lib/gigfit";

/**
 * Shows what the selected GigFit profile actually matches on, plus what's
 * still unset. Keeps the badges interpretable — "Good match" means good on
 * the attributes listed here, not a full-confidence assessment.
 */
export default function ProfileSummary({ profile }: { profile: PerformerProfile }) {
  const set = fieldsSet(profile);
  const missing = fieldsMissing(profile);

  // Nothing set at all — GigFit has nothing to match on.
  if (set.length === 0) {
    return (
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 px-3 py-2">
        <span>Add at least one detail to start matching.</span>
        <Link
          href="/admin/profile"
          className="font-medium underline underline-offset-2"
        >
          Start with your region →
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
      <span>
        Matching on:{" "}
        <span className="text-zinc-900 dark:text-zinc-100 font-medium">
          {describeProfile(profile).join(" · ")}
        </span>
      </span>
      {missing.length > 0 && (
        <span className="text-amber-700 dark:text-amber-400">
          ⚠ {missing.map((k) => PROFILE_FIELD_LABELS[k]).join(", ")} not set
        </span>
      )}
      <Link
        href="/admin/profile"
        className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
      >
        Edit
      </Link>
    </div>
  );
}
