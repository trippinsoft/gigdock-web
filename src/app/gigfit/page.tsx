import type { Metadata } from "next";
import Link from "next/link";
import PublicShell from "@/components/PublicShell";

export const metadata: Metadata = {
  title: "GigFit — See which opportunities match you",
  description:
    "GigFit compares your profile with each film & TV casting opportunity and helps you quickly see which ones fit you. Create a free GigFit profile.",
  alternates: { canonical: "/gigfit" },
  openGraph: {
    title: "GigFit — See which opportunities match you",
    description:
      "GigFit compares your profile with casting requirements so you can spot your strongest film & TV matches.",
    type: "website",
    siteName: "GigDock",
  },
};

const BENEFITS = [
  {
    h: "See your strongest matches",
    p: "Quickly spot opportunities that fit your age range, location, union status, ethnicity, gender, and other casting requirements.",
  },
  {
    h: "Spend less time searching",
    p: "Focus on opportunities that are more relevant to you instead of opening every casting post.",
  },
  {
    h: "Know why something matches",
    p: "See the criteria behind your GigFit result so you can make your own decision.",
  },
];

export default function GigFitExplainer() {
  return (
    <PublicShell>
      <div className="max-w-2xl mx-auto">
        <section className="text-center pt-6 pb-8">
          <span className="inline-block text-base sm:text-lg font-bold tracking-[0.14em] uppercase text-blue-600 dark:text-blue-400">
            GigFit
          </span>
          <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 text-balance">
            Stop sorting through every casting call.
          </h1>
          <p className="mt-4 text-base sm:text-lg text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto">
            GigFit compares your profile with each opportunity and helps you quickly see which ones
            are worth your attention.
          </p>
        </section>

        <section className="grid sm:grid-cols-3 gap-3">
          {BENEFITS.map((b) => (
            <div key={b.h} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">{b.h}</h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1.5 leading-relaxed">{b.p}</p>
            </div>
          ))}
        </section>

        <section className="mt-10 mb-4 rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 p-7 text-center">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Create your free GigFit profile</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1.5 max-w-md mx-auto">
            Takes just a minute. Your profile details are used to help match you with film &amp; TV
            casting opportunities.
          </p>
          <Link
            href="/signup?intent=gigfit"
            className="inline-block mt-4 px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm"
          >
            Get my GigFit matches
          </Link>
          <div className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
            Already have an account?{" "}
            <Link href="/login?next=/profile" className="text-blue-600 dark:text-blue-400 font-medium">Sign in</Link>
          </div>
        </section>
      </div>
    </PublicShell>
  );
}
