import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Gigs",
  robots: { index: false, follow: false },
};

// The detail column when nothing is selected. On mobile the master list fills
// the screen and this is hidden; on desktop it's the empty-state prompt (the
// master list also auto-selects the first gig on desktop, so this mainly shows
// when there are no gigs).
export default function GigsIndexPage() {
  return (
    <div className="hidden lg:flex min-h-[60vh] lg:h-full items-center justify-center p-10 text-center">
      <div>
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" /><path d="M3 12h18" />
          </svg>
        </div>
        <p className="font-medium text-zinc-600 dark:text-zinc-300">Select a gig</p>
        <p className="mt-1 text-sm text-zinc-400 dark:text-zinc-500">Choose a gig from the list to see everything about it — work days, pay, documents and more.</p>
      </div>
    </div>
  );
}
