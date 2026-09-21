import type { Metadata } from "next";
import { getUserConnection } from "@/lib/backoffice";
import ExtraJobsToggle from "@/components/app/ExtraJobsToggle";

// Connections — canonical place to enable/disable the ExtraJobs
// background-opportunities connection. Server-rendered against
// get_user_connection so legacy users see their true effective state.

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Connections — GigDock",
  robots: { index: false, follow: false },
};

export default async function ConnectionsPage() {
  const extrajobs = await getUserConnection("extrajobs_background");
  return (
    <div className="max-w-3xl mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Connections
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Optional services you can connect to your GigDock account.
        </p>
      </div>

      <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Want to find background jobs?
            </h2>
            <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
              Get relevant background opportunities and alerts powered by ExtraJobs.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                Background opportunities
              </span>
            </div>
            <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-500">
              Powered by ExtraJobs
            </p>
          </div>
          <ExtraJobsToggle initialEnabled={extrajobs.enabled} />
        </div>

        {!extrajobs.enabled && (
          <div className="mt-5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">
            While disconnected, your Saved opportunities, Applied history,
            gigs created from opportunities, alert preferences, and profile
            data are all preserved. Turning this back on restores your
            Opportunities experience.
          </div>
        )}
      </section>
    </div>
  );
}
