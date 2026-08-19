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
    a: "Keep one running record — a spreadsheet or an app — with a row for every gig: production, casting company, date worked, rate, hours, bumps, expected pay, and whether it arrived. The tool matters less than the habit of logging each gig the day you work it, while the details are fresh.",
  },
  {
    q: "What should I write down after every background gig?",
    a: "At minimum: the production and casting company, the payroll company, the date you worked, your base rate and guaranteed hours, your actual call-to-wrap hours, any bumps (wardrobe, car, etc.), your voucher or reference number, and the expected pay date. That's everything you'd need to check a check weeks later.",
  },
  {
    q: "Is there a free background actor pay tracker?",
    a: "Yes — this guide includes a free spreadsheet template you can download and use in Excel or Google Sheets. It has all the fields above and auto-calculates your expected gross and the difference versus what you were actually paid.",
  },
  {
    q: "Do I need an app to track my acting payments?",
    a: "No. A spreadsheet works completely fine, especially when you're starting out. An app like GigDock mainly helps once you're juggling many gigs across several casting companies, where keeping a spreadsheet current becomes its own chore.",
  },
  {
    q: "How do I know if a background acting payment is late or missing?",
    a: "Record an expected pay date and a paid/unpaid status for each gig. When you scan your tracker, anything still marked unpaid past its expected date is a payment to follow up on — instead of trying to remember it across dozens of gigs.",
  },
];

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-10 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{children}</h2>;
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
      Download the free gig &amp; pay tracker
    </a>
  );
}

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
        The fix for missing, late, or wrong background-actor pay isn&rsquo;t complicated — it&rsquo;s a habit. Keep one
        record with a row for every gig: what you worked, what you were owed, and whether it arrived. Then, when a check
        shows up, compare it to what you expected. You can do this with a free spreadsheet (below), and once you&rsquo;re
        working a lot, an app can keep it current for you.
      </p>

      <div className="mt-6"><DownloadButton /></div>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        Free Excel / Google Sheets template — every field below, with expected pay and any difference calculated for you.
      </p>

      <H2>Why tracking pays for itself</H2>
      <P>
        Background pay is slow and split across companies: a casting office books you, a payroll company cuts the check
        weeks later, and the amount includes overtime and bumps that are easy to forget. Miss one car bump, mix up your
        hours, or lose track of a check among a dozen gigs, and you&rsquo;ve quietly left money on the table. A tracker
        turns &ldquo;I think that&rsquo;s right?&rdquo; into a two-second check.
      </P>
      <P>
        Not sure how rates, guaranteed hours and bumps actually work?{" "}
        <Link href="/guides/how-background-actors-get-paid" className="font-medium text-blue-600 hover:underline dark:text-blue-400">
          Read how background actors get paid
        </Link>{" "}
        first — this guide builds on it.
      </P>

      <H2>The fields to track for every gig</H2>
      <P>Whatever tool you use, capture these for each gig. (The template has them all.)</P>
      <ul className="mt-3 list-disc space-y-1.5 pl-5">
        <li><strong>Production, casting company &amp; payroll company</strong> — who booked you vs. who actually pays you.</li>
        <li><strong>Date worked</strong> and <strong>location</strong>.</li>
        <li><strong>Base rate + guaranteed hours</strong> (e.g. $150/10) and your <strong>actual hours</strong> and <strong>OT multiplier</strong> — the pay math.</li>
        <li><strong>Bumps</strong> — wardrobe, car, wet work, etc., in dollars.</li>
        <li><strong>Expected gross</strong> — what it should add up to.</li>
        <li><strong>Voucher / reference number</strong> and <strong>expected pay date</strong> — so you can follow up.</li>
        <li><strong>Actual gross, net received, and paid / unpaid</strong> — did it arrive, and was it right?</li>
        <li><strong>Notes</strong> — anything you&rsquo;d otherwise forget.</li>
      </ul>

      <H2>Get the free spreadsheet</H2>
      <P>
        The template below has every field above. Type over the gray example row, fill in the white columns for each gig,
        and the shaded <strong>Expected Gross</strong> and <strong>Difference</strong> columns calculate themselves. When
        a payment lands, enter the actual gross — if the difference isn&rsquo;t $0, something&rsquo;s worth a closer look.
      </P>
      <div className="mt-4"><DownloadButton /></div>

      <H2>How to use it (three moments)</H2>
      <ul className="mt-3 list-disc space-y-1.5 pl-5">
        <li><strong>When you book</strong> — add the production, casting company, date, rate and guaranteed hours.</li>
        <li><strong>On set / at wrap</strong> — record your actual hours and every bump, and snap a photo of your signed voucher. Confirm the adjustments before you leave.</li>
        <li><strong>When you&rsquo;re paid</strong> — enter the actual gross and net, mark it paid, and check the difference against your expected gross.</li>
      </ul>

      <H2>When a spreadsheet isn&rsquo;t enough</H2>
      <P>
        You can absolutely run this on a spreadsheet — and when you&rsquo;re starting out, you should. But once
        you&rsquo;re working multiple gigs across multiple casting companies, keeping it updated becomes another job.
        That&rsquo;s the point where an app earns its place: GigDock keeps your gigs, rates, hours, bumps and payments
        together in one place, shows your gross and net per gig, and lets you see at a glance which gigs are still unpaid.
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
          The same tracking, kept current for you — what&rsquo;s paid, what&rsquo;s still owed.
        </figcaption>
      </figure>

      <div className="mt-6 rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 p-6">
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Start with the spreadsheet — upgrade when you outgrow it</h3>
        <p className="mt-1.5 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
          Grab the free tracker below. When updating it starts to feel like a chore, GigDock keeps every gig, rate, hour,
          bump and payment in one place — and gathers casting calls into one feed so you can find the next gig too.
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
        General information for background actors and extras, not legal or tax advice. Overtime and pay rules vary by
        production, market and union agreement — always confirm against the terms of your booking.
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
