import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import PublicShell from "@/components/PublicShell";
import BetaSignupForm from "@/components/BetaSignupForm";
import AppCta from "@/components/AppCta";
import { APP_LIVE, BETA_ANCHOR } from "@/lib/appPromo";

const BASE = "https://www.gigdock.co";
const PATH = "/app";
const TITLE = "GigDock App — Find Film & TV Gigs, Track Work & Pay";
const DESCRIPTION =
  "Find film & TV opportunities, keep your gigs organized, track your schedule, earnings and payments, and manage your gig life in one place with GigDock. Join the beta on iPhone and Android.";
const HERO_SHOT = "/guides/gigdock-app-gig-detail-earnings.png";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: {
    title: TITLE, description: DESCRIPTION, type: "website", siteName: "GigDock", url: `${BASE}${PATH}`,
    images: [{ url: HERO_SHOT, width: 1206, height: 2622, alt: "The GigDock app showing a gig's details and earnings" }],
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const FAQ: { q: string; a: string }[] = [
  { q: "What does GigDock do?", a: "GigDock helps you manage the lifecycle of TV & film gig work. Find opportunities, keep your gigs and schedule organized, record important work details, and track earnings and payments in one place." },
  { q: "Who is GigDock for?", a: "GigDock is designed for people who work gigs in TV & film. The current experience is especially useful for people managing short-term opportunities, bookings, work dates and payments, and we're continuing to expand the kinds of gig work GigDock can support." },
  { q: "Can I use GigDock on the web?", a: "GigDock.co lets you browse current film & TV opportunities on the web. The GigDock mobile app is where you manage the broader gig experience — your gigs, schedule, earnings, payments and other work information." },
  { q: "How much does GigDock cost?", a: "GigDock is free during the beta. If anything about pricing changes in the future, we'll communicate it clearly before it affects you." },
  { q: "Which phones does GigDock support?", a: "GigDock is available in beta for both iPhone and Android. Select your phone when requesting beta access so we can send you the correct invitation." },
  { q: "What does “beta” mean?", a: "GigDock is nearing public launch, but we're still testing and refining the experience with real users. Beta members get early access and can help us improve the product before it reaches the app stores publicly." },
];

/* ---------- building blocks ---------- */

function PhoneShot({ src, alt, priority = false }: { src: string; alt: string; priority?: boolean }) {
  return (
    <div className="mx-auto w-full max-w-[248px] rounded-[2rem] border-[6px] border-zinc-900 dark:border-zinc-700 bg-zinc-900 dark:bg-zinc-700 shadow-2xl overflow-hidden">
      <Image src={src} alt={alt} width={1206} height={2622} priority={priority} sizes="248px" className="w-full h-auto rounded-[1.5rem]" />
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">{children}</p>;
}

// A feature block. With `shot`, it lays out two columns; without, it's a centered
// prose column so a screenshot-less section still reads as finished.
function Feature({
  eyebrow, title, children, cta, reverse = false, shot,
}: {
  eyebrow: string; title: string; children: React.ReactNode; cta?: React.ReactNode; reverse?: boolean; shot?: React.ReactNode;
}) {
  if (!shot) {
    return (
      <div className="mx-auto max-w-2xl">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h3 className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{title}</h3>
        <div className="mt-3 space-y-3 text-zinc-600 dark:text-zinc-300 leading-relaxed">{children}</div>
        {cta && <div className="mt-4">{cta}</div>}
      </div>
    );
  }
  return (
    <div className={`flex flex-col gap-8 md:flex-row md:items-center ${reverse ? "md:flex-row-reverse" : ""}`}>
      <div className="flex-1">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h3 className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{title}</h3>
        <div className="mt-3 space-y-3 text-zinc-600 dark:text-zinc-300 leading-relaxed">{children}</div>
        {cta && <div className="mt-4">{cta}</div>}
      </div>
      <div className="flex-1 w-full">{shot}</div>
    </div>
  );
}

const browseLink = (
  <Link href="/opportunities" className="text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400">
    Browse current opportunities →
  </Link>
);

/* ---------- page ---------- */

export default function Page() {
  const appLd = {
    "@context": "https://schema.org", "@type": "SoftwareApplication",
    name: "GigDock", applicationCategory: "BusinessApplication", operatingSystem: "iOS, Android",
    description: DESCRIPTION, offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    publisher: { "@type": "Organization", name: "GigDock", url: BASE },
  };
  const faqLd = {
    "@context": "https://schema.org", "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };

  return (
    <PublicShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(appLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      <div className="mx-auto max-w-4xl">
        {/* ---------- HERO ---------- */}
        <section className="grid gap-10 py-6 md:grid-cols-2 md:items-center md:py-10">
          <div>
            {!APP_LIVE && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 dark:border-blue-900/60 bg-blue-50 dark:bg-blue-950/40 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> In beta · iPhone &amp; Android
              </span>
            )}
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-5xl">
              Your gig life. Simplified.
            </h1>
            <p className="mt-3 text-xl font-semibold text-zinc-700 dark:text-zinc-200">
              From opportunity to paycheck, keep it all together.
            </p>
            <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-300 leading-relaxed">
              GigDock brings film &amp; TV opportunities, gig details, your schedule, documents, earnings and payments
              into one place — so your gig life isn&rsquo;t scattered across casting sites, social feeds, texts,
              screenshots, notes, calendars and spreadsheets.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <AppCta variant="buttons" />
              <Link href="/opportunities" className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">
                Browse opportunities →
              </Link>
            </div>
            {!APP_LIVE && <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">Free beta access · iPhone &amp; Android</p>}
          </div>
          <PhoneShot src={HERO_SHOT} alt="The GigDock app showing a gig with its rate, hours and earnings" priority />
        </section>

        {/* ---------- PROBLEM ---------- */}
        <section className="border-t border-zinc-200 dark:border-zinc-800 py-12">
          <div className="mx-auto max-w-2xl">
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Gig work is scattered by default.</h2>
            <div className="mt-3 space-y-3 text-zinc-600 dark:text-zinc-300 leading-relaxed">
              <p>Finding the work is one process. Getting booked is another.</p>
              <p>Then there are work dates, call times, production details, rates, documents, hours, additional pay and
                payments that may arrive long after the gig is over.</p>
              <p>The information ends up everywhere — casting sites, social posts, emails, texts, screenshots, calendars,
                notes and spreadsheets.</p>
              <p>GigDock gives all of that work a home. Not another place to check.{" "}
                <strong className="text-zinc-900 dark:text-zinc-100">One place to keep your gig life together.</strong></p>
            </div>
          </div>
        </section>

        {/* ---------- WORKFLOW ---------- */}
        <section className="border-t border-zinc-200 dark:border-zinc-800 py-12">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">One workflow from opportunity to paycheck.</h2>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              { n: "1", t: "Discover", d: "Find film & TV opportunities from multiple sources in one place. Save the ones worth revisiting and keep track of opportunities you've applied to." },
              { n: "2", t: "Work", d: "When an opportunity becomes a gig, keep the production, companies, dates, rate, hours, bumps, documents and other important details together." },
              { n: "3", t: "Get paid", d: "Record payments when they arrive, track gross and net, and see what you've received and what is still outstanding." },
            ].map((s) => (
              <div key={s.n} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">{s.n}</div>
                <h3 className="mt-3 font-bold text-zinc-900 dark:text-zinc-100">{s.t}</h3>
                <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-lg font-semibold text-zinc-800 dark:text-zinc-100">Opportunity → Gig → Pay</p>
          <p className="mx-auto mt-1 max-w-xl text-center text-sm text-zinc-500 dark:text-zinc-400">
            Most systems help with one part of gig work. GigDock connects the lifecycle.
          </p>
        </section>

        {/* ---------- FEATURE SECTIONS ---------- */}
        <section className="space-y-16 border-t border-zinc-200 dark:border-zinc-800 py-12">
          <Feature eyebrow="Find opportunities" title="Spend less time hunting for the next gig." cta={browseLink}>
            <p>Film &amp; TV opportunities are scattered across casting sites, company pages and social feeds. GigDock
              brings opportunities from multiple sources into one searchable feed so you can spend less time checking
              site after site and more time finding work that fits.</p>
            <p>Save opportunities you want to revisit and keep track of the ones you&rsquo;ve applied to, so a promising
              casting call doesn&rsquo;t disappear into your screenshots or social feed.</p>
            <p><strong>GigFit</strong> helps you quickly see how an opportunity&rsquo;s requirements line up with your
              profile, making it easier to focus on the opportunities that may fit you best.</p>
          </Feature>

          <Feature eyebrow="Manage your gigs" title="When it becomes work, keep the details with it.">
            <p>A booking can generate a surprising amount of information. GigDock gives each gig its own home.</p>
            <p>Keep the production or project, casting company, payroll company, work dates, rate and guaranteed hours
              together. Add the hours you actually worked, bumps or additional pay, notes and other details as the gig
              unfolds.</p>
            <p>No digging through old texts three weeks later trying to remember what the booking said. No wondering
              which screenshot had the rate. The information stays with the gig.</p>
          </Feature>

          <Feature eyebrow="Stay on top of it" title="Know what's next.">
            <p>Gig work moves quickly — what matters today may be completely different tomorrow. GigDock gives your work
              dates a home so you can see what&rsquo;s coming up and keep your schedule connected to the gigs themselves.</p>
            <p>Use <strong>Today</strong> for what&rsquo;s relevant now and <strong>Calendar</strong> to see your work
              across the days ahead — instead of piecing your schedule together from booking messages and memory.</p>
          </Feature>

          <Feature eyebrow="Know what you've earned" title="Your rate is only the beginning." reverse
            shot={<PhoneShot src="/guides/gigdock-app-gig-detail-earnings.png" alt="The GigDock app's gig detail showing the payment structure and earnings for a gig" />}>
            <p>Keep the money side of the gig connected to the work that produced it. Record the payment structure, hours
              and applicable bumps or additional pay so your earnings stay tied to the gig instead of living in a separate
              spreadsheet or note.</p>
            <p>As the gig progresses, you have a record you can look back on rather than trying to reconstruct the
              workday later.</p>
          </Feature>

          <Feature eyebrow="Track your pay" title="Know what you've received — and what's still outstanding."
            shot={<PhoneShot src="/guides/gigdock-app-payments-summary.png" alt="The GigDock payments summary showing received versus outstanding pay" />}>
            <p>A payment arriving doesn&rsquo;t mean you should have to remember exactly which gig it belongs to or what
              you expected weeks earlier. Record your payment when it arrives and keep both gross and net amounts when
              available.</p>
            <p>GigDock gives you a clear view of what you&rsquo;ve recorded as received and what remains outstanding — so{" "}
              <em>&ldquo;Did I ever get paid for that gig?&rdquo;</em> doesn&rsquo;t have to depend on memory.</p>
          </Feature>

          <Feature eyebrow="Keep the paperwork" title="Keep important documents close to the gig.">
            <p>Gig work creates paperwork too. Keep relevant documents with your work so the information you may need
              later isn&rsquo;t buried in your camera roll, downloads folder or inbox.</p>
            <p>The goal isn&rsquo;t simply to store files. It&rsquo;s to keep the information around a gig connected.</p>
          </Feature>

          <Feature eyebrow="See the bigger picture" title="Your gigs tell a story.">
            <p>Once your work and payments are organized, GigDock can help you see more than a list of individual gigs.
              See your earnings, work activity and payment status for the current period so you can understand how your
              gig work is adding up.</p>
            <p>The more consistently you keep your information in GigDock, the more useful that picture becomes.</p>
          </Feature>
        </section>

        {/* ---------- BEFORE / AFTER ---------- */}
        <section className="border-t border-zinc-200 dark:border-zinc-800 py-12">
          <h2 className="text-center text-2xl font-bold text-zinc-900 dark:text-zinc-100">Less juggling. More clarity.</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Without GigDock</p>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
                The opportunity might be on one site. The booking details are in a text. The date is on your calendar.
                The rate is in a screenshot. Your work notes are somewhere else. And weeks later, you&rsquo;re trying to
                remember whether the payment ever arrived.
              </p>
            </div>
            <div className="rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">With GigDock</p>
              <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-200 leading-relaxed">
                Find opportunities. Keep the gig organized. See what&rsquo;s coming up. Keep important details and
                documents together. Record the payment. Look back at your gig history when you need it.
              </p>
            </div>
          </div>
          <p className="mt-6 text-center text-lg font-semibold text-zinc-900 dark:text-zinc-100">Your gig life, all in one place.</p>
        </section>

        {/* ---------- WHY GIGDOCK ---------- */}
        <section className="border-t border-zinc-200 dark:border-zinc-800 py-12">
          <div className="mx-auto max-w-2xl">
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Built around the way TV &amp; film gig work actually happens.</h2>
            <div className="mt-3 space-y-3 text-zinc-600 dark:text-zinc-300 leading-relaxed">
              <p>GigDock isn&rsquo;t meant to be another generic job board. And it isn&rsquo;t just a payment tracker.</p>
              <p>It&rsquo;s a home for people working gigs in TV &amp; film — connecting the work you&rsquo;re looking for
                with the work you&rsquo;ve booked and the money you&rsquo;ve earned.</p>
              <p>We&rsquo;re starting with the parts of gig life that create the most friction today and continuing to
                expand what GigDock can help you manage.</p>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">Find the work. Manage the gig. Track the pay.</p>
            </div>
          </div>
        </section>

        {/* ---------- BETA SIGNUP ---------- */}
        <section id={BETA_ANCHOR} className="scroll-mt-20 border-t border-zinc-200 dark:border-zinc-800 py-12">
          <div className="mx-auto max-w-md text-center">
            {APP_LIVE ? (
              <>
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Get GigDock</h2>
                <p className="mt-2 text-zinc-600 dark:text-zinc-300">Free on iPhone and Android.</p>
                <div className="mt-6 flex justify-center"><AppCta variant="buttons" center /></div>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Get early access to GigDock.</h2>
                <p className="mt-2 text-zinc-600 dark:text-zinc-300">
                  GigDock is currently in beta on iPhone and Android. Join now to try it before the public launch and
                  help shape what we build next.
                </p>
                <div className="mt-6 text-left"><BetaSignupForm /></div>
              </>
            )}
          </div>
        </section>

        {/* ---------- FAQ ---------- */}
        <section className="border-t border-zinc-200 dark:border-zinc-800 py-10">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Frequently asked questions</h2>
          <div className="mt-4 divide-y divide-zinc-200 dark:divide-zinc-800">
            {FAQ.map((f) => (
              <div key={f.q} className="py-4">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{f.q}</h3>
                <p className="mt-1.5 text-zinc-600 dark:text-zinc-300 leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ---------- FINAL CTA ---------- */}
        <section className="pb-12">
          <div className="rounded-2xl bg-blue-600 p-8 text-center text-white">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-100">Your gig life. Simplified.</p>
            <h2 className="mt-2 text-2xl font-bold">Find the work. Keep the details. Know where your money stands.</h2>
            <p className="mx-auto mt-2 max-w-lg text-blue-50">
              From the next opportunity to the last payment, GigDock gives your TV &amp; film gig life a home.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-4">
              <Link href={`#${BETA_ANCHOR}`} className="inline-flex items-center rounded-full bg-white px-6 py-3.5 font-semibold text-blue-700 transition-colors hover:bg-blue-50">
                {APP_LIVE ? "Download GigDock" : "Get early access"}
              </Link>
              <Link href="/opportunities" className="text-sm font-medium text-blue-50 hover:text-white hover:underline">
                Browse opportunities →
              </Link>
            </div>
          </div>
        </section>
      </div>
    </PublicShell>
  );
}
