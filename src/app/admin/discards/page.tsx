"use client";

import RawIngestionReview from "@/components/RawIngestionReview";

export default function DiscardsPage() {
  return (
    <RawIngestionReview
      title="Discards"
      subtitle="Posts the AI classified as non-casting-calls"
      status="discarded"
      emptyLabel="No discards."
      actionLabel="Re-classify"
      actionClass="text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/30"
      excludeStale
    />
  );
}
