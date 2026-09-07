import type { Metadata } from "next";
import Link from "next/link";
import PublicShell from "@/components/PublicShell";

const TITLE = "About GigDock";
const DESCRIPTION =
  "Entertainment and production gig work creates a lot of work around the actual work. We built GigDock to give that work a home.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/about" },
  openGraph: { title: TITLE, description: DESCRIPTION, type: "website", siteName: "GigDock" },
};

export default function AboutPage() {
  return (
    <PublicShell>
      <section className="pt-8 pb-8 text-center max-w-3xl mx-auto">
        <span className="inline-block text-xs sm:text-sm font-semibold tracking-[0.12em] uppercase text-blue-600 dark:text-blue-400">
          About
        </span>
        <h1 className="mt-3 text-3xl sm:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 text-balance">
          Gig work creates a lot of work around the actual work.
        </h1>
        <p className="mt-4 text-lg sm:text-xl font-medium text-zinc-700 dark:text-zinc-200 leading-relaxed">
          We built GigDock to give that work a home.
        </p>
      </section>

      <section className="py-8 max-w-2xl mx-auto text-zinc-700 dark:text-zinc-200 space-y-5 text-[15px] sm:text-base leading-relaxed">
        <p>
          Entertainment and production is gig work. Every booking is a small
          business project — one that comes with dates, hours, rates,
          additional pay, payments, vouchers, tax paperwork and half a dozen
          companies to keep track of. Multiply that across a year and it&rsquo;s
          a full second job just keeping the pieces together.
        </p>
        <p>
          People end up doing it in scattered places: opportunities in a
          feed, dates in a calendar, hours in notes, payments in a
          spreadsheet, documents buried in email. When a paycheck comes in
          short — or doesn&rsquo;t come in at all — the answer is usually
          somewhere in that scatter.
        </p>
        <p>
          GigDock brings it together. Find the next opportunity. Turn a
          booking into a gig. Track the work dates, the hours and the
          additional pay. Record what you were paid, what you&rsquo;re still
          owed, and where each production stands. Keep the records that
          go with the work so they&rsquo;re there when tax time comes.
        </p>
        <p>
          We&rsquo;re starting with the workers we understand best —
          background performers, stand-ins, and the crew members whose jobs
          run production by production — and we&rsquo;re building outward
          from there. The product is in open beta, on web, iPhone and
          Android. It&rsquo;s free to get started. We read every message
          from every user.
        </p>
      </section>

      <section className="my-10 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <ValueCard
          title="Honest about what exists."
          body="Real product screenshots, real opportunity data, real capabilities. We don't invent numbers, screens or claims."
        />
        <ValueCard
          title="Complement, don't replace."
          body="Opportunities keep flowing back to their original sources. GigDock helps workers find and manage the work — it doesn't get between them and the people they work with."
        />
        <ValueCard
          title="Built with the community."
          body="We're a small team, and the way GigDock works today is a direct result of feedback from people who work these gigs."
        />
      </section>

      <section className="my-14 rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 p-6 sm:p-10 text-center">
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
          Have a story to share?
        </h2>
        <p className="mt-2 text-base text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto">
          What&rsquo;s working for you, what isn&rsquo;t, or what you wish
          GigDock could do — we&rsquo;d love to hear it.
        </p>
        <div className="mt-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
          <a
            href="mailto:gigdocksupport@gmail.com?subject=GigDock%20feedback"
            className="px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm text-center"
          >
            Email the team
          </a>
          <Link
            href="/features"
            className="px-6 py-3 rounded-full border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100 font-semibold text-sm text-center hover:bg-zinc-50 dark:hover:bg-zinc-900"
          >
            See what GigDock does
          </Link>
        </div>
      </section>
    </PublicShell>
  );
}

function ValueCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
      <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">{title}</h3>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{body}</p>
    </div>
  );
}
