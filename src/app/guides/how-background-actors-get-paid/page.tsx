import type { Metadata } from "next";
import Link from "next/link";
import PublicShell from "@/components/PublicShell";

const BASE = "https://www.gigdock.co";
const PATH = "/guides/how-background-actors-get-paid";
const TITLE = "How Do Background Actors Get Paid? Rates, Bumps & When the Check Comes";
const DESCRIPTION =
  "How background actors and extras get paid — the rate-and-guaranteed-hours model, bumps and adjustments, overtime and meal penalties, who cuts the check, when it arrives, and why your net pay differs from the advertised rate.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: { title: TITLE, description: DESCRIPTION, type: "article", siteName: "GigDock", url: `${BASE}${PATH}` },
};

// One source of truth for the on-page FAQ and the FAQPage schema.
const FAQ: { q: string; a: string }[] = [
  {
    q: "How much do background actors make per day?",
    a: "There isn’t one standard background-actor day rate. Non-union rates vary by market, production and booking, while SAG-AFTRA-covered work follows contractually established minimums. The advertised rate may also be supplemented by overtime and applicable bumps or adjustments.",
  },
  {
    q: "Do extras get paid the same day?",
    a: "Usually not. Payment is generally processed after the workday rather than handed to you on set. Timing varies considerably for non-union work, while SAG-AFTRA-covered TV/Theatrical work has specific payment deadlines under the applicable contract.",
  },
  {
    q: "What is a bump in background acting?",
    a: "A bump is additional compensation beyond your base rate for certain requirements or conditions associated with a job. Depending on the production or agreement, these might involve wardrobe, personal-vehicle use, wet work, smoke, props, or special hair or makeup. Not every situation automatically creates additional pay, so check the terms of your booking or applicable contract.",
  },
  {
    q: "Do you get paid more for union (SAG-AFTRA) background work?",
    a: "SAG-AFTRA-covered background work has negotiated minimum rates and contractual protections. Whether joining SAG-AFTRA makes financial sense for a particular performer involves more than comparing a single day rate, because union membership also affects what work members can accept.",
  },
  {
    q: "How long does it take to get paid as a background actor?",
    a: "There is no universal timeline for non-union work. For SAG-AFTRA-covered TV/Theatrical background work, the union specifies contractual payment timing and says performers who have not received initial payment after 10 business days may file a claim inquiry.",
  },
  {
    q: "Do background actors get paid for fittings?",
    a: "They can. SAG-AFTRA agreements include compensation provisions for covered background-actor costume fittings. Non-union fitting compensation depends on the particular booking, so always check the terms before assuming a fitting is paid or unpaid.",
  },
];

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-10 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{children}</h2>;
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 leading-relaxed">{children}</p>;
}

function Guide() {
  return (
    <article className="mx-auto max-w-2xl py-4 text-zinc-800 dark:text-zinc-200">
      <nav className="text-sm text-zinc-500 dark:text-zinc-400 mb-3" aria-label="Breadcrumb">
        <Link href="/guides" className="hover:text-zinc-800 dark:hover:text-zinc-200">Guides</Link>
        <span className="mx-1.5">›</span>
        <span className="text-zinc-700 dark:text-zinc-300">Getting paid</span>
      </nav>

      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 text-balance">
        How do background actors get paid?
      </h1>

      <p className="mt-4 text-lg text-zinc-700 dark:text-zinc-300 leading-relaxed">
        Background actors are typically booked at a stated rate covering a set number of hours — for example,{" "}
        <strong>$150/10</strong> — with additional pay potentially due for overtime, certain wardrobe or production
        requirements, and other adjustments often called <strong>bumps</strong>.
      </p>
      <P>
        After the shoot, the production or its payroll provider processes your pay using your time and payment records.
        Your final payment may be different from the advertised base rate because of overtime and bumps on the positive
        side — and taxes or other payroll deductions on the other.
      </P>
      <P>
        The key is knowing what you agreed to earn, what happened during the workday, and what ultimately showed up on
        your paycheck.
      </P>

      <H2>The basics: rate + guaranteed hours</H2>
      <P>Background jobs are commonly advertised using shorthand such as:</P>
      <p className="mt-3 text-center text-2xl font-bold text-zinc-900 dark:text-zinc-100">$150/10</p>
      <P>
        That generally means the booking guarantees <strong>$150 for up to 10 hours</strong> under the terms of that
        job. If the booking is structured as a guaranteed rate and you’re released early, you generally still receive the
        guarantee. If you work beyond the covered hours, additional compensation may apply. The exact overtime
        calculation depends on whether the job is union or non-union, the terms of the booking, the applicable agreement
        and other employment rules.
      </P>
      <P>That’s why you shouldn’t record only the advertised rate. You also want to know:</P>
      <ul className="mt-3 list-disc space-y-1.5 pl-5">
        <li>What was my <strong>call time</strong>?</li>
        <li>What was my <strong>wrap time</strong>?</li>
        <li>What <strong>adjustments</strong> applied?</li>
        <li>What <strong>should</strong> my total pay be?</li>
      </ul>
      <P>
        Those details become important weeks later when you’re trying to determine whether a payment is correct.
      </P>

      <H2>Non-union vs. union (SAG-AFTRA)</H2>
      <P>
        Non-union background rates vary considerably by production and market. Casting notices commonly list the rate and
        the number of hours included in the booking, such as $X/8, $X/10 or $X/12.
      </P>
      <P>
        SAG-AFTRA-covered background work follows negotiated contracts with established minimum rates and rules governing
        things such as overtime, meal periods, fittings and additional compensation. Because union rates and contract
        provisions change, performers should always check the current SAG-AFTRA agreement or rate sheet that applies to
        their production.
      </P>
      <P>
        Background work can also lead to SAG-AFTRA eligibility. SAG-AFTRA currently states that a performer can qualify
        through three days of covered background employment under a SAG-AFTRA collective bargaining agreement. Joining
        the union, however, is a career decision with additional rules and tradeoffs — not simply a shortcut to earning a
        higher day rate.
      </P>

      <H2>Bumps and adjustments: your base rate may not be everything you’re owed</H2>
      <P>Your advertised rate isn’t always the final amount you should receive.</P>
      <P>
        Productions may provide additional compensation when they require something beyond ordinary background work.
        These additions are commonly called <strong>bumps</strong> or <strong>adjustments</strong>. Depending on the
        production and applicable agreement, examples can include wardrobe requirements, use of your personal vehicle,
        wet work, smoke, props, special hair or makeup requirements and certain other conditions.
      </P>
      <P>
        SAG-AFTRA specifically advises covered background actors to check their vouchers at wrap and make sure applicable
        adjustments are included. If something is missing, the union recommends addressing it with the appropriate
        assistant director rather than simply assuming payroll will catch it later.
      </P>
      <P>
        The important principle is simple: <strong>don’t assume the advertised base rate is automatically everything
        you’re owed.</strong> Know what applied to your particular job and record it.
      </P>

      <H2>Overtime and meal penalties</H2>
      <P>
        Long background days are common, which makes your actual work time important. When you work beyond the hours
        covered by your booking, additional compensation may be due based on the applicable terms or contract.
        SAG-AFTRA-covered productions also have rules governing meal periods, including circumstances in which penalty
        payments can apply.
      </P>
      <P>
        That means two actors booked at the same base rate can ultimately receive different gross pay depending on how
        long they worked and what happened during their workday. Your call time and wrap time matter.
      </P>

      <H2>Who actually pays you?</H2>
      <P>
        This confuses many new background actors. The casting company may find you, communicate the booking and tell you
        where to report. But the casting office isn’t necessarily the company that ultimately processes your paycheck.
        The production is responsible for compensation and frequently works with an entertainment payroll provider to
        process performer payments. So one background job may involve several names:
      </P>
      <ul className="mt-3 list-disc space-y-1.5 pl-5">
        <li><strong>Production</strong> — the movie, television show or other project you worked on.</li>
        <li><strong>Casting company</strong> — the company that booked or coordinated the background talent.</li>
        <li><strong>Payroll provider</strong> — the company that may actually process and deliver your payment.</li>
      </ul>
      <P>Keeping track of all three can become surprisingly important if a payment is missing several weeks later.</P>

      <H2>Your voucher or timecard matters</H2>
      <P>
        On many productions, you’ll complete a paper or electronic voucher or timecard showing important details from
        your workday — your call and wrap times along with applicable adjustments. For covered SAG-AFTRA productions,
        electronic vouchers can serve as the equivalent of traditional paper vouchers.
      </P>
      <P>
        Whenever you’re permitted to do so, keep your own copy, photo or electronic record of the completed information.
        Weeks later, don’t rely on memory to reconstruct whether you worked 10 hours or 13, whether your car was used, or
        whether another adjustment was supposed to be included.
      </P>

      <H2>When does a background actor’s paycheck arrive?</H2>
      <P>
        The answer depends heavily on the production and whether the work is union or non-union. For SAG-AFTRA-covered
        TV/Theatrical background work, the union states that payment checks must be postmarked by the Thursday following
        the workweek, and that performers who have not received their initial payment after 10 business days may file a
        “no initial payment” claim inquiry. Non-union payment schedules can vary much more widely depending on the
        employer, payroll company and terms of the production.
      </P>
      <P>
        The practical lesson is more useful than memorizing a single number: <strong>record when you worked and track
        whether the payment ever arrived.</strong> If you’re working regularly, it’s surprisingly easy for one missing
        payment to disappear among dozens of gigs.
      </P>

      <H2>Why is my paycheck smaller than what I earned?</H2>
      <P>
        There’s an important difference between <strong>gross pay</strong> (what you earned before deductions) and{" "}
        <strong>net pay</strong> (what actually reaches you after deductions). If you’re working as an employee, payroll
        may withhold federal income tax, Social Security, Medicare and potentially other amounts from your wages.
        Independent-contractor treatment is different and generally does not involve the same payroll withholding.
      </P>
      <P>
        So don’t compare the money deposited into your bank account directly with your expected gross earnings and
        immediately assume something is missing. Instead compare:
      </P>
      <p className="mt-3 rounded-lg bg-zinc-100 dark:bg-zinc-800/60 px-4 py-3 text-center font-semibold text-zinc-800 dark:text-zinc-200">
        Expected gross → actual gross → deductions → net payment
      </p>

      <H2>How to make sure you’re paid correctly</H2>
      <P>
        Pay problems aren’t always dramatic. Sometimes it’s a car adjustment that wasn’t included. Sometimes the hours
        are wrong. Sometimes a payment never arrives. Sometimes the payment is correct, but you’ve forgotten the original
        rate by the time you receive it.
      </P>
      <P>
        For every background job, record the <strong>production, casting company, date worked, advertised rate,
        guaranteed hours, actual hours, applicable bumps or adjustments, expected gross pay and payment status.</strong>{" "}
        Then, when the payment arrives, compare the actual gross payment with what you expected. That simple habit makes
        it far easier to catch discrepancies while you still have the information necessary to investigate them.
      </P>

      <div className="mt-6 rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 p-6">
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Keep every gig and paycheck in one place</h3>
        <p className="mt-1.5 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
          Skip the spreadsheet. GigDock keeps every gig — rate, hours, bumps, gross and net pay, and what’s still
          unpaid — in one place, and gathers casting calls from across the web into one feed. Find your next gig and
          keep track of the last one.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/opportunities/atlanta-ga" className="px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm">Browse Atlanta casting calls</Link>
          <Link href="/opportunities" className="px-5 py-2.5 rounded-full border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800">Explore GigDock</Link>
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
        <li>
          IRS — <a href="https://www.irs.gov/businesses/small-businesses-self-employed/independent-contractor-self-employed-or-employee" target="_blank" rel="noopener noreferrer nofollow" className="text-blue-600 hover:underline dark:text-blue-400">Independent contractor (self-employed) or employee?</a> (withholding and worker classification).
        </li>
      </ul>

      <p className="mt-8 text-sm text-zinc-500 dark:text-zinc-400">
        This guide is general information for background actors and extras, not legal or tax advice. Rates, contract
        terms and rules vary by market, production and union agreement — always check the current terms that apply to
        your booking.
      </p>
    </article>
  );
}

export default function Page() {
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "How Do Background Actors Get Paid?",
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
