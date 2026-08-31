import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import PublicShell from "@/components/PublicShell";
import AppCta from "@/components/AppCta";

const BASE = "https://www.gigdock.co";
const PATH = "/guides/how-to-keep-track-of-gig-work";
const TITLE = "How to Keep Track of Gig Work: Jobs, Hours, Pay & Records";
const DESCRIPTION =
  "Doing the work is only part of the job. How to keep gigs, hours, pay, companies and documents connected — so outstanding money and missing records don’t disappear.";
const HERO = "/guides/keep-track-hero.png";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: {
    title: `${TITLE} · GigDock`,
    description: DESCRIPTION,
    type: "article",
    siteName: "GigDock",
    url: `${BASE}${PATH}`,
    images: [{ url: HERO, width: 1200, height: 630, alt: "How to Keep Track of Gig Work — a GigDock guide" }],
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: [HERO] },
};

const FAQ: { q: string; a: string }[] = [
  {
    q: "What is the best way to keep track of gig work?",
    a: "Use one consistent system that records each gig, its work dates, company or client, compensation, actual hours, earnings and payment status. The most important thing is keeping the information connected instead of tracking dates, money and documents in unrelated places.",
  },
  {
    q: "How do I keep track of multiple gigs?",
    a: "Create a separate record for every gig and use a calendar or status system to distinguish upcoming, booked, completed and paid work. Avoid relying entirely on messages or memory.",
  },
  {
    q: "How should I track gig payments?",
    a: "Record what you earned separately from what you've actually received. This allows you to calculate outstanding pay and match future payments back to the correct gig.",
  },
  {
    q: "Should I use a spreadsheet to track gigs?",
    a: "A spreadsheet can work well when you're getting started. As the number of gigs grows, a dedicated system can make it easier to connect schedules, hours, payments, documents and work history.",
  },
  {
    q: "Why should I keep old gig records?",
    a: "Your history can help with payment questions, taxes and recordkeeping, proof of work or income, and understanding how your gig career is developing over time.",
  },
];

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-10 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{children}</h2>;
}
function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-6 text-lg font-bold text-zinc-900 dark:text-zinc-100">{children}</h3>;
}
function P({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={`mt-3 leading-relaxed ${className ?? ""}`}>{children}</p>;
}
function UL({ items }: { items: React.ReactNode[] }) {
  return <ul className="mt-3 list-disc space-y-1.5 pl-5">{items.map((t, i) => <li key={i}>{t}</li>)}</ul>;
}
const A = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <Link href={href} className="font-medium text-blue-600 hover:underline dark:text-blue-400">{children}</Link>
);
function Figure({ src, alt, w, h }: { src: string; alt: string; w: number; h: number }) {
  return (
    <figure className="mt-6">
      <Image src={src} alt={alt} width={w} height={h} sizes="(max-width: 1024px) 100vw, 960px"
        className="w-full h-auto rounded-xl border border-zinc-200 dark:border-zinc-800" />
    </figure>
  );
}

export default function Page() {
  const articleLd = {
    "@context": "https://schema.org", "@type": "Article",
    headline: TITLE, description: DESCRIPTION,
    image: `${BASE}${HERO}`,
    author: { "@type": "Organization", name: "GigDock" },
    publisher: { "@type": "Organization", name: "GigDock", logo: { "@type": "ImageObject", url: `${BASE}/gigdock-logo.png` } },
    mainEntityOfPage: `${BASE}${PATH}`,
  };
  const faqLd = {
    "@context": "https://schema.org", "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  const breadcrumbLd = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "GigDock", item: BASE },
      { "@type": "ListItem", position: 2, name: "Guides", item: `${BASE}/guides` },
      { "@type": "ListItem", position: 3, name: TITLE, item: `${BASE}${PATH}` },
    ],
  };

  return (
    <PublicShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      <article className="mx-auto max-w-5xl py-4 text-zinc-800 dark:text-zinc-200">
        <nav className="text-sm text-zinc-500 dark:text-zinc-400 mb-3" aria-label="Breadcrumb">
          <Link href="/guides" className="hover:text-zinc-800 dark:hover:text-zinc-200">Guides</Link>
          <span className="mx-1.5">›</span>
          <span className="text-zinc-700 dark:text-zinc-300">Keeping track of gig work</span>
        </nav>

        <Image src={HERO} alt="How to Keep Track of Gig Work: Jobs, Hours, Pay and Records — keep the important details connected from booking through payment. A GigDock guide."
          width={1200} height={630} priority sizes="(max-width: 1024px) 100vw, 960px" className="w-full h-auto rounded-2xl" />
        <h1 className="sr-only">How to Keep Track of Gig Work: Jobs, Hours, Pay &amp; Records</h1>

        <P className="mt-6">When you only have one gig to keep up with, the details may seem easy enough to remember.</P>
        <P>Then another opportunity comes along.</P>
        <P>One job is booked for Tuesday. Another is waiting on confirmation. The rate for one is buried in a text message. You worked longer than expected on another. A payment arrives weeks later from a company name you barely recognize. Meanwhile, a receipt, contract or work document you need is somewhere in your email or camera roll.</P>
        <P>That is one of the hidden challenges of gig work: <strong>doing the work is only part of the job. You also have to keep track of the work.</strong></P>
        <P>Whether you work in entertainment, events, production, promotions, modeling, performance or another project-based field, a simple system can make your gig life much easier to manage.</P>

        <H2>What should you keep track of for each gig?</H2>
        <P>You don&rsquo;t need to record every possible detail. You do need enough information to answer a few basic questions later:</P>
        <P><strong>What was the gig? When did I work? Who was it for? What was I supposed to earn? What actually happened? And did I get paid?</strong></P>
        <Figure src="/guides/keep-track-what-to-track.png" w={1200} h={760}
          alt="What to track for every gig: project or gig name, company or client, work dates, rate or compensation, actual hours worked, additional pay or adjustments, payments and status, and notes plus documents. The rule: keep the important information connected to the gig that created it." />
        <P>A useful gig record typically includes:</P>
        <UL items={[
          "Project or gig name",
          "Company or client",
          "Work location",
          "Booking or work dates",
          "Rate or agreed compensation",
          "Scheduled or guaranteed hours, if applicable",
          "Actual hours worked",
          "Additional compensation or adjustments",
          "Expected earnings",
          "Payments received",
          "Payment status",
          "Notes",
          "Related documents",
        ]} />
        <P>The exact information varies by type of work. A background actor might need to record a casting company, production, payroll company and wardrobe bump. A brand ambassador might care about the agency, event, hourly rate and reimbursement. A production worker may want the project, department, position, day rate and payroll company.</P>
        <P>The principle is the same: <strong>keep the important information connected to the gig that created it.</strong></P>

        <H2>Start tracking before the gig happens</H2>
        <P>A common mistake is waiting until after the job to create a record.</P>
        <P>By then, important information may already be scattered across emails, texts, social posts and screenshots.</P>
        <P>When you&rsquo;re booked, record the basic details immediately:</P>
        <p className="mt-3 rounded-lg bg-zinc-100 dark:bg-zinc-800/60 px-4 py-3 text-center text-sm font-semibold text-zinc-800 dark:text-zinc-200 overflow-x-auto">
          Project → company → date → location → rate → status
        </p>
        <P>You can fill in hours, earnings and payment information later.</P>
        <P>This also gives you one place to check when someone asks, “Are you available next Thursday?”</P>
        <P>Instead of searching through messages or relying on memory, you can look at your gig calendar.</P>

        <H2>Track what actually happened, not just what was booked</H2>
        <P>The original booking tells you what was expected.</P>
        <P>Your work record should tell you what actually happened.</P>
        <P>Suppose you accepted a gig advertised at $200 for 10 hours. You ended up working 12 hours and qualified for an additional $25 payment.</P>
        <P>If you only save the original $200 rate, your record no longer reflects the work you performed.</P>
        <Figure src="/guides/keep-track-booked-vs-actual.png" w={1200} h={675}
          alt="Booked versus what actually happened: a gig booked at $200 for 10 hours versus the actual work of 12 hours plus $25 extra. If you only save the original booking, your record may no longer match the work." />
        <P>Depending on your type of gig, record things such as:</P>
        <UL items={[
          "Actual start and end time",
          "Breaks or unpaid time when relevant",
          "Total hours",
          "Overtime",
          "Additional pay",
          "Reimbursements",
          "Changes to the original agreement",
        ]} />
        <P>For some types of entertainment work, these details can make a meaningful difference in what you ultimately earn.</P>

        <H2>Separate earnings from payments</H2>
        <P>This is one of the most useful habits a gig worker can develop.</P>
        <P><strong>Earning money and receiving money are not the same event.</strong></P>
        <P>Imagine you work three gigs:</P>
        <Figure src="/guides/keep-track-earned-vs-received.png" w={1200} h={675}
          alt="Earned is not the same as received. Three gigs totaling $825 earned and $425 received leave $400 outstanding. Payment can arrive long after the work — track the two separately. Your bank account alone cannot tell you the full story." />
        <P>You earned <strong>$825</strong>.</P>
        <P>But you have only received <strong>$425</strong>.</P>
        <P>That means <strong>$400 is still outstanding</strong>.</P>
        <P>If you simply look at deposits in your bank account, it is surprisingly easy to lose that distinction—especially when payments arrive weeks after the work was completed.</P>
        <P>Your system should therefore track at least two separate numbers:</P>
        <P><strong>What I earned</strong></P>
        <P>and</P>
        <P><strong>What I&rsquo;ve received</strong></P>
        <P>Then:</P>
        <P><strong>Earned − Received = Outstanding</strong></P>
        <P>That simple calculation can prevent a missing payment from quietly disappearing into your work history.</P>

        <H2>Keep track of who is actually paying you</H2>
        <P>Gig work can involve more companies than you might expect.</P>
        <P>The company that found you the opportunity may not be the company that pays you.</P>
        <P>In entertainment, for example, you might interact with:</P>
        <p className="mt-3 rounded-lg bg-zinc-100 dark:bg-zinc-800/60 px-4 py-3 text-center text-sm font-semibold text-zinc-800 dark:text-zinc-200 overflow-x-auto">
          Casting company → Production → Payroll company
        </p>
        <P>In other types of gig work, the chain may look more like:</P>
        <p className="mt-3 rounded-lg bg-zinc-100 dark:bg-zinc-800/60 px-4 py-3 text-center text-sm font-semibold text-zinc-800 dark:text-zinc-200 overflow-x-auto">
          Agency → Client → Payment provider
        </p>
        <P>Record the relevant companies with the gig.</P>
        <P>Weeks later, when a deposit arrives under an unfamiliar business name, that connection can help you determine which job the payment belongs to.</P>

        <H2>Keep important documents with the gig</H2>
        <P>Gig work generates paperwork.</P>
        <P>Depending on the type of work, that might include:</P>
        <UL items={[
          "Contracts",
          "Vouchers",
          "Timecards",
          "Pay stubs",
          "Call sheets",
          "Deal memos",
          "Receipts",
          "Invoices",
          "Releases",
          "Booking confirmations",
          "Tax documents",
        ]} />
        <P>The problem isn&rsquo;t usually that people intentionally throw these things away.</P>
        <P>The problem is that they end up everywhere.</P>
        <P>One document is in email. Another is a screenshot. Another is in your downloads folder. Another is a photograph on your phone.</P>
        <P>Whenever possible, organize documents around the <strong>gig or project they belong to</strong>, rather than simply storing hundreds of unrelated files.</P>

        <H2>Don&rsquo;t rely on your bank account as your gig history</H2>
        <P>Your bank account tells you money arrived.</P>
        <P>It usually doesn&rsquo;t tell you enough about why.</P>
        <P>A $327.18 deposit several weeks after a job may not immediately tell you:</P>
        <UL items={[
          "Which gig generated it",
          "What your gross earnings were",
          "What deductions were taken",
          "Whether it was the full amount",
          "Whether other compensation is still outstanding",
        ]} />
        <P>Your financial accounts are important records, but they aren&rsquo;t a replacement for maintaining a history of the work itself.</P>

        <H2>Calendar, spreadsheet or gig-management system?</H2>
        <P>Any system is better than no system.</P>
        <H3>Calendar</H3>
        <P>A calendar works well for answering:</P>
        <P><strong>When am I working?</strong></P>
        <P>It is less useful for tracking rates, earnings, documents and payments.</P>
        <H3>Spreadsheet</H3>
        <P>A spreadsheet can be a good starting point.</P>
        <P>Create columns for the project, company, date, rate, hours, earnings, amount paid and payment status.</P>
        <P>The challenge comes as your gig history grows. Documents live somewhere else, schedules live somewhere else, and updating multiple pieces manually becomes cumbersome.</P>
        <H3>Gig-management platform</H3>
        <P>A dedicated gig-management system can connect the pieces:</P>
        <Figure src="/guides/keep-track-work-connected.png" w={1200} h={675}
          alt="Keep the work connected: opportunity, gig, schedule, hours, earnings, payment, documents and history — one gig, one connected history from opportunity through payment." />
        <P>That is particularly useful for people who work many short-term jobs rather than one traditional job with one employer.</P>

        <H2>Create a routine after every gig</H2>
        <P>The best tracking system is one you&rsquo;ll actually maintain.</P>
        <P>You don&rsquo;t need an elaborate bookkeeping session after every job.</P>
        <P>Before you consider a gig finished, take a minute to update:</P>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5">
          <li>Did I work the expected hours?</li>
          <li>Did anything change?</li>
          <li>What did I earn?</li>
          <li>Is there a document I should save?</li>
          <li>Am I now waiting on payment?</li>
        </ol>
        <P>Then update the gig again when the payment arrives.</P>
        <P>Those two small habits—<strong>update after working and update after getting paid</strong>—can keep your records surprisingly accurate.</P>

        <H2>Your gig history becomes more valuable over time</H2>
        <P>Tracking isn&rsquo;t only about preventing mistakes.</P>
        <P>Once you have a reliable history, you can start answering bigger questions:</P>
        <UL items={[
          "How much am I earning each month?",
          "How many days am I actually working?",
          "Which kinds of gigs pay me the most?",
          "Which companies do I work with most often?",
          "How much money is currently outstanding?",
          "How long does payment usually take?",
          "How has my work changed over the past year?",
        ]} />
        <P>A collection of individual gigs becomes a picture of your working life.</P>
        <P>And that&rsquo;s difficult to create after the fact if the underlying information was never recorded.</P>

        <H2>Keep your gig life in one place</H2>
        <P>Gig work is flexible by nature.</P>
        <P>Your records don&rsquo;t have to be scattered by nature.</P>
        <P>GigDock is built to help entertainment gig professionals keep opportunities, gigs, work dates, hours, earnings, payments, documents and history connected in one place.</P>
        <P>Instead of trying to reconstruct your work weeks or months later, you build the record as you go.</P>
        <P><strong>Your gig life. Simplified.</strong></P>
        <P>Want the film &amp; TV specifics? See <A href="/guides/how-to-track-background-acting-gigs-and-payments">how to track background acting gigs and payments</A> and <A href="/guides/how-to-track-film-tv-gig-income-expenses">how to track income and expenses from film &amp; TV gigs</A>.</P>

        <AppCta heading="Your gig life, simplified" ctaLabel="See how GigDock works">
          GigDock keeps opportunities, gigs, work dates, hours, earnings, payments, documents and history connected in one place — so you build the record as you go.
        </AppCta>

        <H2>Frequently asked questions</H2>
        <div className="mt-4 divide-y divide-zinc-200 dark:divide-zinc-800">
          {FAQ.map((f) => (
            <div key={f.q} className="py-4">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{f.q}</h3>
              <p className="mt-1.5 text-zinc-700 dark:text-zinc-300 leading-relaxed">{f.a}</p>
            </div>
          ))}
        </div>
      </article>
    </PublicShell>
  );
}
