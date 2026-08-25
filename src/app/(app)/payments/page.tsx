import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Payments",
  robots: { index: false, follow: false },
};

// Detail column when no gig is selected (desktop auto-selects the first).
export default function PaymentsIndexPage() {
  return (
    <div className="hidden lg:flex min-h-[60vh] lg:h-full items-center justify-center p-10 text-center">
      <div>
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20" /><path d="M17 6.5C17 4.6 14.8 3.5 12 3.5S7 4.6 7 6.5s2.2 3 5 3.5 5 1.6 5 3.5-2.2 3-5 3-5-1.1-5-3" /></svg>
        </div>
        <p className="font-medium text-zinc-600 dark:text-zinc-300">Select a gig</p>
        <p className="mt-1 text-sm text-zinc-400 dark:text-zinc-500">Choose a gig to see its payments, or switch views to find outstanding money.</p>
      </div>
    </div>
  );
}
