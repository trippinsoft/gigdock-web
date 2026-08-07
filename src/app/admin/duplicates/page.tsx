"use client";

import RawIngestionReview from "@/components/RawIngestionReview";

export default function DuplicatesPage() {
  return (
    <RawIngestionReview
      title="Duplicates"
      subtitle="Posts flagged as duplicates of existing opportunities"
      status="duplicate"
      emptyLabel="No duplicates detected."
      actionLabel="Force Create"
      actionClass="text-green-600 dark:text-green-400 border-green-300 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-900/30"
      showDuplicateBadge
    />
  );
}
