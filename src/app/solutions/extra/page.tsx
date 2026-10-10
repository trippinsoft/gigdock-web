import type { Metadata } from "next";
import Link from "next/link";
import PublicShell from "@/components/PublicShell";

export const metadata: Metadata = {
  title: "GigDock Extra — Gig Management for Background Performers",
  description: "Manage background acting gigs, dates, earnings, payments and records with GigDock Extra. Discover casting opportunities through ExtraJobs.",
  alternates: { canonical: "/solutions/extra" },
};

export default function ExtraSolutionPage() {
  return (
    <PublicShell>
      <main className="mx-auto max-w-5xl py-12 sm:py-16">
        <p className="text-sm font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400">Solutions / GigDock Extra</p>
        <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
          Your background gig life, organized.
        </h1>
        <p className="mt-5 max-w-3xl text-lg text-zinc-600 dark:text-zinc-400">
          GigDock Extra brings the work around background acting together: track booked gigs and work dates, understand earnings, follow payments, and keep records in one place.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/signup" className="rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700">Get Started Free</Link>
          <a href="https://extrajobs.co" className="rounded-full border border-zinc-300 px-6 py-3 text-sm font-semibold text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">Explore ExtraJobs ↗</a>
        </div>
        <section className="mt-14 grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800">
            <h2 className="text-xl font-bold">Manage the work</h2>
            <p className="mt-3 text-zinc-600 dark:text-zinc-400">Keep gigs, schedules, work dates, hours, earnings, payments and documents together in GigDock, on web and mobile.</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800">
            <h2 className="text-xl font-bold">Discover with ExtraJobs</h2>
            <p className="mt-3 text-zinc-600 dark:text-zinc-400">Browse background opportunities on ExtraJobs.co. Connect ExtraJobs inside GigDock for an integrated opportunity feed and GigFit matching.</p>
          </div>
        </section>
        <section className="mt-12 rounded-2xl bg-zinc-100 p-7 dark:bg-zinc-900">
          <h2 className="text-2xl font-bold">One GigDock account. An optional ExtraJobs connection.</h2>
          <p className="mt-3 text-zinc-600 dark:text-zinc-400">ExtraJobs is enabled by default for new background-performer accounts and can be turned off in Connections. Your gigs, payments and records remain available either way.</p>
        </section>
      </main>
    </PublicShell>
  );
}
