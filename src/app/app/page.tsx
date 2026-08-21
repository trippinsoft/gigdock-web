import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import PublicShell from "@/components/PublicShell";
import BetaSignupForm from "@/components/BetaSignupForm";
import AppCta from "@/components/AppCta";
import { APP_LIVE, BETA_ANCHOR } from "@/lib/appPromo";

const BASE = "https://www.gigdock.co";
const PATH = "/app";
const TITLE = "The GigDock App — Find & Track Your Film & TV Gigs";
const DESCRIPTION =
  "GigDock is the app for film & TV gig workers: search casting calls, save and apply to the ones you want, then track every gig — dates, rate, hours and bumps — through to what you were actually paid, gross and net. Join the beta.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: {
    title: TITLE, description: DESCRIPTION, type: "website", siteName: "GigDock", url: `${BASE}${PATH}`,
    images: [{ url: "/guides/gigdock-app-gig-detail-earnings.png", width: 1206, height: 2622, alt: "The GigDock app showing a gig's earnings detail" }],
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

/* ---------- small building blocks ---------- */

function PhoneShot({ src, alt, priority = false }: { src: string; alt: string; priority?: boolean }) {
  return (
    <div className="mx-auto w-full max-w-[248px] rounded-[2rem] border-[6px] border-zinc-900 dark:border-zinc-700 bg-zinc-900 dark:bg-zinc-700 shadow-2xl overflow-hidden">
      <Image src={src} alt={alt} width={1206} height={2622} priority={priority}
        sizes="248px" className="w-full h-auto rounded-[1.5rem]" />
    </div>
  );
}

function Feature({
  eyebrow, title, children, reverse = false, shot,
}: {
  eyebrow: string; title: string; children: React.ReactNode; reverse?: boolean; shot?: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-8 md:items-center ${shot ? "md:flex-row" : ""} ${reverse ? "md:flex-row-reverse" : ""}`}>
      <div className="flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">{eyebrow}</p>
        <h3 className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{title}</h3>
        <div className="mt-3 space-y-3 text-zinc-600 dark:text-zinc-300 leading-relaxed">{children}</div>
      </div>
      {shot && <div className="flex-1 w-full">{shot}</div>}
    </div>
  );
}

/* ---------- page ---------- */

export default function Page() {
  const appLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "GigDock",
    applicationCategory: "BusinessApplication",
    operatingSystem: "iOS, Android",
    description: DESCRIPTION,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    publisher: { "@type": "Organization", name: "GigDock", url: BASE },
  };

  return (
    <PublicShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(appLd) }} />

      <div className="mx-auto max-w-4xl">
        {/* ---------- HERO ---------- */}
        <section className="grid gap-10 py-6 md:grid-cols-2 md:items-center md:py-10">
          <div>
            {!APP_LIVE && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 dark:border-blue-900/60 bg-blue-50 dark:bg-blue-950/40 px-3 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> In beta · launching soon
              </span>
            )}
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-5xl">
              Your gig life, all in one place.
            </h1>
            <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-300 leading-relaxed">
              From finding film &amp; TV work to tracking every hour and paycheck, GigDock keeps your gig life together —
              instead of scattered across Facebook, screenshots, notes and spreadsheets.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <AppCta variant="buttons" />
              <Link href="/opportunities" className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">
                or browse casting calls →
              </Link>
            </div>
            {!APP_LIVE && (
              <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
                Free during beta · iPhone &amp; Android
              </p>
            )}
          </div>
          <PhoneShot src="/guides/gigdock-app-gig-detail-earnings.png" alt="The GigDock app showing a gig with its rate, hours and earnings" priority />
        </section>

        {/* ---------- PROBLEM ---------- */}
        <section className="border-t border-zinc-200 dark:border-zinc-800 py-10">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">You worked the gig. Weeks later, do you remember the details?</h2>
          <p className="mt-3 max-w-2xl text-zinc-600 dark:text-zinc-300 leading-relaxed">
            One company casts you. You work several productions in a month. Your rate includes guaranteed hours, maybe a
            bump or two, and the company that pays you isn&rsquo;t always the one that booked you. Then a payment lands —
            but were you expecting $175, $225 or $275? GigDock keeps the answer so you don&rsquo;t have to hold it in
            your head.
          </p>
        </section>

        {/* ---------- FEATURES ---------- */}
        <section className="space-y-16 border-t border-zinc-200 dark:border-zinc-800 py-12">
          <Feature eyebrow="Discover" title="Find your next opportunity">
            <p>Search film &amp; TV casting calls right in the app — pulled from across the web into one feed. Tap the
              bookmark to <strong>save</strong> the ones you like, and mark the ones you&rsquo;ve <strong>applied</strong>{" "}
              to so you always know where you stand.</p>
            <p>Ready to work it? Move an opportunity into <strong>My Gigs</strong> in a tap, and everything you saved
              carries straight over.</p>
          </Feature>

          <Feature eyebrow="Organize" title="Everything about a gig, in one place" reverse
            shot={<PhoneShot src="/guides/gigdock-app-gig-detail-earnings.png" alt="A gig in GigDock with production, casting company, date, rate, guaranteed hours and earnings" />}>
            <p>Each gig keeps what matters: the production or project, the casting company, the payroll company, the dates
              you work, and your rate with guaranteed hours (like <strong>$150/10</strong>) — plus the hours you actually
              worked and any bumps: wardrobe, a personal vehicle, wet work and the rest.</p>
            <p>Set up the companies and projects you work with once, then pick them in a tap on the next booking.</p>
          </Feature>

          <Feature eyebrow="Get paid right" title="Record your pay — gross and net"
            shot={<PhoneShot src="/guides/gigdock-app-payments-summary.png" alt="The GigDock payments view showing gross and net pay for a gig" />}>
            <p>When a payment arrives, log the gross and the net, how you were paid, and mark the gig paid. Gross and net
              aren&rsquo;t the same, so keeping both makes it easy to tell a real discrepancy from ordinary deductions.</p>
            <p>Every gig stays on your list until you mark it paid — so the ones you&rsquo;re still owed are something you
              can <strong>see</strong>, not something you have to remember.</p>
          </Feature>

          <Feature eyebrow="See it all" title="Your earnings and your schedule, at a glance" reverse>
            <p>A financial dashboard shows what you&rsquo;ve earned and what&rsquo;s still outstanding over a period you
              choose, and a calendar lays your gigs out by date — so a busy stretch of work, and everything owed from it,
              stays organized in one place.</p>
          </Feature>
        </section>

        {/* ---------- WEB FRONT DOOR ---------- */}
        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 sm:p-8">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Prefer to browse on the web first?</h2>
          <p className="mt-2 max-w-2xl text-zinc-600 dark:text-zinc-300 leading-relaxed">
            The same casting calls are here on GigDock.co, and{" "}
            <Link href="/gigfit" className="font-medium text-blue-600 hover:underline dark:text-blue-400">GigFit</Link>{" "}
            helps you see which ones fit — then the app is where you save, apply, and turn a booking into a tracked gig.
          </p>
          <div className="mt-4">
            <Link href="/opportunities" className="text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400">
              Browse casting calls →
            </Link>
          </div>
        </section>

        {/* ---------- OPPORTUNITY -> GIG -> PAY ---------- */}
        <section className="border-t border-zinc-200 dark:border-zinc-800 py-12">
          <h2 className="text-center text-2xl font-bold text-zinc-900 dark:text-zinc-100">Opportunity → Gig → Pay</h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-zinc-600 dark:text-zinc-300 leading-relaxed">
            GigDock isn&rsquo;t just a place to find casting calls, and it isn&rsquo;t just a gig tracker. It follows the
            whole arc of the work.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              { n: "1", t: "Opportunity", d: "Search film & TV casting calls right in the app, save the ones you like, and apply." },
              { n: "2", t: "Gig", d: "Move a booking into My Gigs and keep the details — production, casting company, dates, rate, guaranteed hours, hours and bumps." },
              { n: "3", t: "Pay", d: "Record what you were actually paid, gross and net, mark it paid, and see anything you're still owed." },
            ].map((s) => (
              <div key={s.n} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">{s.n}</div>
                <h3 className="mt-3 font-bold text-zinc-900 dark:text-zinc-100">{s.t}</h3>
                <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>

          {/* before / after */}
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Before</p>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
                Facebook groups, screenshots, a notes app, a spreadsheet, your calendar — and trying to remember which
                gigs actually paid.
              </p>
            </div>
            <div className="rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">With GigDock</p>
              <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-200 leading-relaxed">
                One feed to find the work, one place to track every gig, and a clear view of what you&rsquo;ve been paid
                and what&rsquo;s still outstanding.
              </p>
            </div>
          </div>
        </section>

        {/* ---------- BETA SIGNUP ---------- */}
        <section id={BETA_ANCHOR} className="scroll-mt-20 border-t border-zinc-200 dark:border-zinc-800 py-12">
          <div className="mx-auto max-w-md text-center">
            {APP_LIVE ? (
              <>
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Get the GigDock app</h2>
                <p className="mt-2 text-zinc-600 dark:text-zinc-300">Free on iPhone and Android.</p>
                <div className="mt-6 flex justify-center"><AppCta variant="buttons" center /></div>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Be among the first to try GigDock</h2>
                <p className="mt-2 text-zinc-600 dark:text-zinc-300">
                  We&rsquo;re inviting beta testers now, ahead of launch. Leave your name and email and we&rsquo;ll send
                  your invite as spots open up.
                </p>
                <div className="mt-6 text-left"><BetaSignupForm /></div>
              </>
            )}
          </div>
        </section>

        {/* ---------- FAQ ---------- */}
        <section className="border-t border-zinc-200 dark:border-zinc-800 py-10">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Questions</h2>
          <div className="mt-4 divide-y divide-zinc-200 dark:divide-zinc-800">
            {[
              { q: "What does the GigDock app do?", a: "Two things, in one place. It helps you find film & TV casting calls — search them in the app, save the ones you like, apply, and move a booking into My Gigs. And it tracks each gig from there: the production, casting company, dates, rate and guaranteed hours, the hours you actually worked, any bumps, and what you were ultimately paid (gross and net), with a calendar and an earnings dashboard to see it all." },
              { q: "How much does it cost?", a: "It's free to use during the beta. We'll always tell you clearly before anything about pricing changes." },
              { q: "Which phones does it support?", a: "iPhone (iOS) and Android. Tell us which you use when you sign up for the beta so we send the right invite — a TestFlight link for iOS or a Google Play invite for Android." },
              { q: "When does it launch?", a: "Soon — we're in beta now and finishing up ahead of a public launch. Joining the beta is the fastest way to get in early and help shape it." },
              { q: "Does it replace my spreadsheet?", a: "If you track your gigs in a spreadsheet today, GigDock is built to do that job without you having to build and maintain the spreadsheet yourself. Prefer your spreadsheet? Keep it — GigDock is simply the faster path for most people." },
              { q: "Is my information private?", a: "Your gig and payment records are yours. We don't sell your data, and your beta email is only used to send you GigDock beta access." },
            ].map((f) => (
              <div key={f.q} className="py-4">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{f.q}</h3>
                <p className="mt-1.5 text-zinc-600 dark:text-zinc-300 leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ---------- FINAL CTA ---------- */}
        {!APP_LIVE && (
          <section className="pb-12">
            <div className="rounded-2xl bg-blue-600 p-8 text-center text-white">
              <h2 className="text-2xl font-bold">Stop guessing what you were owed</h2>
              <p className="mx-auto mt-2 max-w-lg text-blue-50">
                Join the GigDock beta and start keeping every gig, hour and paycheck in one place.
              </p>
              <div className="mt-5 flex justify-center">
                <Link href={`#${BETA_ANCHOR}`} className="inline-flex items-center rounded-full bg-white px-6 py-3.5 font-semibold text-blue-700 transition-colors hover:bg-blue-50">
                  Request beta access
                </Link>
              </div>
            </div>
          </section>
        )}
      </div>
    </PublicShell>
  );
}
