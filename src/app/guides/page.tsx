import type { Metadata } from "next";
import Link from "next/link";
import PublicShell from "@/components/PublicShell";
import { GUIDES } from "@/lib/guides";

const TITLE = "Guides for Background Actors & Extras";
const DESCRIPTION =
  "Practical, no-nonsense guides for background actors and extras — how you get paid, how to track your gigs, and how to make the most of film & TV work.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/guides" },
  openGraph: { title: TITLE, description: DESCRIPTION, type: "website", siteName: "GigDock" },
};

export default function GuidesIndex() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-2xl py-4">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
          Guides for background actors &amp; extras
        </h1>
        <p className="mt-4 text-zinc-600 dark:text-zinc-400 leading-relaxed">
          Straight answers to the things background actors actually deal with — getting paid, tracking your gigs, and
          getting the most out of film &amp; TV work.
        </p>

        <div className="mt-8 space-y-3">
          {GUIDES.map((g) => (
            <Link
              key={g.slug}
              href={`/guides/${g.slug}`}
              className="block rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
            >
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{g.title}</h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{g.blurb}</p>
              <span className="mt-2 inline-block text-sm font-semibold text-blue-600 dark:text-blue-400">Read the guide →</span>
            </Link>
          ))}
        </div>
      </div>
    </PublicShell>
  );
}
