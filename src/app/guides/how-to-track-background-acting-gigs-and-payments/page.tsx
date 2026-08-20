import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import PublicShell from "@/components/PublicShell";

const BASE = "https://www.gigdock.co";
const PATH = "/guides/how-to-track-background-acting-gigs-and-payments";
const TITLE = "How to Track Background Acting Gigs & Payments (+ Free Spreadsheet)";
const DESCRIPTION =
  "A simple system for tracking your background acting gigs and pay — the exact fields to record, a free downloadable spreadsheet template, and how to catch a missing or wrong paycheck.";
const TRACKER = "/guides/gigdock-gig-payment-tracker.xlsx";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: { title: TITLE, description: DESCRIPTION, type: "article", siteName: "GigDock", url: `${BASE}${PATH}` },
};

const FAQ: { q: string; a: string }[] = [
  {
    q: "What's the best way to track background acting gigs?",
    a: "Keep one consistent record for every gig you work. At minimum, record the production, date worked, advertised rate, actual hours, applicable bumps, payment amount and whether you've been paid. You can build your own spreadsheet or use an app designed for gig tracking — the most important thing is recording the information consistently while it's still fresh.",
  },
  {
    q: "What should I write down after a background acting job?",
    a: "Record the production, casting company, date worked, advertised rate, actual hours and applicable bumps or adjustments, and keep your voucher or reference information when possible. Once payment arrives, add the actual gross and net amounts and mark the gig paid.",
  },
  {
    q: "Should background actors use a spreadsheet to track payments?",
    a: "A spreadsheet can work well if you're comfortable creating and maintaining your own system — you'd typically need a row for every gig and columns for rates, hours, bumps, payments and payment status, kept updated after every job. A purpose-built app like GigDock organizes the same gig and payment information without requiring you to build your own structure.",
  },
  {
    q: "How can I tell if a background acting payment is missing?",
    a: "Keep every gig in your tracking system until you've recorded its payment. That way you don't have to remember which productions still owe you money — you can simply review the gigs you haven't yet marked paid. If a payment appears late, check the terms of the booking or applicable union agreement before following up.",
  },
  {
    q: "Should I track gross pay or net pay?",
    a: "Ideally, track both. Gross pay tells you what you earned before deductions; net pay tells you what you actually received after deductions. Keeping both makes it easier to distinguish a payroll discrepancy from normal taxes or other deductions.",
  },
  {
    q: "Why should I keep my voucher?",
    a: "Your voucher or electronic work record can contain important information about your hours and applicable adjustments. Keeping it gives you documentation to refer back to if the payment you receive doesn't match what you expected.",
  },
];

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-10 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{children}</h2>;
}
function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-6 text-lg font-bold text-zinc-900 dark:text-zinc-100">{children}</h3>;
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 leading-relaxed">{children}</p>;
}
function PhoneFig({ src, alt, caption }: { src: string; alt: string; caption: string }) {
  return (
    <figure className="mt-6 flex flex-col items-center">
      <Image
        src={src}
        alt={alt}
        width={1206}
        height={2622}
        sizes="240px"
        className="w-full max-w-[240px] h-auto rounded-[1.75rem] border border-zinc-200 dark:border-zinc-800 shadow-sm"
      />
      <figcaption className="mt-3 text-center text-sm text-zinc-500 dark:text-zinc-400 max-w-sm">{caption}</figcaption>
    </figure>
  );
}
function DownloadButton() {
  return (
    <a
      href={TRACKER}
      download
      className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Download the free Gig &amp; Pay Tracker
    </a>
  );
}
const PaidLink = () => (
  <Link href="/guides/how-background-actors-get-paid" className="font-medium text-blue-600 hover:underline dark:text-blue-400">
    How Do Background Actors Get Paid?
  </Link>
);

function Guide() {
  return (
    <article className="mx-auto max-w-2xl py-4 text-zinc-800 dark:text-zinc-200">
      <nav className="text-sm text-zinc-500 dark:text-zinc-400 mb-3" aria-label="Breadcrumb">
        <Link href="/guides" className="hover:text-zinc-800 dark:hover:text-zinc-200">Guides</Link>
        <span className="mx-1.5">›</span>
        <span className="text-zinc-700 dark:text-zinc-300">Tracking gigs &amp; pay</span>
      </nav>

      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 text-balance">
        How to track your background acting gigs and pay
      </h1>
      <p className="mt-3 text-xl font-semibold text-blue-600 dark:text-blue-400">Never lose track of another paycheck.</p>

      <p className="mt-5 text-lg text-zinc-700 dark:text-zinc-300 leading-relaxed">
        You worked the gig. A few weeks and several jobs later, can you still remember exactly what you were supposed to
        be paid?
      </p>
      <P>
        What was the rate? How many hours did you work? Was there a car or wardrobe bump? Did the payment arrive? And if
        it did, was the amount right?
      </P>
      <P>
        The easiest way to protect yourself is to keep one reliable record of every gig you work — what you were booked
        for, what happened on set, and what you were eventually paid.
      </P>
      <P>
        You can build your own spreadsheet or tracking system to do this manually (there&rsquo;s a free template below),
        or you can use GigDock, which was built specifically to keep your background gigs and payments organized in one
        place.
      </P>
      <div className="mt-6"><DownloadButton /></div>
      <P>
        Not sure how rates, guaranteed hours and bumps work? Read <PaidLink /> first. This guide builds on those basics.
      </P>

      <H2>Why tracking your gigs matters</H2>
      <P>Background work involves more moving pieces than many new actors expect.</P>
      <P>
        One company may cast you. You may work on several different productions in the same month. Your rate might
        include guaranteed hours. Your final pay may include overtime or additional bumps. And the company that processes
        your payment may be different from the casting company that booked you.
      </P>
      <P>Then time passes. You work another gig. And another.</P>
      <P>
        A payment arrives — but do you remember whether you were expecting $175, $225 or $275? That is how small
        discrepancies and missing payments become difficult to catch.
      </P>
      <P>
        A good tracking system replaces <em>&ldquo;I think that&rsquo;s right&rdquo;</em> with{" "}
        <em>&ldquo;Here&rsquo;s exactly what I recorded.&rdquo;</em>
      </P>

      <H2>What should you track for every background-acting gig?</H2>
      <P>
        Whether you use a spreadsheet, notes app, GigDock or another system, there are several pieces of information worth
        keeping for every job.
      </P>
      <ol className="mt-4 list-decimal space-y-3 pl-5">
        <li><strong>Production</strong> — the movie, TV show, commercial or other project you worked on. If you work multiple dates on the same production, keep each workday associated with the correct gig.</li>
        <li><strong>Casting company</strong> — the company that booked you. Especially helpful if you work with several casting companies at once.</li>
        <li><strong>Payroll company or payment source</strong> — when you know it. The company that casts you isn&rsquo;t necessarily the one that handles your paycheck.</li>
        <li><strong>Date worked</strong> — an exact record of each date, especially if you return to the same production.</li>
        <li><strong>Advertised rate and guaranteed hours</strong> — exactly as offered (e.g. <strong>$150/10</strong>), so you have the original booking terms even if the notice is hard to find later.</li>
        <li><strong>Actual hours worked</strong> — your call and wrap times, or total hours. Beyond the hours in your booking, additional compensation may apply depending on the production and agreement.</li>
        <li><strong>Bumps and other adjustments</strong> — wardrobe, personal vehicle, wet work, smoke, props, special hair/makeup, or other production-specific adjustments. Under a SAG-AFTRA agreement, make sure applicable adjustments are reflected on your voucher before leaving set whenever possible.</li>
        <li><strong>Voucher or reference information</strong> — keep your voucher, electronic voucher, or confirmation number whenever you&rsquo;re permitted to.</li>
        <li><strong>What you expected to earn</strong> — your own estimate before deductions (base/guaranteed pay + additional hours + applicable bumps). An estimate, not an official payroll calculation.</li>
        <li><strong>Actual gross pay</strong> — the amount you earned before deductions; usually the most useful number to compare with what you expected.</li>
        <li><strong>Net pay</strong> — what actually reached you after deductions. Gross and net aren&rsquo;t the same, so a smaller deposit doesn&rsquo;t necessarily mean an error.</li>
        <li><strong>Paid or unpaid</strong> — maybe the most important field of all. Once you&rsquo;ve worked dozens of gigs, you shouldn&rsquo;t have to <em>remember</em> which ones are unpaid — you should be able to <em>see</em> it.</li>
      </ol>

      <H2>Track the gig at three moments</H2>
      <P>You don&rsquo;t need to spend much time on records if you update them at the right moments.</P>
      <H3>When you&rsquo;re booked</H3>
      <P>Record the production, casting company, date, advertised rate and guaranteed hours — while the booking is easy to find.</P>
      <H3>When you wrap</H3>
      <P>Update your actual hours worked, applicable bumps or adjustments, and voucher/reference information. If possible, verify your work record is correct before you leave.</P>
      <H3>When you&rsquo;re paid</H3>
      <P>Record the actual gross pay, net pay, payment information and paid status — then compare the payment with what you recorded. If something seems wrong, you now have a much better starting point for figuring out why.</P>

      <H2>You can build your own tracking system</H2>
      <P>
        You don&rsquo;t need special software. You could create a spreadsheet with one row for every gig and columns for:
      </P>
      <p className="mt-3 rounded-lg bg-zinc-100 dark:bg-zinc-800/60 px-4 py-3 text-center text-sm font-semibold text-zinc-800 dark:text-zinc-200 overflow-x-auto">
        Production · Date · Casting Company · Rate · Hours · Bumps · Expected Pay · Actual Gross · Net Pay · Paid
      </p>
      <P>
        Then update it every time you book a job, wrap a job, or receive payment. That works — but it also means
        you&rsquo;re building and maintaining your own system, and as the number of gigs grows, so does everything
        you&rsquo;re juggling across casting companies, productions and payments.
      </P>
      <P>
        Don&rsquo;t want to build it from scratch? Download our free template — it has every field above, and it
        estimates your expected gross and the difference versus what you were actually paid:
      </P>
      <div className="mt-4"><DownloadButton /></div>

      <H2>Or use a tool built for background actors</H2>
      <P>
        That&rsquo;s the problem GigDock was created to simplify. Instead of building your own tracking system, GigDock
        gives you one place to record and manage the details of your gig work — your gigs, rates, hours, bumps, and gross
        and net payments — so your work history and payment information stay together instead of scattered across casting
        notices, messages, notes and spreadsheets. When you look back later, you can see which gigs you&rsquo;ve recorded
        as paid and which you haven&rsquo;t.
      </P>

      <PhoneFig
        src="/guides/gigdock-app-gig-detail-earnings.png"
        alt="The GigDock app's Gig Detail screen showing gross earned, received and outstanding pay, plus the payment structure with a guarantee and a 1.5x overtime multiplier."
        caption="Keep the rate, hours, bumps and payment information for a gig together."
      />
      <PhoneFig
        src="/guides/gigdock-app-payments-summary.png"
        alt="The GigDock app's Payments summary, showing total received versus outstanding pay for the month and a chart of payments received over time."
        caption="See your recorded payments and which gigs haven't yet been marked paid."
      />

      <H2>Tracking shouldn&rsquo;t become another job</H2>
      <P>The goal isn&rsquo;t to create more administrative work — it&rsquo;s the opposite. You want enough recorded that you can answer a few simple questions at any time:</P>
      <ul className="mt-3 list-disc space-y-1.5 pl-5">
        <li>What did I work?</li>
        <li>What was the rate?</li>
        <li>Were there additional bumps or hours?</li>
        <li>What did I ultimately get paid?</li>
        <li>Which gigs haven&rsquo;t I marked paid yet?</li>
      </ul>
      <P>
        If you can answer those quickly, you&rsquo;re far less dependent on memory when a payment arrives weeks after the
        job. And if you&rsquo;re doing background work regularly, that&rsquo;s exactly the kind of organization GigDock is
        designed to provide.
      </P>

      <div className="mt-6 rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 p-6">
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Track your gigs and payments</h3>
        <p className="mt-1.5 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
          Start with the free spreadsheet, and let GigDock take over when maintaining it becomes another chore — one
          place for your gigs, rates, hours, bumps and payments, plus casting calls from across the web in one feed.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <DownloadButton />
          <Link href="/opportunities/atlanta-ga" className="inline-flex items-center px-5 py-3 rounded-full border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold text-sm hover:bg-white dark:hover:bg-zinc-800">Browse casting calls</Link>
        </div>
      </div>

      <H2>Frequently asked questions</H2>
      <div className="mt-4 divide-y divide-zinc-200 dark:divide-zinc-800">
        {FAQ.map((f) => (
          <div key={f.q} className="py-4">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{f.q}</h3>
            <p className="mt-1.5 text-zinc-700 dark:text-zinc-300 leading-relaxed">{f.a}</p>
          </div>
        ))}
      </div>

      <p className="mt-8 text-sm text-zinc-500 dark:text-zinc-400">
        General information for background actors and extras, not legal, payroll or tax advice. Pay, overtime and
        adjustment rules vary by production, market and applicable union agreement. Always confirm the terms that apply to
        your particular booking.
      </p>
    </article>
  );
}

export default function Page() {
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "How to Track Your Background Acting Gigs and Pay",
    description: DESCRIPTION,
    author: { "@type": "Organization", name: "GigDock" },
    publisher: { "@type": "Organization", name: "GigDock", logo: { "@type": "ImageObject", url: `${BASE}/gigdock-logo.png` } },
    mainEntityOfPage: `${BASE}${PATH}`,
  };
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  return (
    <PublicShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <Guide />
    </PublicShell>
  );
}
