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
    a: "Keep one running record with every gig. At minimum, track the production, date worked, rate, hours, applicable bumps or adjustments, expected/estimated pay, actual payment and whether the gig has been paid. A spreadsheet works well — the most important thing is consistently recording the information while it's still fresh.",
  },
  {
    q: "What should I write down after every background gig?",
    a: "Record the production and casting company, payroll provider when known, date worked, advertised rate, guaranteed hours, actual hours, applicable bumps or adjustments, voucher/reference information and payment status. Those records give you something concrete to compare with your payment later.",
  },
  {
    q: "Is there a free background-actor pay tracker?",
    a: "Yes. You can download the free spreadsheet included with this guide and use it in Excel or Google Sheets. It has all the fields covered here and estimates your expected gross and the difference versus what you were actually paid.",
  },
  {
    q: "Do I need an app to track my acting payments?",
    a: "No — a spreadsheet can work completely fine. A purpose-built app becomes useful when you're working enough gigs that maintaining the spreadsheet itself starts becoming difficult. GigDock lets you record gig and payment details in one place instead of maintaining your own tracking system.",
  },
  {
    q: "How do I know whether a background-acting payment is late or missing?",
    a: "Don't rely on memory — keep each gig listed until you've recorded its payment. If a job remains unpaid beyond the timeframe applicable to that production, you'll immediately know which payment needs investigation. For SAG-AFTRA-covered productions, specific contractual payment rules and claim procedures may apply.",
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
function PhoneShot({ src, alt }: { src: string; alt: string }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={1206}
      height={2622}
      sizes="240px"
      className="w-full max-w-[230px] h-auto rounded-[1.75rem] border border-zinc-200 dark:border-zinc-800 shadow-sm"
    />
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
        You worked the gig. Now, three or four jobs later, can you remember exactly what you were supposed to be paid?
      </p>
      <P>
        What was the base rate? How long did you work? Was there a car or wardrobe bump? Which payroll company was
        handling it? Did that check ever arrive?
      </P>
      <P>
        You don&rsquo;t need a complicated system to keep track of background-acting pay. You need one reliable record
        with every gig in one place: what you worked, what you expected to earn, and what you actually received.
      </P>
      <P>
        You can start with the free spreadsheet below. If you&rsquo;re working regularly, GigDock gives you a simpler way
        to keep the same information organized without managing rows and columns yourself.
      </P>

      <div className="mt-6"><DownloadButton /></div>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        Free Excel / Google Sheets template with the fields covered in this guide.
      </p>

      <H2>Why tracking your gigs can pay for itself</H2>
      <P>Background work involves more moving pieces than most new actors expect.</P>
      <P>
        A casting company may book you. A production or payroll provider may handle your payment. Your final gross pay
        may include additional hours, bumps or other adjustments. And the payment doesn&rsquo;t necessarily arrive while
        the details of that workday are still fresh in your mind.
      </P>
      <P>That&rsquo;s where things get lost.</P>
      <P>
        Maybe you forget a car adjustment. Maybe the hours on a payment don&rsquo;t match what you recorded. Maybe a
        payment simply hasn&rsquo;t arrived and you don&rsquo;t notice because you&rsquo;ve worked eight gigs since then.
      </P>
      <P>
        A tracker gives you something much better than <em>&ldquo;I think that&rsquo;s right.&rdquo;</em> It gives you a
        record.
      </P>
      <P>
        Not sure how rates, guaranteed hours and bumps work? Start with <PaidLink />. This guide builds on those basics.
      </P>

      <H2>What to track for every background-acting gig</H2>
      <P>
        Whether you use a spreadsheet, notes app or GigDock, capture the information you&rsquo;ll need later to
        reconstruct the job.
      </P>

      <H3>Production, casting company and payroll provider</H3>
      <P>
        These may not all be the same company. Record the production you worked on, who booked you, and — when you know
        it — the company handling payroll.
      </P>

      <H3>Date worked and location</H3>
      <P>
        Record when and where you worked. This becomes especially useful when you&rsquo;re working multiple dates on the
        same production.
      </P>

      <H3>Advertised rate and guaranteed hours</H3>
      <P>Record the booking exactly as it was offered. For example:</P>
      <p className="mt-3 text-center text-2xl font-bold text-zinc-900 dark:text-zinc-100">$150/10</p>
      <P>Don&rsquo;t rely on finding the casting notice again several weeks later.</P>

      <H3>Actual hours worked</H3>
      <P>
        Record your call and wrap times or total hours worked. Additional compensation may apply when you work beyond the
        hours covered by your booking, depending on the production, applicable agreement and employment rules.
      </P>

      <H3>Bumps and other adjustments</H3>
      <P>
        Write down any additional compensation that applied to your job — such as wardrobe, personal-auto use, wet work
        or other applicable adjustments. For SAG-AFTRA-covered work, the union specifically advises background performers
        to check their voucher at wrap and make sure applicable adjustments are recorded before leaving set.
      </P>

      <H3>Estimated gross pay</H3>
      <P>Keep an estimate of what you expect the production to pay before deductions. For a simple booking, that might be:</P>
      <p className="mt-3 rounded-lg bg-zinc-100 dark:bg-zinc-800/60 px-4 py-3 text-center font-semibold text-zinc-800 dark:text-zinc-200">
        Guaranteed pay + additional pay/overtime + bumps or adjustments = estimated gross
      </p>
      <P>
        Treat this as an estimate rather than an official payroll calculation. Overtime and adjustment rules can vary by
        production and applicable agreement.
      </P>

      <H3>Voucher or reference number</H3>
      <P>
        Keep your voucher, electronic voucher or other work record whenever possible. SAG-AFTRA recognizes approved
        electronic vouchers as equivalents to traditional paper vouchers for covered productions.
      </P>

      <H3>Payment timing or follow-up date</H3>
      <P>
        Rather than relying on memory, record when you expect to check on the payment if it hasn&rsquo;t arrived. For
        SAG-AFTRA-covered work, contractual payment requirements may apply, and SAG-AFTRA advises covered background
        actors who have not received initial payment after the applicable period to follow its claim-inquiry process. For
        non-union work, timing can vary based on the production and terms of the booking.
      </P>

      <H3>Actual gross and net pay</H3>
      <P>
        When payment arrives, record both amounts when available. <strong>Gross pay</strong> tells you what payroll says
        you earned before deductions; <strong>net pay</strong> tells you what actually reached you after deductions.
        Comparing expected gross with actual gross is much more useful than comparing your estimate with the amount
        deposited into your bank account.
      </P>

      <H3>Paid or unpaid</H3>
      <P>
        This may be the simplest field in the entire tracker — and one of the most valuable. When you&rsquo;re working
        frequently, you should be able to see which jobs still haven&rsquo;t been marked paid without trying to remember
        them.
      </P>

      <H3>Notes</H3>
      <P>
        Record anything else that might matter later. If you find yourself thinking, <em>I&rsquo;ll remember that</em>,
        put it in the notes instead.
      </P>

      <H2>Get the free background-actor pay spreadsheet</H2>
      <P>The free Gig &amp; Pay Tracker contains the fields above and gives you one row for every job.</P>
      <div className="mt-4"><DownloadButton /></div>
      <P>Start by replacing the example row with your own gig. The spreadsheet can help you organize:</P>
      <ul className="mt-3 list-disc space-y-1.5 pl-5">
        <li>Production and casting information</li>
        <li>Rate and guaranteed hours</li>
        <li>Actual hours</li>
        <li>Bumps and adjustments</li>
        <li>Estimated gross pay</li>
        <li>Voucher / reference information</li>
        <li>Actual gross and net payment</li>
        <li>Paid / unpaid status</li>
        <li>Notes</li>
      </ul>
      <P>
        The goal isn&rsquo;t to turn a spreadsheet into a payroll system. It&rsquo;s to give you enough information to
        recognize when something deserves a closer look.
      </P>

      <H2>Use your tracker at three moments</H2>
      <P>The easiest system is one that you update while the information is still fresh.</P>
      <ol className="mt-3 list-decimal space-y-3 pl-5">
        <li>
          <strong>When you&rsquo;re booked.</strong> Add the production, casting company, work date and advertised rate.
          This also preserves the original terms of the booking before the casting notice disappears or becomes hard to find.
        </li>
        <li>
          <strong>When you wrap.</strong> Record your actual hours and applicable bumps or adjustments. Keep your voucher
          or electronic work record when possible, and verify that the information is correct before leaving set.
        </li>
        <li>
          <strong>When you&rsquo;re paid.</strong> Enter the actual gross and net amounts, mark the gig paid, and compare
          the payment with what you recorded. If something doesn&rsquo;t match, you now have the information necessary to
          investigate instead of trying to reconstruct the workday from memory.
        </li>
      </ol>

      <H2>When a spreadsheet starts becoming a chore</H2>
      <P>A spreadsheet can work extremely well — especially when you&rsquo;re just getting started.</P>
      <P>
        But imagine you&rsquo;ve worked 40 or 50 gigs. Now you&rsquo;re maintaining rows, finding old bookings, checking
        payments and trying to remember which jobs are still outstanding. That&rsquo;s the problem GigDock was built to
        simplify.
      </P>
      <P>
        With GigDock, you can record your gigs, rates, hours and bumps in one place, then record your gross and net
        payment when it arrives. That makes it easier to keep your gig history together and see which gigs you
        haven&rsquo;t yet marked paid.
      </P>

      <figure className="mt-6">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
          <PhoneShot
            src="/guides/gigdock-app-gig-detail-earnings.png"
            alt="The GigDock app's Gig Detail screen showing gross earned, received and outstanding pay, plus the payment structure with a guarantee and a 1.5x overtime multiplier."
          />
          <PhoneShot
            src="/guides/gigdock-app-payments-summary.png"
            alt="The GigDock app's Payments summary, showing total received versus outstanding pay for the month and a chart of payments received over time."
          />
        </div>
        <figcaption className="mt-3 text-center text-sm text-zinc-500 dark:text-zinc-400">
          Your gig and payment information together in the GigDock mobile app.
        </figcaption>
      </figure>

      <H2>Start with the spreadsheet. Move beyond it when you need to.</H2>
      <P>
        There is nothing wrong with a spreadsheet. In fact, we&rsquo;d rather you track your gigs in a spreadsheet than
        not track them at all.
      </P>
      <div className="mt-6 rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 p-6">
        <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
          And if maintaining the spreadsheet eventually becomes one more thing you have to remember, GigDock gives you a
          purpose-built place to manage your gig history and payments — and brings casting opportunities from multiple
          sources together so you can start looking for the next one.
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

      <H2>Sources</H2>
      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-zinc-600 dark:text-zinc-400">
        <li>
          SAG-AFTRA — <a href="https://www.sagaftra.org/empowered-background-actor" target="_blank" rel="noopener noreferrer nofollow" className="text-blue-600 hover:underline dark:text-blue-400">The Empowered Background Actor</a> (vouchers, adjustments, payment timing and claim inquiries).
        </li>
      </ul>

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
