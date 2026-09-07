import type { Metadata } from "next";
import Link from "next/link";
import PublicShell from "@/components/PublicShell";
import { GUIDES } from "@/lib/guides";
import { APP_LIVE, IOS_STORE_URL, ANDROID_STORE_URL, BETA_HREF } from "@/lib/appPromo";

const TITLE = "Resources — GigDock";
const DESCRIPTION =
  "Guides, help and answers for gig workers in TV, film and production — plus how to get GigDock on web, iPhone and Android.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/resources" },
  openGraph: { title: TITLE, description: DESCRIPTION, type: "website", siteName: "GigDock" },
};

export default function ResourcesPage() {
  return (
    <PublicShell>
      <section className="pt-8 pb-8 text-center max-w-3xl mx-auto">
        <span className="inline-block text-xs sm:text-sm font-semibold tracking-[0.12em] uppercase text-blue-600 dark:text-blue-400">
          Resources
        </span>
        <h1 className="mt-3 text-3xl sm:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 text-balance">
          Everything you need to get more out of GigDock.
        </h1>
        <p className="mt-4 text-base sm:text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed">
          Guides on how gig work in TV, film and production actually runs — plus how to get GigDock on the device you use most.
        </p>
      </section>

      {/* Guides */}
      <section className="py-8">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100">Guides</h2>
          <Link href="/guides" className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline">
            All guides →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {GUIDES.map((g) => (
            <Link
              key={g.slug}
              href={`/guides/${g.slug}`}
              className="group rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-sm transition-all"
            >
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400">
                {g.title}
              </h3>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{g.blurb}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Get GigDock */}
      <section className="py-8">
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">Get GigDock</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <PlatformCard
            title="Web"
            body="Use GigDock in any modern browser — Chrome, Safari, Firefox, Edge."
            href="/signup"
            cta="Use on the Web"
          />
          <PlatformCard
            title="iPhone"
            body={APP_LIVE && IOS_STORE_URL ? "Download from the App Store." : "iPhone app in beta — request an invite."}
            href={APP_LIVE && IOS_STORE_URL ? IOS_STORE_URL : BETA_HREF}
            cta={APP_LIVE && IOS_STORE_URL ? "Download for iPhone" : "Join the iPhone beta"}
            external={!!(APP_LIVE && IOS_STORE_URL)}
          />
          <PlatformCard
            title="Android"
            body={APP_LIVE && ANDROID_STORE_URL ? "Get it on Google Play." : "Android app in beta — request an invite."}
            href={APP_LIVE && ANDROID_STORE_URL ? ANDROID_STORE_URL : BETA_HREF}
            cta={APP_LIVE && ANDROID_STORE_URL ? "Get it on Google Play" : "Join the Android beta"}
            external={!!(APP_LIVE && ANDROID_STORE_URL)}
          />
        </div>
      </section>

      {/* Help & feedback */}
      <section className="py-8">
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">Help &amp; feedback</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Contact support</h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Questions, bug reports, or something we missed? We&rsquo;re a small team and we read every message.
            </p>
            <a
              href="mailto:gigdocksupport@gmail.com"
              className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              gigdocksupport@gmail.com →
            </a>
          </div>
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Share feedback</h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              GigDock is in open beta and we&rsquo;re actively shaping the product. Tell us what would make it better for the way you work.
            </p>
            <Link
              href="/feedback"
              className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Share feedback →
            </Link>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}

function PlatformCard({
  title, body, href, cta, external = false,
}: {
  title: string; body: string; href: string; cta: string; external?: boolean;
}) {
  const cls = "mt-4 inline-flex items-center gap-1 px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm";
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 flex flex-col">
      <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed flex-1">{body}</p>
      {external ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
          {cta}
        </a>
      ) : (
        <Link href={href} className={cls}>
          {cta}
        </Link>
      )}
    </div>
  );
}
