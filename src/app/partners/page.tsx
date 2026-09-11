import type { Metadata } from "next";
import Link from "next/link";
import PublicShell from "@/components/PublicShell";

const TITLE = "For Partners — GigDock";
const DESCRIPTION =
  "GigDock complements casting companies, production companies and other opportunity providers — helping workers discover the work while supporting the provider's existing relationship and workflow.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  // Partners is available via direct URL but not promoted to search or the
  // public site during the worker/customer launch.
  robots: { index: false, follow: false },
  alternates: { canonical: "/partners" },
  openGraph: { title: TITLE, description: DESCRIPTION, type: "website", siteName: "GigDock" },
};

const MAILTO =
  "mailto:gigdocksupport@gmail.com?subject=GigDock%20partnership%20inquiry";

export default function PartnersPage() {
  return (
    <PublicShell>
      <section className="pt-8 pb-10 text-center max-w-3xl mx-auto">
        <span className="inline-block text-xs sm:text-sm font-semibold tracking-[0.12em] uppercase text-blue-600 dark:text-blue-400">
          For Partners
        </span>
        <h1 className="mt-3 text-3xl sm:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 text-balance">
          Better connections. Better opportunities.
        </h1>
        <p className="mt-4 text-base sm:text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed">
          GigDock works alongside casting companies, production companies and other opportunity providers — helping workers discover opportunities while supporting the provider&rsquo;s existing relationship and workflow.
        </p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <PrincipleCard
          title="You control where applications go."
          body="For a sourced opportunity, Apply on GigDock routes directly to the provider's own channel — the email, form or URL from the source. GigDock only handles intake itself when a provider explicitly delegates that."
        />
        <PrincipleCard
          title="Broader distribution for your postings."
          body="GigDock helps workers find opportunities they might not have seen otherwise, using GigFit to compare posting requirements with a worker's profile."
        />
        <PrincipleCard
          title="Respect the source."
          body="Every listing shows and links back to the original source. If a provider wants to change how their listings appear, or opt out entirely, we make that straightforward."
        />
      </section>

      <section className="mt-14 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 sm:p-10">
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
          Who this is for.
        </h2>
        <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            "Casting companies posting background, stand-in and featured roles",
            "Production companies and productions posting opportunities",
            "Aggregators, newsletters and other opportunity distributors",
            "Agencies and industry organizations serving production workers",
            "Regional film offices and market-development groups",
          ].map((row) => (
            <li key={row} className="flex items-start gap-2.5 text-sm text-zinc-700 dark:text-zinc-200">
              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5L20 7" /></svg>
              </span>
              {row}
            </li>
          ))}
        </ul>
      </section>

      <section className="my-14 rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 p-6 sm:p-10 text-center">
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
          Let&rsquo;s talk.
        </h2>
        <p className="mt-2 text-base sm:text-lg text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto">
          Interested in how GigDock could complement your organization? We&rsquo;d love to hear from you.
        </p>
        <div className="mt-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
          <a
            href={MAILTO}
            className="px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm text-center"
          >
            Email the GigDock team
          </a>
          <Link
            href="/features"
            className="px-6 py-3 rounded-full border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100 font-semibold text-sm text-center hover:bg-zinc-50 dark:hover:bg-zinc-900"
          >
            See what GigDock does
          </Link>
        </div>
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
          gigdocksupport@gmail.com
        </p>
      </section>
    </PublicShell>
  );
}

function PrincipleCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
      <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">{title}</h3>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{body}</p>
    </div>
  );
}
